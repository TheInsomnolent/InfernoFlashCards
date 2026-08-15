import { describe, it, expect } from 'vitest'
import { WAVES, MAX_WAVE, MIN_WAVE, NIBBLER_ONLY_WAVES, waveMonsters } from './waves'
import { MonsterType } from './types'

describe('wave composition', () => {
  it('covers waves 1 to 66', () => {
    expect(WAVES).toHaveLength(66)
    expect(MIN_WAVE).toBe(1)
    expect(MAX_WAVE).toBe(66)
  })

  it('matches the documented monster introduction waves', () => {
    // Wiki: bats from wave 1, blobs from 4, meleer from 9, ranger from 18,
    // mager from 35.
    expect(waveMonsters(1)).toEqual([MonsterType.Bat])
    expect(waveMonsters(4)).toEqual([MonsterType.Blob])
    expect(waveMonsters(9)).toEqual([MonsterType.Meleer])
    expect(waveMonsters(18)).toEqual([MonsterType.Ranger])
    expect(waveMonsters(35)).toEqual([MonsterType.Mager])
  })

  it('has the documented nibbler-only transition waves', () => {
    for (const wave of NIBBLER_ONLY_WAVES) {
      expect(waveMonsters(wave)).toEqual([])
    }
    expect(NIBBLER_ONLY_WAVES).toEqual([3, 8, 17, 34])
  })

  it('matches known late-wave compositions', () => {
    // Wave 61 is the first wave with all five monster types.
    expect(new Set(waveMonsters(61)).size).toBe(5)
    // Wave 66 is double mager.
    expect(waveMonsters(66)).toEqual([MonsterType.Mager, MonsterType.Mager])
    // Wave 50 introduces ranger + mager together.
    expect(waveMonsters(50)).toEqual([MonsterType.Mager, MonsterType.Ranger])
    // Wave 62 is the largest wave: 2 bats, 1 blob, 1 meleer, 1 ranger, 1 mager.
    expect(waveMonsters(62)).toHaveLength(6)
  })

  it('lists monsters in spawn priority order: mager, ranger, meleer, blob, bat', () => {
    expect(waveMonsters(61)).toEqual([
      MonsterType.Mager,
      MonsterType.Ranger,
      MonsterType.Meleer,
      MonsterType.Blob,
      MonsterType.Bat,
    ])
  })

  it('never exceeds the nine available spawn points', () => {
    for (let wave = MIN_WAVE; wave <= MAX_WAVE; wave++) {
      expect(waveMonsters(wave).length).toBeLessThanOrEqual(9)
    }
  })

  it('rejects out-of-range waves', () => {
    expect(() => waveMonsters(0)).toThrow(RangeError)
    expect(() => waveMonsters(67)).toThrow(RangeError)
    expect(() => waveMonsters(1.5)).toThrow(RangeError)
  })
})
