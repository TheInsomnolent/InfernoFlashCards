import { describe, it, expect } from 'vitest'
import { generateScenario, gradeAnswer, bestStepOut, prayerAccepted } from './flashcard'
import { threatsAt } from './solver'
import { ARENA } from './arena'
import { MIN_WAVE, MAX_WAVE, waveMonsters, NIBBLER_ONLY_WAVES } from './waves'
import { AttackStyle, Prayer } from './types'
import { mulberry32, shuffled } from './random'

describe('random', () => {
  it('mulberry32 is deterministic per seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('shuffled preserves the multiset of items', () => {
    const rng = mulberry32(7)
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    expect([...shuffled(items, rng)].sort((x, y) => x - y)).toEqual(items)
  })
})

describe('generateScenario', () => {
  it('is reproducible for the same wave and seed', () => {
    const a = generateScenario(50, 123)
    const b = generateScenario(50, 123)
    expect(a).toEqual(b)
  })

  it('spawns exactly the monsters of the wave', () => {
    const s = generateScenario(62, 1)
    expect(s.spawns.map((m) => m.type).sort()).toEqual(
      [...waveMonsters(62)].sort(),
    )
    expect(s.stack).toHaveLength(s.spawns.length)
  })

  it('the player ends hidden from all ranged/magic attackers whenever possible', () => {
    for (let seed = 1; seed <= 25; seed++) {
      for (const wave of [50, 56, 62, 66]) {
        const s = generateScenario(wave, seed)
        const ranged = threatsAt(s.stack, s.playerTile, ARENA).filter(
          (t) => t.style !== AttackStyle.Melee,
        )
        // If the generator left the player exposed there must have been no
        // hiding tile at all (verified by the empty safeTiles list).
        if (ranged.length > 0) {
          expect(s.safeTiles).toHaveLength(0)
        }
      }
    }
  })

  it('every step-out tile can hit the target with a single protection prayer', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = generateScenario(62, seed)
      for (const out of s.stepOuts) {
        expect(out.canAttackTarget).toBe(true)
        expect(out.prayable).toBe(true)
      }
    }
  })

  it('produces a target and step-outs for every combat wave (sampled seeds)', () => {
    for (let wave = MIN_WAVE; wave <= MAX_WAVE; wave++) {
      if (NIBBLER_ONLY_WAVES.includes(wave)) {
        const s = generateScenario(wave, 3)
        expect(s.stack).toHaveLength(0)
        expect(s.target).toBeNull()
        continue
      }
      const s = generateScenario(wave, 3)
      expect(s.target).not.toBeNull()
      expect(s.stepOuts.length).toBeGreaterThan(0)
    }
  })
})

describe('gradeAnswer', () => {
  it('accepts a fully correct answer', () => {
    const s = generateScenario(66, 5)
    expect(s.safeTiles.length).toBeGreaterThan(0)
    const best = bestStepOut(s.stepOuts, s.playerTile)
    const grade = gradeAnswer(s, {
      preStepTile: s.safeTiles[0],
      stepOutTile: best.tile,
      prayer: best.prayer,
    })
    expect(grade.preStepCorrect).toBe(true)
    expect(grade.stepOutCorrect).toBe(true)
    expect(grade.prayerCorrect).toBe(true)
    expect(grade.allCorrect).toBe(true)
  })

  it('rejects a pre-step tile that is not a hiding tile', () => {
    const s = generateScenario(66, 5) // has both hiding tiles and exposed tiles
    expect(s.safeTiles.length).toBeGreaterThan(0)
    const best = bestStepOut(s.stepOuts, s.playerTile)
    // A tile with at least one live threat can never be in the safe list.
    const exposed = s.stepOuts.find((o) => o.threats.length > 0 || o.blobs.length > 0)!
    expect(exposed).toBeDefined()
    expect(s.safeTiles).not.toContainEqual(exposed.tile)
    const grade = gradeAnswer(s, {
      preStepTile: exposed.tile,
      stepOutTile: best.tile,
      prayer: best.prayer,
    })
    expect(grade.preStepCorrect).toBe(false)
    expect(grade.allCorrect).toBe(false)
  })

  it('rejects the wrong prayer for the chosen step-out tile', () => {
    const s = generateScenario(66, 5) // double mager: protect from magic
    const best = bestStepOut(s.stepOuts, s.playerTile)
    expect(best.prayer).toBe(Prayer.ProtectMagic)
    const grade = gradeAnswer(s, {
      preStepTile: s.safeTiles[0],
      stepOutTile: best.tile,
      prayer: Prayer.ProtectRanged,
    })
    expect(grade.prayerCorrect).toBe(false)
  })
})

describe('prayerAccepted', () => {
  const base = {
    tile: { x: 0, y: 0 },
    canAttackTarget: true,
    prayable: true,
  }

  it('requires the exact counter prayer against hard threats', () => {
    const analysis = { ...base, threats: [{} as never], blobs: [], prayer: Prayer.ProtectMagic }
    expect(prayerAccepted(analysis, Prayer.ProtectMagic)).toBe(true)
    expect(prayerAccepted(analysis, Prayer.ProtectRanged)).toBe(false)
    expect(prayerAccepted(analysis, Prayer.None)).toBe(false)
  })

  it('accepts any overhead against blob-only exposure', () => {
    const analysis = { ...base, threats: [], blobs: [{} as never], prayer: Prayer.ProtectMagic }
    expect(prayerAccepted(analysis, Prayer.ProtectMagic)).toBe(true)
    expect(prayerAccepted(analysis, Prayer.ProtectRanged)).toBe(true)
    expect(prayerAccepted(analysis, Prayer.None)).toBe(false)
  })

  it('accepts anything when nothing can attack', () => {
    const analysis = { ...base, threats: [], blobs: [], prayer: Prayer.None }
    expect(prayerAccepted(analysis, Prayer.None)).toBe(true)
    expect(prayerAccepted(analysis, Prayer.ProtectMelee)).toBe(true)
  })
})
