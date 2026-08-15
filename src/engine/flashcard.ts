import type { Monster, Point } from './types'
import { AttackStyle, Prayer } from './types'
import { ARENA, PLAYER_SPAWN, SPAWN_POINTS } from './arena'
import { waveMonsters } from './waves'
import { placeMonsters, simulateWave } from './simulation'
import type { Rng } from './random'
import { mulberry32, shuffled } from './random'
import type { StepOutAnalysis } from './solver'
import { analyseStepOut, killPriorityOrder, killTarget, safeTiles, threatsAt, validStepOutTiles } from './solver'

/**
 * Flash-card scenario generation: ties the engine together.
 *
 * A scenario is one generated wave: monsters placed on shuffled spawn
 * points, pathed to their final stacked positions around the player's
 * north-pillar safespot, with the correct answers precomputed.
 */

/** Search radius around the safespot for hiding and step-out tiles. */
const TILE_SEARCH_RADIUS = 6

export interface Scenario {
  wave: number
  seed: number
  /** Monsters at their initial spawn points. */
  spawns: Monster[]
  /** Monsters at their final stacked positions. */
  stack: Monster[]
  /** The player's assumed position while the stack forms. */
  playerTile: Point
  /** Tiles where no monster in the final stack can attack the player. */
  safeTiles: Point[]
  /** The monster to kill first (standard priority). */
  target: Monster | null
  /** Valid step-out tiles with their analyses. */
  stepOuts: StepOutAnalysis[]
  /** The correct prayer for the best step-out tile (or None). */
  prayer: Prayer
}

export function generateScenario(wave: number, seed: number = randomSeed()): Scenario {
  const rng: Rng = mulberry32(seed)
  const types = waveMonsters(wave)
  const spawns = placeMonsters(types, SPAWN_POINTS, (items) => shuffled(items, rng))

  // The player starts at the north-pillar safespot. If a ranged/magic
  // monster settles at max range with line of sight to that tile (which
  // happens on some spawns), a real player immediately relocates to a hidden
  // tile, and the monsters re-path towards the new position - usually ending
  // up stacked behind the pillar. Repeat until hidden or no hiding spot
  // exists. Melee-only pressure never triggers a relocation: the meleer
  // would simply follow, and players deal with it by stepping around it.
  let playerTile: Point = { ...PLAYER_SPAWN }
  let stack: Monster[] = spawns
  for (let attempt = 0; attempt < 4; attempt++) {
    stack = simulateWave(stack, playerTile, ARENA).monsters
    const ranged = threatsAt(stack, playerTile, ARENA).filter(
      (t) => t.style !== AttackStyle.Melee,
    )
    if (ranged.length === 0) break
    const hidden = safeTiles(stack, ARENA, playerTile, TILE_SEARCH_RADIUS)
    if (hidden.length === 0) break
    playerTile = hidden.reduce((a, b) =>
      chebyshevTo(playerTile, b) < chebyshevTo(playerTile, a) ? b : a,
    )
  }

  const hideTiles = safeTiles(stack, ARENA, playerTile, TILE_SEARCH_RADIUS)

  // Kill priority: mager > ranger > meleer > blob > bat - but if the top
  // priority monster cannot be attacked from any valid step-out tile (e.g.
  // it is stuck out of bowfa range across the arena), fall down the list.
  let target: Monster | null = null
  let stepOuts: StepOutAnalysis[] = []
  for (const candidate of killPriorityOrder(stack)) {
    const outs = validStepOutTiles(stack, candidate, ARENA, playerTile, TILE_SEARCH_RADIUS)
    if (outs.length > 0) {
      target = candidate
      stepOuts = outs
      break
    }
  }
  target ??= killTarget(stack)

  return {
    wave,
    seed,
    spawns,
    stack,
    playerTile,
    safeTiles: hideTiles,
    target,
    stepOuts,
    prayer: stepOuts.length > 0 ? bestStepOut(stepOuts, playerTile).prayer : Prayer.None,
  }
}

function chebyshevTo(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

/**
 * Ranks step-out tiles: fewest exposed threats first, then fewest blobs,
 * then closest to the player's hiding tile.
 */
export function bestStepOut(
  stepOuts: readonly StepOutAnalysis[],
  from: Point,
): StepOutAnalysis {
  return [...stepOuts].sort(
    (a, b) =>
      a.threats.length - b.threats.length ||
      a.blobs.length - b.blobs.length ||
      chebyshevTo(from, a.tile) - chebyshevTo(from, b.tile),
  )[0]
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

/** Grades the player's answers against a scenario. */
export interface Answer {
  preStepTile: Point
  stepOutTile: Point
  prayer: Prayer
}

export interface Grade {
  preStepCorrect: boolean
  stepOutCorrect: boolean
  prayerCorrect: boolean
  allCorrect: boolean
}

export function gradeAnswer(scenario: Scenario, answer: Answer): Grade {
  // If the wave offers no fully-hidden tile / no valid step-out tile at all,
  // any choice is accepted for that part of the card.
  const preStepCorrect =
    scenario.safeTiles.length === 0 ||
    scenario.safeTiles.some(
      (t) => t.x === answer.preStepTile.x && t.y === answer.preStepTile.y,
    )

  const chosen = scenario.stepOuts.find(
    (s) => s.tile.x === answer.stepOutTile.x && s.tile.y === answer.stepOutTile.y,
  )
  const stepOutCorrect = scenario.stepOuts.length === 0 || chosen !== undefined

  // The prayer is graded against the tile the player actually chose, if it
  // was a valid step-out; otherwise against the best step-out tile.
  let prayerCorrect: boolean
  if (chosen) {
    prayerCorrect = prayerAccepted(chosen, answer.prayer)
  } else if (scenario.stepOuts.length > 0) {
    prayerCorrect = prayerAccepted(bestStepOut(scenario.stepOuts, scenario.playerTile), answer.prayer)
  } else {
    prayerCorrect = answer.prayer === Prayer.None
  }

  return {
    preStepCorrect,
    stepOutCorrect,
    prayerCorrect,
    allCorrect: preStepCorrect && stepOutCorrect && prayerCorrect,
  }
}

/**
 * Which prayers are acceptable while stepping out on a tile: the counter to
 * the non-blob threats if any exist; with only blobs any overhead protection
 * works (the blob reads it on the scan and the player flicks afterwards);
 * with no threats at all, no prayer is needed (any answer is accepted).
 */
export function prayerAccepted(analysis: StepOutAnalysis, prayer: Prayer): boolean {
  if (analysis.threats.length > 0) return prayer === analysis.prayer
  if (analysis.blobs.length > 0) return prayer !== Prayer.None
  return true
}

export { analyseStepOut, threatsAt }
