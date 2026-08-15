import type { Monster, Point } from './types'
import { AttackStyle, MonsterType, Prayer } from './types'
import { MONSTERS, COUNTER_PRAYER } from './monsters'
import { canAttack, distanceFromFootprint, nearestFootprintTile, isUnderNpc } from './combat'
import { hasLineOfSight } from './los'
import type { ArenaConfig } from './simulation'

/**
 * Flash-card answer solver.
 *
 * Given the final stacked positions of a wave's monsters and the player's
 * safespot behind the north pillar, this module works out:
 * - which tiles are safe to hide on (no monster can attack them),
 * - which tiles are valid step-out tiles for attacking the kill target,
 * - which protection prayer must be active when stepping out.
 */

/** Attack range of the Bow of Faerdhinen (crystal bow class weapons). */
export const BOWFA_RANGE = 10

/** Standard Inferno kill priority: mager > ranger > meleer > blob > bat. */
export const KILL_PRIORITY: readonly MonsterType[] = [
  MonsterType.Mager,
  MonsterType.Ranger,
  MonsterType.Meleer,
  MonsterType.Blob,
  MonsterType.Bat,
]

/** The monster the player should kill first from the current stack. */
export function killTarget(monsters: readonly Monster[]): Monster | null {
  for (const type of KILL_PRIORITY) {
    const found = monsters.find((m) => m.type === type)
    if (found) return found
  }
  return null
}

/** All monsters sorted into kill-priority order. */
export function killPriorityOrder(monsters: readonly Monster[]): Monster[] {
  return [...monsters].sort(
    (a, b) => KILL_PRIORITY.indexOf(a.type) - KILL_PRIORITY.indexOf(b.type),
  )
}

export interface Threat {
  monster: Monster
  /** Style of the attack that can hit the player on the inspected tile. */
  style: AttackStyle
}

/**
 * All monsters able to attack a player standing on `tile`. The blob's style
 * is reported as its own entry but callers treat blobs separately: a blob
 * reads the player's prayer 3 ticks before attacking, so its incoming style
 * always counters whatever was prayed on the scan tick.
 */
export function threatsAt(
  monsters: readonly Monster[],
  tile: Point,
  arena: ArenaConfig,
): Threat[] {
  const threats: Threat[] = []
  for (const monster of monsters) {
    const def = MONSTERS[monster.type]
    if (canAttack(monster.position, def.size, def.style, def.attackRange, tile, arena.blocked)) {
      threats.push({ monster, style: def.style })
    }
  }
  return threats
}

/** Whether a player tile is walkable (in bounds, not a pillar, not under an NPC). */
export function isStandable(
  tile: Point,
  monsters: readonly Monster[],
  arena: ArenaConfig,
): boolean {
  if (arena.blocked(tile.x, tile.y)) return false
  return !monsters.some((m) => isUnderNpc(m.position, MONSTERS[m.type].size, tile))
}

/**
 * Tiles within `radius` (chebyshev) of `around` on which no monster can
 * attack the player: the candidate hiding spots behind the pillar.
 */
export function safeTiles(
  monsters: readonly Monster[],
  arena: ArenaConfig,
  around: Point,
  radius: number,
): Point[] {
  const tiles: Point[] = []
  for (let x = around.x - radius; x <= around.x + radius; x++) {
    for (let y = around.y - radius; y <= around.y + radius; y++) {
      const tile = { x, y }
      if (!isStandable(tile, monsters, arena)) continue
      if (threatsAt(monsters, tile, arena).length === 0) tiles.push(tile)
    }
  }
  return tiles
}

/**
 * Whether the player standing on `tile` can attack a monster with a bowfa:
 * within range of the monster's footprint edge, with line of sight traced
 * from the player's tile to the nearest footprint tile.
 */
export function playerCanAttack(tile: Point, monster: Monster, arena: ArenaConfig): boolean {
  const def = MONSTERS[monster.type]
  if (isUnderNpc(monster.position, def.size, tile)) return false
  if (distanceFromFootprint(monster.position, def.size, tile) > BOWFA_RANGE) return false
  return hasLineOfSight(tile, nearestFootprintTile(monster.position, def.size, tile), arena.blocked)
}

export interface StepOutAnalysis {
  tile: Point
  /** Non-blob monsters that can attack the player on this tile. */
  threats: Threat[]
  /** Blobs that can attack the player on this tile (handled by flicking). */
  blobs: Threat[]
  /** Whether the player can hit the kill target from here. */
  canAttackTarget: boolean
  /** Whether one protection prayer covers every non-blob threat. */
  prayable: boolean
  /** The prayer to have active when stepping out here. */
  prayer: Prayer
}

/**
 * Analyses one candidate step-out tile.
 *
 * The correct prayer is the counter to the most dangerous non-blob monster
 * that gains line of sight (all ranged/magic monsters attack as soon as the
 * player appears, so danger is ranked by max hit: mager > ranger > bat).
 * Blobs never dictate the step-out prayer because they read it on their scan
 * tick and attack with the opposite style 3 ticks later - the player flicks
 * to answer them afterwards.
 */
export function analyseStepOut(
  monsters: readonly Monster[],
  tile: Point,
  target: Monster | null,
  arena: ArenaConfig,
): StepOutAnalysis {
  const all = threatsAt(monsters, tile, arena)
  const blobs = all.filter((t) => t.monster.type === MonsterType.Blob)
  const threats = all.filter((t) => t.monster.type !== MonsterType.Blob)

  const styles = new Set(threats.map((t) => t.style))
  const prayable = styles.size <= 1

  let prayer: Prayer = Prayer.None
  if (threats.length > 0) {
    const mostDangerous = threats.reduce((a, b) =>
      MONSTERS[b.monster.type].maxHit > MONSTERS[a.monster.type].maxHit ? b : a,
    )
    prayer = COUNTER_PRAYER[mostDangerous.monster.type]
  } else if (blobs.length > 0) {
    // Only blobs: any overhead works for the scan; convention is to step out
    // praying magic, then flick to the style the blob throws.
    prayer = Prayer.ProtectMagic
  }

  return {
    tile,
    threats,
    blobs,
    canAttackTarget: target !== null && playerCanAttack(tile, target, arena),
    prayable,
    prayer,
  }
}

/**
 * All valid step-out tiles within `radius` of the safespot: tiles the player
 * can stand on, hit the kill target from, and survive on by using a single
 * protection prayer (plus blob flicks).
 */
export function validStepOutTiles(
  monsters: readonly Monster[],
  target: Monster,
  arena: ArenaConfig,
  around: Point,
  radius: number,
): StepOutAnalysis[] {
  const results: StepOutAnalysis[] = []
  for (let x = around.x - radius; x <= around.x + radius; x++) {
    for (let y = around.y - radius; y <= around.y + radius; y++) {
      const tile = { x, y }
      if (!isStandable(tile, monsters, arena)) continue
      const analysis = analyseStepOut(monsters, tile, target, arena)
      if (analysis.canAttackTarget && analysis.prayable) results.push(analysis)
    }
  }
  return results
}
