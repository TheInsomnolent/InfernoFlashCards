import { describe, it, expect } from 'vitest'
import {
  BOWFA_RANGE,
  KILL_PRIORITY,
  killTarget,
  killPriorityOrder,
  threatsAt,
  safeTiles,
  isStandable,
  playerCanAttack,
  analyseStepOut,
  validStepOutTiles,
} from './solver'
import { ARENA, PLAYER_SPAWN } from './arena'
import { MonsterType, AttackStyle, Prayer } from './types'
import type { Monster } from './types'

function monster(id: number, type: MonsterType, x: number, y: number): Monster {
  return { id, type, position: { x, y } }
}

// A mager stuck south of the north pillar (no line of sight to the safespot)
const stuckMager = monster(0, MonsterType.Mager, 28, 31)
// A ranger east of the pillar with a clear line to the safespot
const openRanger = monster(1, MonsterType.Ranger, 33, 37)
// A meleer stuck south of the pillar
const stuckMeleer = monster(2, MonsterType.Meleer, 28, 31)

describe('kill priority', () => {
  it('is mager > ranger > meleer > blob > bat', () => {
    expect(KILL_PRIORITY).toEqual([
      MonsterType.Mager,
      MonsterType.Ranger,
      MonsterType.Meleer,
      MonsterType.Blob,
      MonsterType.Bat,
    ])
  })

  it('selects the highest-priority monster present', () => {
    expect(killTarget([stuckMeleer, openRanger])?.type).toBe(MonsterType.Ranger)
    expect(killTarget([stuckMeleer])?.type).toBe(MonsterType.Meleer)
    expect(killTarget([])).toBeNull()
  })

  it('orders a full stack by priority', () => {
    const order = killPriorityOrder([stuckMeleer, openRanger, stuckMager])
    expect(order.map((m) => m.type)).toEqual([
      MonsterType.Mager,
      MonsterType.Ranger,
      MonsterType.Meleer,
    ])
  })
})

describe('threatsAt', () => {
  it('reports a ranger with line of sight as a threat', () => {
    const threats = threatsAt([openRanger], PLAYER_SPAWN, ARENA)
    expect(threats).toHaveLength(1)
    expect(threats[0].style).toBe(AttackStyle.Ranged)
  })

  it('does not report a mager hidden behind the pillar', () => {
    expect(threatsAt([stuckMager], PLAYER_SPAWN, ARENA)).toHaveLength(0)
  })

  it('does not report a meleer that is not adjacent', () => {
    expect(threatsAt([stuckMeleer], PLAYER_SPAWN, ARENA)).toHaveLength(0)
  })

  it('reports a meleer cardinally adjacent to the player', () => {
    // Meleer footprint (27,35)-(30,38); player at (28,39) is 1 north.
    const adjacent = monster(3, MonsterType.Meleer, 27, 35)
    const threats = threatsAt([adjacent], { x: 28, y: 39 }, ARENA)
    expect(threats).toHaveLength(1)
    expect(threats[0].style).toBe(AttackStyle.Melee)
  })
})

describe('isStandable / safeTiles', () => {
  it('rejects pillar tiles and tiles under monsters', () => {
    expect(isStandable({ x: 28, y: 35 }, [], ARENA)).toBe(false) // pillar
    expect(isStandable({ x: 29, y: 32 }, [stuckMager], ARENA)).toBe(false) // under mager
    expect(isStandable(PLAYER_SPAWN, [stuckMager], ARENA)).toBe(true)
  })

  it('the safespot is safe from a stuck mager but not from an open ranger', () => {
    const vsMager = safeTiles([stuckMager], ARENA, PLAYER_SPAWN, 2)
    expect(vsMager).toContainEqual(PLAYER_SPAWN)
    const vsRanger = safeTiles([openRanger], ARENA, PLAYER_SPAWN, 2)
    expect(vsRanger).not.toContainEqual(PLAYER_SPAWN)
  })
})

describe('playerCanAttack (bowfa)', () => {
  it('has a 10-tile attack range', () => {
    expect(BOWFA_RANGE).toBe(10)
  })

  it('can attack a visible monster within range', () => {
    expect(playerCanAttack(PLAYER_SPAWN, openRanger, ARENA)).toBe(true)
  })

  it('cannot attack through the pillar', () => {
    expect(playerCanAttack(PLAYER_SPAWN, stuckMager, ARENA)).toBe(false)
  })

  it('cannot attack beyond 10 tiles from the footprint edge', () => {
    const farRanger = monster(4, MonsterType.Ranger, 14, 19)
    // Nearest footprint tile (16,21); chebyshev to (28,39) is 18 > 10.
    expect(playerCanAttack(PLAYER_SPAWN, farRanger, ARENA)).toBe(false)
  })
})

describe('analyseStepOut / validStepOutTiles', () => {
  it('requires protect from magic when stepping out on a mager', () => {
    // Step-out tile west of the safespot with line of sight to the mager.
    const tile = { x: 26, y: 39 }
    const analysis = analyseStepOut([stuckMager], tile, stuckMager, ARENA)
    expect(analysis.canAttackTarget).toBe(true)
    expect(analysis.prayer).toBe(Prayer.ProtectMagic)
    expect(analysis.prayable).toBe(true)
  })

  it('prays against the biggest max hit when multiple styles threaten', () => {
    // Both a mager and a ranger can hit this exposed tile; mager hits 70 vs
    // the ranger's 46, so protect from magic is the correct call.
    const tile = { x: 33, y: 31 }
    const analysis = analyseStepOut([stuckMager, openRanger], tile, stuckMager, ARENA)
    expect(analysis.threats.length).toBe(2)
    expect(analysis.prayable).toBe(false)
    expect(analysis.prayer).toBe(Prayer.ProtectMagic)
  })

  it('treats blobs separately from hard prayer threats', () => {
    const blob = monster(5, MonsterType.Blob, 33, 37)
    const tile = { x: 32, y: 39 }
    const analysis = analyseStepOut([blob], tile, blob, ARENA)
    expect(analysis.threats).toHaveLength(0)
    expect(analysis.blobs).toHaveLength(1)
    // Only blobs: step out praying magic, then flick.
    expect(analysis.prayer).toBe(Prayer.ProtectMagic)
  })

  it('only returns tiles that can hit the target and are prayable', () => {
    const tiles = validStepOutTiles([stuckMager], stuckMager, ARENA, PLAYER_SPAWN, 6)
    expect(tiles.length).toBeGreaterThan(0)
    for (const t of tiles) {
      expect(t.canAttackTarget).toBe(true)
      expect(t.prayable).toBe(true)
    }
  })
})
