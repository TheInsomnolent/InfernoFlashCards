import type { Grade } from '../engine/flashcard'

/**
 * Attempt history persisted in localStorage.
 */
export interface Attempt {
  wave: number
  seed: number
  timeMs: number
  preStepCorrect: boolean
  stepOutCorrect: boolean
  prayerCorrect: boolean
  allCorrect: boolean
  at: number
}

export interface WaveStats {
  wave: number
  attempts: number
  correct: number
  bestTimeMs: number | null
  avgTimeMs: number | null
}

const STORAGE_KEY = 'inferno-flash-cards/attempts/v1'

/** Minimal Storage-like interface so the store is testable without a DOM. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadAttempts(store: KeyValueStore | null = defaultStore()): Attempt[] {
  if (!store) return []
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isAttempt)
  } catch {
    return []
  }
}

export function recordAttempt(
  wave: number,
  seed: number,
  timeMs: number,
  grade: Grade,
  store: KeyValueStore | null = defaultStore(),
): Attempt[] {
  const attempt: Attempt = {
    wave,
    seed,
    timeMs,
    preStepCorrect: grade.preStepCorrect,
    stepOutCorrect: grade.stepOutCorrect,
    prayerCorrect: grade.prayerCorrect,
    allCorrect: grade.allCorrect,
    at: Date.now(),
  }
  const attempts = [...loadAttempts(store), attempt]
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(attempts))
  } catch {
    // Storage may be full or unavailable; stats simply are not persisted.
  }
  return attempts
}

export function statsByWave(attempts: readonly Attempt[]): WaveStats[] {
  const byWave = new Map<number, Attempt[]>()
  for (const a of attempts) {
    const list = byWave.get(a.wave) ?? []
    list.push(a)
    byWave.set(a.wave, list)
  }
  return [...byWave.entries()]
    .map(([wave, list]) => {
      const times = list.filter((a) => a.allCorrect).map((a) => a.timeMs)
      return {
        wave,
        attempts: list.length,
        correct: list.filter((a) => a.allCorrect).length,
        bestTimeMs: times.length > 0 ? Math.min(...times) : null,
        avgTimeMs:
          times.length > 0 ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : null,
      }
    })
    .sort((a, b) => a.wave - b.wave)
}

function isAttempt(value: unknown): value is Attempt {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Record<string, unknown>
  return (
    typeof a.wave === 'number' &&
    typeof a.seed === 'number' &&
    typeof a.timeMs === 'number' &&
    typeof a.allCorrect === 'boolean'
  )
}
