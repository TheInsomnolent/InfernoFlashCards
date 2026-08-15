import { describe, it, expect } from 'vitest'
import { hasLineOfSight, npcHasLineOfSight } from './los'
import type { BlockedFn } from './los'

const open: BlockedFn = () => false

/** A single 3x3 blocker with south-west corner at (bx, by). */
function pillar(bx: number, by: number): BlockedFn {
  return (x, y) => x >= bx && x < bx + 3 && y >= by && y < by + 3
}

describe('hasLineOfSight', () => {
  it('always sees its own tile', () => {
    expect(hasLineOfSight({ x: 5, y: 5 }, { x: 5, y: 5 }, open)).toBe(true)
  })

  it('sees along open cardinal lines', () => {
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 10, y: 0 }, open)).toBe(true)
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 0, y: 10 }, open)).toBe(true)
  })

  it('sees along open diagonals', () => {
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 9, y: 9 }, open)).toBe(true)
    expect(hasLineOfSight({ x: 9, y: 0 }, { x: 0, y: 9 }, open)).toBe(true)
  })

  it('is blocked by a pillar directly between the tiles', () => {
    const blocked = pillar(4, 4)
    expect(hasLineOfSight({ x: 5, y: 0 }, { x: 5, y: 10 }, blocked)).toBe(false)
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 10, y: 5 }, blocked)).toBe(false)
  })

  it('is not blocked when the ray passes beside the pillar', () => {
    const blocked = pillar(4, 4)
    expect(hasLineOfSight({ x: 3, y: 0 }, { x: 3, y: 10 }, blocked)).toBe(true)
    expect(hasLineOfSight({ x: 7, y: 0 }, { x: 7, y: 10 }, blocked)).toBe(true)
  })

  it('is symmetric on cardinal lines', () => {
    const blocked = pillar(4, 4)
    expect(hasLineOfSight({ x: 5, y: 10 }, { x: 5, y: 0 }, blocked)).toBe(false)
    expect(hasLineOfSight({ x: 10, y: 5 }, { x: 0, y: 5 }, blocked)).toBe(false)
  })

  it('does not check the starting tile', () => {
    // The caster's own tile being "blocked" is irrelevant.
    const blocked: BlockedFn = (x, y) => x === 0 && y === 0
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 5, y: 0 }, blocked)).toBe(true)
  })

  it('handles corner-cutting rays around a pillar corner', () => {
    // A diagonal ray from SW of the pillar to NE must pass through it.
    const blocked = pillar(4, 4)
    expect(hasLineOfSight({ x: 3, y: 3 }, { x: 8, y: 8 }, blocked)).toBe(false)
    // An anti-diagonal ray across the NW corner clips the corner tile (4,6).
    expect(hasLineOfSight({ x: 3, y: 7 }, { x: 7, y: 3 }, blocked)).toBe(false)
    // A diagonal ray sliding just past the SW corner is fine: it only
    // traverses (1,5), (2,4), (3,3), (4,2) - none under the pillar.
    expect(hasLineOfSight({ x: 0, y: 6 }, { x: 5, y: 1 }, blocked)).toBe(true)
  })
})

describe('npcHasLineOfSight', () => {
  it('a large NPC can see around a pillar if any footprint tile can', () => {
    const blocked = pillar(4, 4)
    // 3x3 NPC hugging the west side of the pillar: its northern tiles can
    // see a player north-east of the pillar.
    expect(npcHasLineOfSight({ x: 1, y: 4 }, 3, { x: 5, y: 10 }, blocked)).toBe(true)
  })

  it('a large NPC fully eclipsed by a pillar cannot see the player', () => {
    const blocked = pillar(4, 4)
    // 3x3 NPC directly south of the pillar, player directly north.
    expect(npcHasLineOfSight({ x: 4, y: 1 }, 3, { x: 5, y: 9 }, blocked)).toBe(false)
  })
})
