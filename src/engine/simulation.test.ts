import { describe, it, expect } from 'vitest'
import { simulateWave, placeMonsters } from './simulation'
import { ARENA, PLAYER_SPAWN, SPAWN_POINTS, PILLARS } from './arena'
import { MonsterType } from './types'
import type { Monster } from './types'

function monster(id: number, type: MonsterType, x: number, y: number): Monster {
  return { id, type, position: { x, y } }
}

describe('simulateWave', () => {
  it('a meleer from a southern spawn gets stuck south of the north pillar', () => {
    const { monsters, attackers } = simulateWave(
      [monster(0, MonsterType.Meleer, 16, 19)],
      PLAYER_SPAWN,
      ARENA,
    )
    // It paths diagonally to the player's column, then north until its
    // footprint would clip the pillar: stuck at (28,31), unable to attack.
    expect(monsters[0].position).toEqual({ x: 28, y: 31 })
    expect(attackers).toEqual([])
  })

  it('monsters stack perfectly on the same tiles (no NPC-NPC collision)', () => {
    const { monsters } = simulateWave(
      [monster(0, MonsterType.Meleer, 16, 19), monster(1, MonsterType.Meleer, 12, 14)],
      PLAYER_SPAWN,
      ARENA,
    )
    expect(monsters[0].position).toEqual(monsters[1].position)
  })

  it('a mager stops at max range as soon as it can attack the safespot', () => {
    // From the south-west spawn the mager gains range + line of sight to the
    // north-pillar safespot after two steps: this is the wave-spawn geometry
    // that forces the player to relocate even "behind" the pillar.
    const { monsters, attackers } = simulateWave(
      [monster(0, MonsterType.Mager, 16, 19)],
      PLAYER_SPAWN,
      ARENA,
    )
    expect(monsters[0].position).toEqual({ x: 17, y: 21 })
    expect(attackers).toEqual([0])
  })

  it('a ranger with clear line of sight attacks from its spawn without moving', () => {
    const { monsters, attackers } = simulateWave(
      [monster(0, MonsterType.Ranger, 33, 37)],
      PLAYER_SPAWN,
      ARENA,
    )
    expect(monsters[0].position).toEqual({ x: 33, y: 37 })
    expect(attackers).toEqual([0])
  })

  it('a bat is stopped by the pillar outside its short 4-tile range', () => {
    const { monsters, attackers } = simulateWave(
      [monster(0, MonsterType.Bat, 26, 14)],
      PLAYER_SPAWN,
      ARENA,
    )
    // Blocked by the pillar at 5 tiles from the player: cannot attack.
    expect(monsters[0].position).toEqual({ x: 28, y: 33 })
    expect(attackers).toEqual([])
  })

  it('terminates and leaves every monster inside the arena', () => {
    const all = SPAWN_POINTS.map((p, i) =>
      monster(i, [MonsterType.Mager, MonsterType.Ranger, MonsterType.Meleer][i % 3], p.x, p.y),
    )
    const { monsters, ticks } = simulateWave(all, PLAYER_SPAWN, ARENA)
    expect(ticks).toBeLessThan(512)
    for (const m of monsters) {
      expect(ARENA.blocked(m.position.x, m.position.y)).toBe(false)
    }
  })

  it('never moves a monster onto a pillar tile', () => {
    const { monsters } = simulateWave(
      [monster(0, MonsterType.Meleer, 16, 19)],
      PLAYER_SPAWN,
      ARENA,
    )
    const m = monsters[0]
    for (let ox = 0; ox < 4; ox++) {
      for (let oy = 0; oy < 4; oy++) {
        for (const p of PILLARS) {
          const inPillar =
            m.position.x + ox >= p.x &&
            m.position.x + ox < p.x + 3 &&
            m.position.y + oy >= p.y &&
            m.position.y + oy < p.y + 3
          expect(inPillar).toBe(false)
        }
      }
    }
  })

  it('does not mutate the spawn positions passed in', () => {
    const spawned = [monster(0, MonsterType.Meleer, 16, 19)]
    simulateWave(spawned, PLAYER_SPAWN, ARENA)
    expect(spawned[0].position).toEqual({ x: 16, y: 19 })
  })
})

describe('placeMonsters', () => {
  const identity = <T,>(items: readonly T[]) => [...items]

  it('assigns shuffled spawn points in order', () => {
    const monsters = placeMonsters(
      [MonsterType.Mager, MonsterType.Bat],
      SPAWN_POINTS,
      identity,
    )
    expect(monsters).toHaveLength(2)
    expect(monsters[0].position).toEqual(SPAWN_POINTS[0])
    expect(monsters[1].position).toEqual(SPAWN_POINTS[1])
    expect(monsters.map((m) => m.id)).toEqual([0, 1])
  })

  it('rejects more monsters than spawn points', () => {
    expect(() =>
      placeMonsters(Array(10).fill(MonsterType.Bat), SPAWN_POINTS, identity),
    ).toThrow(RangeError)
  })
})
