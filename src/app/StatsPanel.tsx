import { statsByWave } from './stats'
import type { Attempt } from './stats'

interface Props {
  attempts: readonly Attempt[]
}

export function StatsPanel({ attempts }: Props) {
  const stats = statsByWave(attempts)
  if (stats.length === 0) {
    return <p className="stats-empty">No attempts yet. Your results are stored locally in your browser.</p>
  }
  return (
    <table className="stats-table">
      <thead>
        <tr>
          <th>Wave</th>
          <th>Attempts</th>
          <th>Correct</th>
          <th>Best time</th>
          <th>Avg time</th>
        </tr>
      </thead>
      <tbody>
        {stats.map((s) => (
          <tr key={s.wave}>
            <td>{s.wave}</td>
            <td>{s.attempts}</td>
            <td>
              {s.correct}/{s.attempts} ({Math.round((100 * s.correct) / s.attempts)}%)
            </td>
            <td>{s.bestTimeMs === null ? '-' : formatMs(s.bestTimeMs)}</td>
            <td>{s.avgTimeMs === null ? '-' : formatMs(s.avgTimeMs)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}
