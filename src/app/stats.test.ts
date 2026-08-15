import { describe, it, expect } from 'vitest'
import { loadAttempts, recordAttempt, statsByWave } from './stats'
import type { KeyValueStore } from './stats'

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

const grade = (allCorrect: boolean) => ({
  preStepCorrect: allCorrect,
  stepOutCorrect: allCorrect,
  prayerCorrect: allCorrect,
  allCorrect,
})

describe('stats store', () => {
  it('starts empty', () => {
    expect(loadAttempts(memoryStore())).toEqual([])
    expect(loadAttempts(null)).toEqual([])
  })

  it('records and reloads attempts', () => {
    const store = memoryStore()
    recordAttempt(50, 1, 4200, grade(true), store)
    recordAttempt(50, 2, 3100, grade(false), store)
    const attempts = loadAttempts(store)
    expect(attempts).toHaveLength(2)
    expect(attempts[0].wave).toBe(50)
    expect(attempts[0].allCorrect).toBe(true)
    expect(attempts[1].timeMs).toBe(3100)
  })

  it('survives corrupted storage', () => {
    const store = memoryStore()
    store.setItem('inferno-flash-cards/attempts/v1', 'not json')
    expect(loadAttempts(store)).toEqual([])
    store.setItem('inferno-flash-cards/attempts/v1', '{"nope":1}')
    expect(loadAttempts(store)).toEqual([])
    store.setItem('inferno-flash-cards/attempts/v1', '[{"bad":"entry"}]')
    expect(loadAttempts(store)).toEqual([])
  })

  it('aggregates per-wave stats', () => {
    const store = memoryStore()
    recordAttempt(50, 1, 4000, grade(true), store)
    recordAttempt(50, 2, 2000, grade(true), store)
    recordAttempt(50, 3, 9000, grade(false), store)
    recordAttempt(9, 4, 1500, grade(true), store)
    const stats = statsByWave(loadAttempts(store))
    expect(stats.map((s) => s.wave)).toEqual([9, 50])
    const wave50 = stats.find((s) => s.wave === 50)!
    expect(wave50.attempts).toBe(3)
    expect(wave50.correct).toBe(2)
    expect(wave50.bestTimeMs).toBe(2000)
    expect(wave50.avgTimeMs).toBe(3000)
  })
})
