/**
 * Core shared types for the Inferno simulation engine.
 *
 * Coordinate system: the arena is a grid of tiles. x increases to the east,
 * y increases to the north. A tile position refers to a single tile; a
 * monster's position refers to its south-west tile (as in OSRS, where a
 * large NPC occupies a size x size square anchored on its south-west tile).
 */

export interface Point {
  x: number
  y: number
}

export const enum MonsterType {
  Bat = 'bat', // Jal-MejRah
  Blob = 'blob', // Jal-Ak
  Meleer = 'meleer', // Jal-ImKot
  Ranger = 'ranger', // Jal-Xil
  Mager = 'mager', // Jal-Zek
}

export const enum AttackStyle {
  Melee = 'melee',
  Ranged = 'ranged',
  Magic = 'magic',
}

export const enum Prayer {
  None = 'none',
  ProtectMelee = 'protect-melee',
  ProtectRanged = 'protect-ranged',
  ProtectMagic = 'protect-magic',
}

/** Static combat definition for a monster type. */
export interface MonsterDefinition {
  type: MonsterType
  name: string
  /** Side length of the NPC's square footprint, in tiles. */
  size: number
  /** Attack range in tiles, measured from the edge of the footprint. */
  attackRange: number
  /** Attack cooldown in game ticks. */
  attackSpeed: number
  /** Primary attack style used at range. */
  style: AttackStyle
  /** Max hit of the primary attack. */
  maxHit: number
}

/** A monster instance placed in the arena. */
export interface Monster {
  id: number
  type: MonsterType
  /** South-west tile of the monster's footprint. */
  position: Point
}

export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

export function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}
