import { describe, it, expect } from 'vitest'
import {
  ARENA,
  PILLARS,
  PILLAR_SIZE,
  PLAYABLE,
  PLAYER_SPAWN,
  SPAWN_POINTS,
  isBlocked,
  isPillarTile,
} from './arena'

describe('arena layout', () => {
  it('has exactly three 3x3 pillars', () => {
    expect(PILLARS).toHaveLength(3)
    expect(PILLAR_SIZE).toBe(3)
  })

  it('every pillar tile is fully inside the playable area', () => {
    for (const p of PILLARS) {
      expect(p.x).toBeGreaterThanOrEqual(PLAYABLE.minX)
      expect(p.x + PILLAR_SIZE - 1).toBeLessThanOrEqual(PLAYABLE.maxX)
      expect(p.y).toBeGreaterThanOrEqual(PLAYABLE.minY)
      expect(p.y + PILLAR_SIZE - 1).toBeLessThanOrEqual(PLAYABLE.maxY)
    }
  })

  it('the playable combat area is 29 x 30 tiles', () => {
    expect(PLAYABLE.maxX - PLAYABLE.minX + 1).toBe(29)
    expect(PLAYABLE.maxY - PLAYABLE.minY + 1).toBe(30)
  })

  it('the player safespot is behind (north of) the north pillar', () => {
    const north = PILLARS.reduce((a, b) => (b.y > a.y ? b : a))
    expect(PLAYER_SPAWN.y).toBeGreaterThan(north.y + PILLAR_SIZE - 1)
    // Horizontally aligned with the pillar so it blocks southern sight lines.
    expect(PLAYER_SPAWN.x).toBeGreaterThanOrEqual(north.x)
    expect(PLAYER_SPAWN.x).toBeLessThanOrEqual(north.x + PILLAR_SIZE - 1)
    expect(isBlocked(PLAYER_SPAWN.x, PLAYER_SPAWN.y)).toBe(false)
  })

  it('has nine spawn points, all walkable and in bounds', () => {
    expect(SPAWN_POINTS).toHaveLength(9)
    for (const s of SPAWN_POINTS) {
      expect(isBlocked(s.x, s.y)).toBe(false)
    }
  })

  it('spawn points can host the largest (4x4) monsters without clipping', () => {
    for (const s of SPAWN_POINTS) {
      for (let ox = 0; ox < 4; ox++) {
        for (let oy = 0; oy < 4; oy++) {
          expect(isBlocked(s.x + ox, s.y + oy)).toBe(false)
        }
      }
    }
  })

  it('blocks tiles outside the playable area and on pillars', () => {
    expect(isBlocked(PLAYABLE.minX - 1, 20)).toBe(true)
    expect(isBlocked(PLAYABLE.maxX + 1, 20)).toBe(true)
    expect(isBlocked(20, PLAYABLE.minY - 1)).toBe(true)
    expect(isBlocked(20, PLAYABLE.maxY + 1)).toBe(true)
    for (const p of PILLARS) {
      expect(isPillarTile(p.x, p.y)).toBe(true)
      expect(isPillarTile(p.x + 2, p.y + 2)).toBe(true)
      expect(isPillarTile(p.x + 3, p.y)).toBe(false)
    }
  })

  it('exposes a consistent ArenaConfig', () => {
    expect(ARENA.pillars).toBe(PILLARS)
    expect(ARENA.blocked(PILLARS[0].x, PILLARS[0].y)).toBe(true)
  })
})
