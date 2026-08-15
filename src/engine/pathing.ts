import type { Point } from './types'

/**
 * OSRS NPC movement ("dumb" pathing).
 *
 * NPCs do not use intelligent pathfinding towards players. Each tick an NPC
 * takes a single step directly towards its target: it first attempts the
 * diagonal step, and if that is blocked it attempts the horizontal step and
 * then the vertical step. If all are blocked it does not move that tick.
 * This is why NPCs get stuck behind the Inferno pillars, which is the basis
 * of safespotting.
 *
 * Large NPCs must be able to fit their whole size x size footprint on the
 * destination tiles for a step to be valid. Inferno monsters do not collide
 * with each other, which is why multi-monster "stacks" form on the same
 * tiles, but they cannot end a step on top of the player.
 *
 * An NPC paths its south-west anchor tile directly towards the target's
 * tile (sign of the delta on each axis). One special case: if the diagonal
 * step would place the NPC's footprint on top of the player, the vertical
 * component is cancelled first - this is the mechanic that makes corner
 * safespotting possible.
 */
export type FootprintBlockedFn = (sw: Point, size: number) => boolean

/** Whether any tile of a size x size footprint anchored at sw is blocked. */
export function footprintBlocked(
  sw: Point,
  size: number,
  blockedTile: (x: number, y: number) => boolean,
): boolean {
  for (let ox = 0; ox < size; ox++) {
    for (let oy = 0; oy < size; oy++) {
      if (blockedTile(sw.x + ox, sw.y + oy)) return true
    }
  }
  return false
}

/** Whether a size x size footprint anchored at sw covers the given tile. */
export function footprintCovers(sw: Point, size: number, tile: Point): boolean {
  return (
    tile.x >= sw.x && tile.x < sw.x + size && tile.y >= sw.y && tile.y < sw.y + size
  )
}

/**
 * Computes the single-tile step an NPC takes towards the player this tick.
 * Returns the new south-west position (which equals `from` if the NPC cannot
 * move).
 */
export function npcStep(
  from: Point,
  size: number,
  player: Point,
  blocked: FootprintBlockedFn,
): Point {
  const dx = Math.sign(player.x - from.x)
  let dy = Math.sign(player.y - from.y)
  if (dx === 0 && dy === 0) return from

  // Corner-safespot rule: a diagonal step that would land the footprint on
  // the player cancels its vertical component.
  if (
    dx !== 0 &&
    dy !== 0 &&
    footprintCovers({ x: from.x + dx, y: from.y + dy }, size, player)
  ) {
    dy = 0
  }

  const tryMove = (mx: number, my: number): Point | null => {
    if (mx === 0 && my === 0) return null
    const next = { x: from.x + mx, y: from.y + my }
    return blocked(next, size) ? null : next
  }

  return tryMove(dx, dy) ?? tryMove(dx, 0) ?? tryMove(0, dy) ?? from
}
