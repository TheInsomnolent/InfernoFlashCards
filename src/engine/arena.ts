import type { Point } from './types'
import type { ArenaConfig } from './simulation'

/**
 * The Inferno arena.
 *
 * Coordinates use x increasing east and y increasing north, with the map
 * derived from the community-verified layout (OSRS Wiki Inferno/Strategies
 * map, cross-checked against the open-source InfernoTrainer simulator,
 * converted from its canvas-style y-down coordinates).
 *
 * The playable combat area is 29 x 30 tiles: x in [11, 39], y in [13, 42].
 * Three 3x3 pillars stand inside it. The player's standard wave-start
 * safespot is behind (north of) the north pillar.
 */

export const ARENA_WIDTH = 51
export const ARENA_HEIGHT = 57

/** Inclusive bounds of the walkable combat area. */
export const PLAYABLE = { minX: 11, maxX: 39, minY: 13, maxY: 42 } as const

/** South-west corners of the three 3x3 pillars. */
export const PILLARS: readonly Point[] = [
  { x: 28, y: 35 }, // north pillar (tiles x 28-30, y 35-37)
  { x: 11, y: 33 }, // west pillar (tiles x 11-13, y 33-35)
  { x: 21, y: 19 }, // south pillar (tiles x 21-23, y 19-21)
]

export const PILLAR_SIZE = 3

/** The standard player safespot tile behind the north pillar at wave start. */
export const PLAYER_SPAWN: Point = { x: 28, y: 39 }

/**
 * The nine fixed monster spawn locations (south-west anchor tiles). Each
 * wave shuffles these and assigns them to monsters in priority order:
 * mager, ranger, meleer, blob, bat.
 */
export const SPAWN_POINTS: readonly Point[] = [
  { x: 12, y: 37 },
  { x: 33, y: 37 },
  { x: 14, y: 31 },
  { x: 34, y: 30 },
  { x: 27, y: 25 },
  { x: 16, y: 19 },
  { x: 34, y: 17 },
  { x: 12, y: 14 },
  { x: 26, y: 14 },
]

export function isPillarTile(x: number, y: number): boolean {
  return PILLARS.some(
    (p) => x >= p.x && x < p.x + PILLAR_SIZE && y >= p.y && y < p.y + PILLAR_SIZE,
  )
}

export function isOutOfBounds(x: number, y: number): boolean {
  return x < PLAYABLE.minX || x > PLAYABLE.maxX || y < PLAYABLE.minY || y > PLAYABLE.maxY
}

/** Whether a tile blocks movement and line of sight. */
export function isBlocked(x: number, y: number): boolean {
  return isOutOfBounds(x, y) || isPillarTile(x, y)
}

export const ARENA: ArenaConfig = {
  width: ARENA_WIDTH,
  height: ARENA_HEIGHT,
  pillars: PILLARS,
  blocked: isBlocked,
}
