import { useMemo, useRef, useState } from 'react'
import type { Point } from '../engine/types'
import { Prayer } from '../engine/types'
import { MonsterType } from '../engine/types'
import { generateScenario, gradeAnswer, bestStepOut } from '../engine/flashcard'
import type { Scenario, Grade } from '../engine/flashcard'
import { MIN_WAVE, MAX_WAVE, NIBBLER_ONLY_WAVES, waveMonsters } from '../engine/waves'
import { MONSTERS } from '../engine/monsters'
import { ArenaGrid, MONSTER_COLORS, MONSTER_LETTERS } from './ArenaGrid'
import { StatsPanel, formatMs } from './StatsPanel'
import { loadAttempts, recordAttempt } from './stats'
import type { Attempt } from './stats'

type Phase = 'setup' | 'preStep' | 'stepOut' | 'prayer' | 'result'

const PRAYER_LABELS: Record<Prayer, string> = {
  [Prayer.None]: 'No overhead',
  [Prayer.ProtectMelee]: 'Protect from Melee',
  [Prayer.ProtectRanged]: 'Protect from Missiles',
  [Prayer.ProtectMagic]: 'Protect from Magic',
}

export default function App() {
  const [wave, setWave] = useState(50)
  const [phase, setPhase] = useState<Phase>('setup')
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [preStepTile, setPreStepTile] = useState<Point | null>(null)
  const [stepOutTile, setStepOutTile] = useState<Point | null>(null)
  const [grade, setGrade] = useState<Grade | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadAttempts())
  const startedAt = useRef(0)

  const waveIsCombat = !NIBBLER_ONLY_WAVES.includes(wave)
  const waveTypes = useMemo(() => (waveIsCombat ? waveMonsters(wave) : []), [wave, waveIsCombat])

  function start() {
    // The spawn is generated hidden from the player; the reveal starts the
    // timer, exactly as a real wave spawn does.
    const s = generateScenario(wave)
    setScenario(s)
    setPreStepTile(null)
    setStepOutTile(null)
    setGrade(null)
    startedAt.current = performance.now()
    setPhase('preStep')
  }

  function pickPreStep(tile: Point) {
    setPreStepTile(tile)
    setPhase('stepOut')
  }

  function pickStepOut(tile: Point) {
    setStepOutTile(tile)
    setPhase('prayer')
  }

  function pickPrayer(prayer: Prayer) {
    if (!scenario || !preStepTile || !stepOutTile) return
    const ms = Math.round(performance.now() - startedAt.current)
    const g = gradeAnswer(scenario, { preStepTile, stepOutTile, prayer })
    setElapsedMs(ms)
    setGrade(g)
    setAttempts(recordAttempt(scenario.wave, scenario.seed, ms, g))
    setPhase('result')
  }

  function reset() {
    setScenario(null)
    setPhase('setup')
  }

  const best = scenario && scenario.stepOuts.length > 0 ? bestStepOut(scenario.stepOuts, scenario.playerTile) : null

  return (
    <div className="app">
      <header>
        <h1>Inferno Flash Cards</h1>
        <p className="tagline">
          Train your north-pillar step-out reads: hiding tile, step-out tile and prayer - against
          the clock.
        </p>
      </header>

      {phase === 'setup' && (
        <section className="panel">
          <h2>Choose a wave</h2>
          <div className="wave-picker">
            <input
              type="range"
              min={MIN_WAVE}
              max={MAX_WAVE}
              value={wave}
              onChange={(e) => setWave(Number(e.target.value))}
              aria-label="Wave number"
            />
            <span className="wave-number">Wave {wave}</span>
          </div>
          <p className="wave-preview">
            {waveIsCombat
              ? waveTypes.map((t, i) => (
                  <span key={i} className="monster-chip" style={{ background: MONSTER_COLORS[t] }}>
                    {MONSTERS[t].name}
                  </span>
                ))
              : 'Nibbler-only wave: nothing to solve. Pick another wave.'}
          </p>
          <button type="button" className="primary" onClick={start} disabled={!waveIsCombat}>
            Deal the card
          </button>
          <details className="how-to">
            <summary>How it works</summary>
            <ol>
              <li>A valid spawn for the wave is generated and pathed to its final stack while you are assumed safespotted behind the north pillar (bowfa range assumed).</li>
              <li>The layout is revealed and the timer starts.</li>
              <li>Click the tile you would wait on before stepping out (a tile no monster can attack).</li>
              <li>Click the tile you would step out to (it must let you hit the kill target and be survivable with one overhead).</li>
              <li>Pick the overhead prayer to have active as you step out. Blobs read your prayer 3 ticks before attacking, so any overhead answers them - you flick after.</li>
            </ol>
          </details>
          <h2>Your stats</h2>
          <StatsPanel attempts={attempts} />
        </section>
      )}

      {scenario && phase !== 'setup' && (
        <section className="panel">
          <div className="hud">
            <span>Wave {scenario.wave}</span>
            {phase === 'preStep' && <strong>1/3 - Click your pre-step (hiding) tile</strong>}
            {phase === 'stepOut' && <strong>2/3 - Click your step-out tile</strong>}
            {phase === 'prayer' && <strong>3/3 - Pick your step-out prayer</strong>}
            {phase === 'result' && grade && (
              <strong className={grade.allCorrect ? 'good' : 'bad'}>
                {grade.allCorrect ? 'Perfect!' : 'Not quite.'} {formatMs(elapsedMs)}
              </strong>
            )}
          </div>

          <ArenaGrid
            monsters={scenario.stack}
            playerTile={scenario.playerTile}
            onTileClick={
              phase === 'preStep' ? pickPreStep : phase === 'stepOut' ? pickStepOut : undefined
            }
            selection={[
              ...(preStepTile ? [{ tile: preStepTile, label: '1' }] : []),
              ...(stepOutTile ? [{ tile: stepOutTile, label: '2' }] : []),
            ]}
            overlays={
              phase === 'result'
                ? [
                    { tiles: scenario.safeTiles, className: 'tile-safe' },
                    { tiles: scenario.stepOuts.map((s) => s.tile), className: 'tile-stepout' },
                  ]
                : []
            }
          />

          {phase === 'prayer' && (
            <div className="prayer-buttons">
              {[Prayer.ProtectMagic, Prayer.ProtectRanged, Prayer.ProtectMelee, Prayer.None].map(
                (p) => (
                  <button key={p} type="button" onClick={() => pickPrayer(p)}>
                    {PRAYER_LABELS[p]}
                  </button>
                ),
              )}
            </div>
          )}

          {phase === 'result' && grade && (
            <div className="result">
              <ul>
                <li className={grade.preStepCorrect ? 'good' : 'bad'}>
                  Pre-step tile: {grade.preStepCorrect ? 'correct' : 'wrong'}
                  {scenario.safeTiles.length === 0 && ' (no fully safe tile existed this spawn)'}
                </li>
                <li className={grade.stepOutCorrect ? 'good' : 'bad'}>
                  Step-out tile: {grade.stepOutCorrect ? 'correct' : 'wrong'}
                </li>
                <li className={grade.prayerCorrect ? 'good' : 'bad'}>
                  Prayer: {grade.prayerCorrect ? 'correct' : 'wrong'}
                  {best && ` (expected ${PRAYER_LABELS[best.prayer]}${best.blobs.length > 0 ? ', then flick for the blob' : ''})`}
                </li>
              </ul>
              <p className="legend">
                <span className="swatch tile-safe" /> safe hiding tiles
                <span className="swatch tile-stepout" /> valid step-out tiles
                {scenario.target && (
                  <>
                    {' '}| kill target:{' '}
                    <span
                      className="monster-chip"
                      style={{ background: MONSTER_COLORS[scenario.target.type] }}
                    >
                      {MONSTERS[scenario.target.type].name} ({MONSTER_LETTERS[scenario.target.type]})
                    </span>
                  </>
                )}
              </p>
              <div className="result-actions">
                <button type="button" className="primary" onClick={start}>
                  Same wave, new spawn
                </button>
                <button type="button" onClick={reset}>
                  Back to waves
                </button>
              </div>
            </div>
          )}

          {phase !== 'result' && (
            <button type="button" className="link" onClick={reset}>
              Abandon card
            </button>
          )}
        </section>
      )}

      <footer>
        <p>
          Monster spawn locations, sizes, ranges and pathing follow OSRS Inferno mechanics as
          documented on the{' '}
          <a
            href="https://oldschool.runescape.wiki/w/Inferno/Strategies"
            target="_blank"
            rel="noreferrer"
          >
            OSRS Wiki Inferno strategy guide
          </a>
          . Bat {MONSTERS[MonsterType.Bat].size}x{MONSTERS[MonsterType.Bat].size}, blob 3x3,
          meleer 4x4, ranger 3x3, mager 4x4; melee cannot attack diagonally; NPCs use dumb
          pathing and stack behind pillars.
        </p>
      </footer>
    </div>
  )
}
