import { describe, it, expect } from 'vitest'
import { npcStep, footprintBlocked, footprintCovers } from './pathing'
import type { FootprintBlockedFn } from './pathing'

const open: FootprintBlockedFn = () => false

/** Blocks any footprint overlapping the 3x3 square anchored at (bx, by). */
function pillarBlock(bx: number, by: number): FootprintBlockedFn {
  return (sw, size) =>
    sw.x < bx + 3 && sw.x + size > bx && sw.y < by + 3 && sw.y + size > by
}

describe('npcStep', () => {
  it('steps diagonally towards the player when unobstructed', () => {
    expect(npcStep({ x: 0, y: 0 }, 1, { x: 5, y: 5 }, open)).toEqual({ x: 1, y: 1 })
    expect(npcStep({ x: 5, y: 5 }, 1, { x: 0, y: 0 }, open)).toEqual({ x: 4, y: 4 })
  })

  it('steps cardinally when only one axis differs', () => {
    expect(npcStep({ x: 0, y: 0 }, 1, { x: 5, y: 0 }, open)).toEqual({ x: 1, y: 0 })
    expect(npcStep({ x: 0, y: 5 }, 1, { x: 0, y: 0 }, open)).toEqual({ x: 0, y: 4 })
  })

  it('does not move when already on the player tile', () => {
    expect(npcStep({ x: 3, y: 3 }, 1, { x: 3, y: 3 }, open)).toEqual({ x: 3, y: 3 })
  })

  it('falls back to a horizontal step when the diagonal is blocked', () => {
    // Pillar at (4,4)-(6,6). NPC at (3,3) heading NE: diagonal (4,4) blocked,
    // horizontal (4,3) is fine.
    const blocked = pillarBlock(4, 4)
    expect(npcStep({ x: 3, y: 3 }, 1, { x: 8, y: 8 }, blocked)).toEqual({ x: 4, y: 3 })
  })

  it('falls back to a vertical step when diagonal and horizontal are blocked', () => {
    const blocked: FootprintBlockedFn = (sw) =>
      (sw.x === 4 && sw.y === 4) || (sw.x === 4 && sw.y === 3)
    expect(npcStep({ x: 3, y: 3 }, 1, { x: 8, y: 8 }, blocked)).toEqual({ x: 3, y: 4 })
  })

  it('gets stuck when all step options are blocked (safespot behaviour)', () => {
    const blocked: FootprintBlockedFn = (sw) => sw.x === 4 || sw.y === 4
    expect(npcStep({ x: 3, y: 3 }, 1, { x: 8, y: 8 }, blocked)).toEqual({ x: 3, y: 3 })
  })

  it('accounts for the whole footprint of a large NPC', () => {
    // A 3x3 NPC at (1,1) stepping east to (2,1) would overlap a pillar at
    // (4,1): its east column reaches x=4.
    const blocked = pillarBlock(4, 1)
    expect(npcStep({ x: 1, y: 1 }, 3, { x: 8, y: 1 }, blocked)).toEqual({ x: 1, y: 1 })
    // A 1x1 NPC on the same path can still advance.
    expect(npcStep({ x: 1, y: 1 }, 1, { x: 8, y: 1 }, blocked)).toEqual({ x: 2, y: 1 })
  })

  it('cancels the vertical component of a diagonal step onto the player', () => {
    // Corner-safespot rule: NPC at (2,2) stepping NE onto player at (3,3)
    // becomes a pure east step instead.
    expect(npcStep({ x: 2, y: 2 }, 1, { x: 3, y: 3 }, open)).toEqual({ x: 3, y: 2 })
    // Large NPC: 3x3 at (0,0) heading NE towards player at (3,3); the
    // diagonal step to (1,1) would cover (3,3), so it steps east only.
    expect(npcStep({ x: 0, y: 0 }, 3, { x: 3, y: 3 }, open)).toEqual({ x: 1, y: 0 })
  })
})

describe('footprintBlocked', () => {
  it('checks every tile of the footprint', () => {
    const blockedTile = (x: number, y: number) => x === 2 && y === 2
    expect(footprintBlocked({ x: 0, y: 0 }, 3, blockedTile)).toBe(true)
    expect(footprintBlocked({ x: 0, y: 0 }, 2, blockedTile)).toBe(false)
  })
})

describe('footprintCovers', () => {
  it('detects tiles inside and outside the footprint', () => {
    expect(footprintCovers({ x: 5, y: 5 }, 3, { x: 7, y: 7 })).toBe(true)
    expect(footprintCovers({ x: 5, y: 5 }, 3, { x: 8, y: 7 })).toBe(false)
    expect(footprintCovers({ x: 5, y: 5 }, 1, { x: 5, y: 5 })).toBe(true)
  })
})
