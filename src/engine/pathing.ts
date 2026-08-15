import type { Point } from './types'

/**
 * OSRS NPC movement ("dumb" pathing).
 *
 * NPCs do not use intelligent pathfinding towards players. Each tick an NPC
 * takes a single step directly towards its destination: it first attempts the
 * diagonal step, and if that is blocked it attempts the horizontal step and
 * then the vertical step. If all are blocked it does not move that tick.
 * This is why NPCs get stuck behind the Inferno pillars, which is the basis
 * of safespotting.
 *
 * Large NPCs must be able to fit their whole size x size footprint on the
 * destination tiles for a step to be valid. Inferno monsters do not collide
 * with each other, which is why multi-monster "stacks" form on the same tiles.
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

/**
 * Computes the single-tile step an NPC takes towards a target tile this tick.
 * Returns the new south-west position (which equals `from` if the NPC cannot
 * move).
 */
export function npcStep(
  from: Point,
  size: number,
  target: Point,
  blocked: FootprintBlockedFn,
): Point {
  const dx = Math.sign(target.x - from.x)
  const dy = Math.sign(target.y - from.y)
  if (dx === 0 && dy === 0) return from

  const tryMove = (mx: number, my: number): Point | null => {
    if (mx === 0 && my === 0) return null
    const next = { x: from.x + mx, y: from.y + my }
    return blocked(next, size) ? null : next
  }

  return tryMove(dx, dy) ?? tryMove(dx, 0) ?? tryMove(0, dy) ?? from
}

/**
 * The tile an NPC paths towards when targeting a player.
 *
 * NPCs path towards the tile that would place the player under the centre of
 * their footprint; in practice the engine targets the player's tile offset so
 * that the NPC's footprint moves to surround/reach the player. For a
 * size x size NPC targeting tile p, the destination south-west tile is
 * p - floor(size / 2) on each axis, clamped so movement stops once the player
 * is adjacent to the footprint (handled by the attack-range check upstream).
 */
export function npcDestination(player: Point, size: number): Point {
  const off = Math.floor(size / 2)
  return { x: player.x - off, y: player.y - off }
}
