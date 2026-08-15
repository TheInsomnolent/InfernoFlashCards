import { describe, it, expect } from 'vitest'
import {
  distanceFromFootprint,
  isUnderNpc,
  nearestFootprintTile,
  canMeleeAttack,
  canRangedAttack,
} from './combat'
import type { BlockedFn } from './los'

const open: BlockedFn = () => false

describe('distanceFromFootprint', () => {
  it('is zero underneath the NPC', () => {
    expect(distanceFromFootprint({ x: 5, y: 5 }, 3, { x: 6, y: 6 })).toBe(0)
  })

  it('measures from the nearest edge, not the south-west tile', () => {
    // 4x4 NPC at (0,0) occupies (0,0)-(3,3). Player at (8,0) is 5 tiles from
    // the east edge (x=3), not 8 from the SW tile.
    expect(distanceFromFootprint({ x: 0, y: 0 }, 4, { x: 8, y: 0 })).toBe(5)
  })

  it('uses chebyshev distance for diagonals', () => {
    expect(distanceFromFootprint({ x: 0, y: 0 }, 2, { x: 5, y: 4 })).toBe(4)
  })
})

describe('isUnderNpc / nearestFootprintTile', () => {
  it('detects tiles under the footprint', () => {
    expect(isUnderNpc({ x: 5, y: 5 }, 3, { x: 7, y: 7 })).toBe(true)
    expect(isUnderNpc({ x: 5, y: 5 }, 3, { x: 8, y: 7 })).toBe(false)
  })

  it('clamps to the footprint edge', () => {
    expect(nearestFootprintTile({ x: 5, y: 5 }, 3, { x: 10, y: 0 })).toEqual({
      x: 7,
      y: 5,
    })
  })
})

describe('canMeleeAttack', () => {
  const sw = { x: 5, y: 5 }
  const size = 4 // meleer-sized

  it('can attack a player cardinally adjacent to any edge tile', () => {
    expect(canMeleeAttack(sw, size, { x: 4, y: 6 })).toBe(true) // west
    expect(canMeleeAttack(sw, size, { x: 9, y: 8 })).toBe(true) // east
    expect(canMeleeAttack(sw, size, { x: 6, y: 4 })).toBe(true) // south
    expect(canMeleeAttack(sw, size, { x: 7, y: 9 })).toBe(true) // north
  })

  it('cannot attack diagonally past the footprint corner', () => {
    expect(canMeleeAttack(sw, size, { x: 4, y: 4 })).toBe(false)
    expect(canMeleeAttack(sw, size, { x: 9, y: 9 })).toBe(false)
    expect(canMeleeAttack(sw, size, { x: 4, y: 9 })).toBe(false)
    expect(canMeleeAttack(sw, size, { x: 9, y: 4 })).toBe(false)
  })

  it('cannot attack a player underneath it or 2+ tiles away', () => {
    expect(canMeleeAttack(sw, size, { x: 6, y: 6 })).toBe(false)
    expect(canMeleeAttack(sw, size, { x: 3, y: 6 })).toBe(false)
  })
})

describe('canRangedAttack', () => {
  const sw = { x: 0, y: 0 }

  it('can attack within range with line of sight', () => {
    expect(canRangedAttack(sw, 3, 15, { x: 17, y: 0 }, open)).toBe(true)
  })

  it('cannot attack beyond its range from the footprint edge', () => {
    // 3x3 NPC: east edge at x=2, so x=18 is 16 tiles away with range 15.
    expect(canRangedAttack(sw, 3, 15, { x: 18, y: 0 }, open)).toBe(false)
  })

  it('cannot attack without line of sight', () => {
    const pillar: BlockedFn = (x, y) => x >= 5 && x < 8 && y >= 0 && y < 3
    expect(canRangedAttack({ x: 0, y: 0 }, 3, 15, { x: 10, y: 1 }, pillar)).toBe(false)
  })

  it('cannot attack a player underneath it', () => {
    expect(canRangedAttack(sw, 3, 15, { x: 1, y: 1 }, open)).toBe(false)
  })
})
