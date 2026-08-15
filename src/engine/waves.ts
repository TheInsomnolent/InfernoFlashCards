import { MonsterType } from './types'

/**
 * Inferno wave composition for waves 1-66.
 *
 * Counts are [bats, blobs, meleers, rangers, magers] (Jal-MejRah, Jal-Ak,
 * Jal-ImKot, Jal-Xil, Jal-Zek). Nibblers, Jad (waves 67-68) and Zuk
 * (wave 69) are intentionally out of scope for this tool.
 *
 * Validated against the OSRS Wiki wave table (Inferno#Waves) and the
 * open-source InfernoTrainer wave array. Waves 3, 8, 17 and 34 are
 * nibbler-only transition waves and contain none of the main monsters.
 */
export type WaveCounts = readonly [
  bats: number,
  blobs: number,
  meleers: number,
  rangers: number,
  magers: number,
]

export const WAVES: readonly WaveCounts[] = [
  /* 1 */ [1, 0, 0, 0, 0],
  /* 2 */ [2, 0, 0, 0, 0],
  /* 3 */ [0, 0, 0, 0, 0], // nibblers only
  /* 4 */ [0, 1, 0, 0, 0],
  /* 5 */ [1, 1, 0, 0, 0],
  /* 6 */ [2, 1, 0, 0, 0],
  /* 7 */ [0, 2, 0, 0, 0],
  /* 8 */ [0, 0, 0, 0, 0], // nibblers only
  /* 9 */ [0, 0, 1, 0, 0],
  /* 10 */ [1, 0, 1, 0, 0],
  /* 11 */ [2, 0, 1, 0, 0],
  /* 12 */ [0, 1, 1, 0, 0],
  /* 13 */ [1, 1, 1, 0, 0],
  /* 14 */ [2, 1, 1, 0, 0],
  /* 15 */ [0, 2, 1, 0, 0],
  /* 16 */ [0, 0, 2, 0, 0],
  /* 17 */ [0, 0, 0, 0, 0], // nibblers only
  /* 18 */ [0, 0, 0, 1, 0],
  /* 19 */ [1, 0, 0, 1, 0],
  /* 20 */ [2, 0, 0, 1, 0],
  /* 21 */ [0, 1, 0, 1, 0],
  /* 22 */ [1, 1, 0, 1, 0],
  /* 23 */ [2, 1, 0, 1, 0],
  /* 24 */ [0, 2, 0, 1, 0],
  /* 25 */ [0, 0, 1, 1, 0],
  /* 26 */ [1, 0, 1, 1, 0],
  /* 27 */ [2, 0, 1, 1, 0],
  /* 28 */ [0, 1, 1, 1, 0],
  /* 29 */ [1, 1, 1, 1, 0],
  /* 30 */ [2, 1, 1, 1, 0],
  /* 31 */ [0, 2, 1, 1, 0],
  /* 32 */ [0, 0, 2, 1, 0],
  /* 33 */ [0, 0, 0, 2, 0],
  /* 34 */ [0, 0, 0, 0, 0], // nibblers only
  /* 35 */ [0, 0, 0, 0, 1],
  /* 36 */ [1, 0, 0, 0, 1],
  /* 37 */ [2, 0, 0, 0, 1],
  /* 38 */ [0, 1, 0, 0, 1],
  /* 39 */ [1, 1, 0, 0, 1],
  /* 40 */ [2, 1, 0, 0, 1],
  /* 41 */ [0, 2, 0, 0, 1],
  /* 42 */ [0, 0, 1, 0, 1],
  /* 43 */ [1, 0, 1, 0, 1],
  /* 44 */ [2, 0, 1, 0, 1],
  /* 45 */ [0, 1, 1, 0, 1],
  /* 46 */ [1, 1, 1, 0, 1],
  /* 47 */ [2, 1, 1, 0, 1],
  /* 48 */ [0, 2, 1, 0, 1],
  /* 49 */ [0, 0, 2, 0, 1],
  /* 50 */ [0, 0, 0, 1, 1],
  /* 51 */ [1, 0, 0, 1, 1],
  /* 52 */ [2, 0, 0, 1, 1],
  /* 53 */ [0, 1, 0, 1, 1],
  /* 54 */ [1, 1, 0, 1, 1],
  /* 55 */ [2, 1, 0, 1, 1],
  /* 56 */ [0, 2, 0, 1, 1],
  /* 57 */ [0, 0, 1, 1, 1],
  /* 58 */ [1, 0, 1, 1, 1],
  /* 59 */ [2, 0, 1, 1, 1],
  /* 60 */ [0, 1, 1, 1, 1],
  /* 61 */ [1, 1, 1, 1, 1],
  /* 62 */ [2, 1, 1, 1, 1],
  /* 63 */ [0, 2, 1, 1, 1],
  /* 64 */ [0, 0, 2, 1, 1],
  /* 65 */ [0, 0, 0, 2, 1],
  /* 66 */ [0, 0, 0, 0, 2],
]

export const MIN_WAVE = 1
export const MAX_WAVE = 66

/** Waves that contain only nibblers (no monsters relevant to this tool). */
export const NIBBLER_ONLY_WAVES: readonly number[] = [3, 8, 17, 34]

/** Monster types present on a wave, expanded from the count table. */
export function waveMonsters(wave: number): MonsterType[] {
  if (wave < MIN_WAVE || wave > MAX_WAVE || !Number.isInteger(wave)) {
    throw new RangeError(`Wave must be an integer between ${MIN_WAVE} and ${MAX_WAVE}`)
  }
  const [bats, blobs, meleers, rangers, magers] = WAVES[wave - 1]
  const result: MonsterType[] = []
  // Spawn priority order used by the game: mager, ranger, meleer, blob, bat.
  for (let i = 0; i < magers; i++) result.push(MonsterType.Mager)
  for (let i = 0; i < rangers; i++) result.push(MonsterType.Ranger)
  for (let i = 0; i < meleers; i++) result.push(MonsterType.Meleer)
  for (let i = 0; i < blobs; i++) result.push(MonsterType.Blob)
  for (let i = 0; i < bats; i++) result.push(MonsterType.Bat)
  return result
}
