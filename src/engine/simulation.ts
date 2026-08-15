import type { Monster, Point } from './types'
import { MonsterType, pointsEqual } from './types'
import type { BlockedFn } from './los'
import { MONSTERS } from './monsters'
import { footprintBlocked, footprintCovers, npcStep } from './pathing'
import { canAttack } from './combat'

/**
 * Wave simulation: monsters spawn, then every tick each one paths towards
 * the player using OSRS "dumb" NPC pathing until it can attack (in range
 * with line of sight, cardinal adjacency for melee) or is stuck behind a
 * pillar. Inferno monsters do not collide with one another, which is why
 * several monsters can end up stacked on the same tiles behind a pillar.
 */

export interface ArenaConfig {
  width: number
  height: number
  /** South-west corners of the 3x3 pillars. */
  pillars: readonly Point[]
  /** Whether a single tile blocks movement / line of sight. */
  blocked: BlockedFn
}

export interface SimulationResult {
  /** Monsters with their final (stable) positions. */
  monsters: Monster[]
  /** Monsters able to attack the player in the safespot, by monster id. */
  attackers: number[]
  /** Number of ticks until every monster stopped moving. */
  ticks: number
}

const MAX_TICKS = 512

/** Movement+LOS blocking for an NPC footprint within the arena. */
export function makeFootprintBlocked(arena: ArenaConfig) {
  return (sw: Point, size: number): boolean => {
    if (sw.x < 0 || sw.y < 0 || sw.x + size > arena.width || sw.y + size > arena.height) {
      return true
    }
    return footprintBlocked(sw, size, arena.blocked)
  }
}

/**
 * Runs the wave until all monsters are stationary: each is either able to
 * attack the player or permanently stuck. Returns final stack positions.
 */
export function simulateWave(
  spawned: readonly Monster[],
  player: Point,
  arena: ArenaConfig,
): SimulationResult {
  const arenaBlocked = makeFootprintBlocked(arena)
  // NPCs cannot end a step with their footprint on top of the player.
  const blockedFootprint = (sw: Point, size: number): boolean =>
    arenaBlocked(sw, size) || footprintCovers(sw, size, player)
  const monsters: Monster[] = spawned.map((m) => ({ ...m, position: { ...m.position } }))
  let ticks = 0

  for (; ticks < MAX_TICKS; ticks++) {
    let anyMoved = false
    for (const monster of monsters) {
      const def = MONSTERS[monster.type]
      if (
        canAttack(monster.position, def.size, def.style, def.attackRange, player, arena.blocked)
      ) {
        continue // in position to attack; stops moving
      }
      const next = npcStep(monster.position, def.size, player, blockedFootprint)
      if (!pointsEqual(next, monster.position)) {
        monster.position = next
        anyMoved = true
      }
    }
    if (!anyMoved) break
  }

  const attackers = monsters
    .filter((m) => {
      const def = MONSTERS[m.type]
      return canAttack(m.position, def.size, def.style, def.attackRange, player, arena.blocked)
    })
    .map((m) => m.id)

  return { monsters, attackers, ticks }
}

/** Creates monster instances on shuffled spawn points, game priority order. */
export function placeMonsters(
  types: readonly MonsterType[],
  spawnPoints: readonly Point[],
  shuffle: <T>(items: readonly T[]) => T[],
): Monster[] {
  if (types.length > spawnPoints.length) {
    throw new RangeError('More monsters than spawn points')
  }
  const points = shuffle(spawnPoints)
  return types.map((type, i) => ({ id: i, type, position: { ...points[i] } }))
}
