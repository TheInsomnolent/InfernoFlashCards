import type { Monster, Point } from '../engine/types'
import { MonsterType } from '../engine/types'
import { ARENA, PLAYABLE } from '../engine/arena'
import { MONSTERS } from '../engine/monsters'

/**
 * Renders the Inferno combat area as a clickable tile grid. North is up:
 * the top row is the highest y in the engine's coordinate system.
 */

export const MONSTER_COLORS: Record<MonsterType, string> = {
  [MonsterType.Bat]: '#9e9e9e',
  [MonsterType.Blob]: '#e2c044',
  [MonsterType.Meleer]: '#e05656',
  [MonsterType.Ranger]: '#57a55a',
  [MonsterType.Mager]: '#5a8fd6',
}

export const MONSTER_LETTERS: Record<MonsterType, string> = {
  [MonsterType.Bat]: 'B',
  [MonsterType.Blob]: 'O',
  [MonsterType.Meleer]: 'M',
  [MonsterType.Ranger]: 'R',
  [MonsterType.Mager]: 'Z',
}

export interface Overlay {
  tiles: readonly Point[]
  className: string
}

interface Props {
  monsters: readonly Monster[]
  playerTile: Point | null
  overlays?: readonly Overlay[]
  selection?: { tile: Point; label: string }[]
  onTileClick?: (tile: Point) => void
  dimmed?: boolean
}

export function ArenaGrid({
  monsters,
  playerTile,
  overlays = [],
  selection = [],
  onTileClick,
  dimmed = false,
}: Props) {
  const rows = []
  for (let y = PLAYABLE.maxY; y >= PLAYABLE.minY; y--) {
    const cells = []
    for (let x = PLAYABLE.minX; x <= PLAYABLE.maxX; x++) {
      cells.push(renderTile(x, y))
    }
    rows.push(
      <div className="arena-row" key={y}>
        {cells}
      </div>,
    )
  }

  function renderTile(x: number, y: number) {
    const isPillar = ARENA.blocked(x, y)
    const classes = ['tile']
    if (isPillar) classes.push('tile-pillar')

    let content: React.ReactNode = null
    let style: React.CSSProperties | undefined

    const covering = monsters.find((m) => {
      const size = MONSTERS[m.type].size
      return x >= m.position.x && x < m.position.x + size && y >= m.position.y && y < m.position.y + size
    })
    if (covering) {
      const def = MONSTERS[covering.type]
      style = { background: MONSTER_COLORS[covering.type] }
      classes.push('tile-monster')
      // Label the centre-ish tile of the footprint.
      if (
        x === covering.position.x + Math.floor((def.size - 1) / 2) &&
        y === covering.position.y + Math.floor(def.size / 2)
      ) {
        content = MONSTER_LETTERS[covering.type]
      }
    }

    for (const overlay of overlays) {
      if (overlay.tiles.some((t) => t.x === x && t.y === y)) classes.push(overlay.className)
    }

    const selected = selection.find((s) => s.tile.x === x && s.tile.y === y)
    if (selected) {
      classes.push('tile-selected')
      content = selected.label
    }

    if (playerTile && playerTile.x === x && playerTile.y === y) {
      classes.push('tile-player')
      content = 'P'
    }

    const clickable = onTileClick && !isPillar
    if (clickable) classes.push('tile-clickable')

    return (
      <button
        key={`${x},${y}`}
        type="button"
        className={classes.join(' ')}
        style={style}
        disabled={!clickable}
        aria-label={`Tile ${x},${y}`}
        onClick={clickable ? () => onTileClick({ x, y }) : undefined}
      >
        {content}
      </button>
    )
  }

  return <div className={dimmed ? 'arena arena-dimmed' : 'arena'}>{rows}</div>
}
