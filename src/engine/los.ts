import type { Point } from './types'

/**
 * OSRS line-of-sight algorithm.
 *
 * This is a faithful port of the sight-line check used by the game engine
 * (as documented by the OSRS community from the deobfuscated client and used
 * by tools such as the RuneLite Inferno plugin). The ray is traced with
 * 16.16 fixed-point arithmetic along the dominant axis, and sight is blocked
 * if any intermediate tile is a full blocker (an Inferno pillar).
 *
 * Note that the starting tile is not checked and the destination tile is
 * checked only via the loop terminating on it, matching in-game behaviour.
 */
export type BlockedFn = (x: number, y: number) => boolean

export function hasLineOfSight(from: Point, to: Point, blocked: BlockedFn): boolean {
  if (from.x === to.x && from.y === to.y) return true

  const dx = to.x - from.x
  const dy = to.y - from.y
  const dxAbs = Math.abs(dx)
  const dyAbs = Math.abs(dy)

  if (dxAbs > dyAbs) {
    let xTile = from.x
    let y = (from.y << 16) + 0x8000
    const slope = Math.trunc((dy << 16) / dxAbs)
    const xInc = dx > 0 ? 1 : -1
    if (dy < 0) {
      y -= 1 // makes rounding at 0.5 go towards the caster
    }
    while (xTile !== to.x) {
      xTile += xInc
      const yTile = y >>> 16
      if (blocked(xTile, yTile)) return false
      y += slope
    }
  } else {
    let yTile = from.y
    let x = (from.x << 16) + 0x8000
    const slope = Math.trunc((dx << 16) / dyAbs)
    const yInc = dy > 0 ? 1 : -1
    if (dx < 0) {
      x -= 1
    }
    while (yTile !== to.y) {
      yTile += yInc
      const xTile = x >>> 16
      if (blocked(xTile, yTile)) return false
      x += slope
    }
  }
  return true
}

/**
 * Line of sight from a large NPC to a player tile.
 *
 * A size x size NPC anchored at `sw` (south-west tile) can see the player if
 * any tile of its footprint has line of sight to the player's tile.
 */
export function npcHasLineOfSight(
  sw: Point,
  size: number,
  player: Point,
  blocked: BlockedFn,
): boolean {
  for (let ox = 0; ox < size; ox++) {
    for (let oy = 0; oy < size; oy++) {
      if (hasLineOfSight({ x: sw.x + ox, y: sw.y + oy }, player, blocked)) {
        return true
      }
    }
  }
  return false
}
