import type { Point } from './types'
import { AttackStyle } from './types'
import type { BlockedFn } from './los'
import { hasLineOfSight } from './los'

/**
 * Attack eligibility rules for OSRS NPCs.
 *
 * - Distances are measured from the nearest edge of the NPC's footprint to
 *   the player's tile (so a large NPC's reach extends from its border).
 * - Melee NPCs can only attack targets that are cardinally adjacent to their
 *   footprint: melee attacks can never be delivered diagonally.
 * - Ranged/magic NPCs additionally require line of sight from the footprint
 *   tile nearest to the player.
 */

/** Distance from the edge of a size x size footprint at sw to a tile. */
export function distanceFromFootprint(sw: Point, size: number, tile: Point): number {
  const dx = axisDistance(sw.x, size, tile.x)
  const dy = axisDistance(sw.y, size, tile.y)
  return Math.max(dx, dy)
}

function axisDistance(start: number, size: number, v: number): number {
  if (v < start) return start - v
  if (v > start + size - 1) return v - (start + size - 1)
  return 0
}

/** Whether a tile is under the NPC's footprint. */
export function isUnderNpc(sw: Point, size: number, tile: Point): boolean {
  return (
    tile.x >= sw.x && tile.x < sw.x + size && tile.y >= sw.y && tile.y < sw.y + size
  )
}

/** The footprint tile of the NPC closest to the given tile. */
export function nearestFootprintTile(sw: Point, size: number, tile: Point): Point {
  return {
    x: Math.min(Math.max(tile.x, sw.x), sw.x + size - 1),
    y: Math.min(Math.max(tile.y, sw.y), sw.y + size - 1),
  }
}

/**
 * Whether a melee NPC in this position can attack the player.
 * Requires cardinal adjacency to the footprint (no diagonals, not underneath).
 */
export function canMeleeAttack(sw: Point, size: number, player: Point): boolean {
  if (isUnderNpc(sw, size, player)) return false
  const inXBand = player.x >= sw.x && player.x < sw.x + size
  const inYBand = player.y >= sw.y && player.y < sw.y + size
  if (inXBand) {
    return player.y === sw.y - 1 || player.y === sw.y + size
  }
  if (inYBand) {
    return player.x === sw.x - 1 || player.x === sw.x + size
  }
  return false
}

/**
 * Whether a ranged/magic NPC can attack the player: within attack range of
 * the footprint edge, not underneath it, and with line of sight. As in the
 * game engine, the sight line for an NPC is traced from the player's tile to
 * the footprint tile of the NPC closest to the player.
 */
export function canRangedAttack(
  sw: Point,
  size: number,
  range: number,
  player: Point,
  blocked: BlockedFn,
): boolean {
  if (isUnderNpc(sw, size, player)) return false
  if (distanceFromFootprint(sw, size, player) > range) return false
  return hasLineOfSight(player, nearestFootprintTile(sw, size, player), blocked)
}

/** Generic attack check for any style. */
export function canAttack(
  sw: Point,
  size: number,
  style: AttackStyle,
  range: number,
  player: Point,
  blocked: BlockedFn,
): boolean {
  if (style === AttackStyle.Melee) return canMeleeAttack(sw, size, player)
  return canRangedAttack(sw, size, range, player, blocked)
}
