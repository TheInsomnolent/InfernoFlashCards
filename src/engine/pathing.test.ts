import { describe, it, expect } from 'vitest'
import { npcStep, footprintBlocked, npcDestination } from './pathing'
import type { FootprintBlockedFn } from './pathing'

const open: FootprintBlockedFn = () => false

/** Blocks any footprint overlapping the 3x3 square anchored at (bx, by). */
function pillarBlock(bx: number, by: number): FootprintBlockedFn {
  return (sw, size) =>
    sw.x < bx + 3 && sw.x + size > bx && sw.y < by + 3 && sw.y + size > by
}

describe('npcStep', () => {
  it('steps diagonally towards the target when unobstructed', () => {
    expect(npcStep({ x: 0, y: 0 }, 1, { x: 5, y: 5 }, open)).toEqual({ x: 1, y: 1 })
    expect(npcStep({ x: 5, y: 5 }, 1, { x: 0, y: 0 }, open)).toEqual({ x: 4, y: 4 })
  })

  it('steps cardinally when only one axis differs', () => {
    expect(npcStep({ x: 0, y: 0 }, 1, { x: 5, y: 0 }, open)).toEqual({ x: 1, y: 0 })
    expect(npcStep({ x: 0, y: 5 }, 1, { x: 0, y: 0 }, open)).toEqual({ x: 0, y: 4 })
  })

  it('does not move when already at the target', () => {
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
})

describe('footprintBlocked', () => {
  it('checks every tile of the footprint', () => {
    const blockedTile = (x: number, y: number) => x === 2 && y === 2
    expect(footprintBlocked({ x: 0, y: 0 }, 3, blockedTile)).toBe(true)
    expect(footprintBlocked({ x: 0, y: 0 }, 2, blockedTile)).toBe(false)
  })
})

describe('npcDestination', () => {
  it('centres the footprint on the player', () => {
    expect(npcDestination({ x: 10, y: 10 }, 1)).toEqual({ x: 10, y: 10 })
    expect(npcDestination({ x: 10, y: 10 }, 3)).toEqual({ x: 9, y: 9 })
    expect(npcDestination({ x: 10, y: 10 }, 4)).toEqual({ x: 8, y: 8 })
  })
})
