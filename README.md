# Inferno Flash Cards

A flash-card style training tool for quickly analysing OSRS Inferno pillar solves,
built as a single-page Vite + React app and deployed to GitHub Pages.

**Play it:** https://theinsomnolent.github.io/InfernoFlashCards/

## What it trains

A core mechanic of the Inferno is determining, for each wave, exactly which tile to
step out on from behind the north pillar, which overhead prayer to have active when
you step out, and how the resulting stack constrains you. This tool deals you a
"card":

1. You pick a wave (1-66; nibbler-only waves 3, 8, 17 and 34 are excluded, as are
   Jad and Zuk).
2. A valid spawn for that wave is generated **hidden from you**. Monsters path to
   their final stacked positions while you are assumed to be safespotted behind the
   north pillar (with a bowfa). If a ranger or mager can attack your default
   safespot - which genuinely happens on some spawns - the player is relocated to a
   nearby hidden tile first, just as you would in a real attempt.
3. The layout is revealed and a timer starts. You answer three questions:
   - **Pre-step tile** - the tile you wait on, where no monster can attack you.
   - **Step-out tile** - the tile you step out to. It must let you attack the
     correct kill target (mager > ranger > meleer > blob > bat) and be survivable
     with a single overhead prayer.
   - **Prayer** - the overhead to have active as you step out.
4. Your time and correctness are graded and stored in `localStorage`, with
   per-wave stats (attempts, accuracy, best/average time on fully correct answers).

## The engine

The simulation engine in [`src/engine`](src/engine) replicates the OSRS mechanics
that matter for pillar solves, validated against the
[OSRS Wiki Inferno strategy guide](https://oldschool.runescape.wiki/w/Inferno/Strategies)
and cross-checked against the open-source Inferno Trainer simulator:

- **NPC "dumb" pathing** - NPCs step their south-west tile toward the player
  (diagonal first, then x, then y), do not path around obstacles, stack on top of
  each other behind pillars, and cannot end a step on the player's tile
  (including the corner-safespot diagonal rule).
- **Line of sight** - the fixed-point (16.16) ray-cast algorithm the game uses,
  including the quirk that ranged/magic NPC line of sight is traced from the
  *player's* tile to the NPC's nearest footprint tile.
- **Attack ranges and melee adjacency** - range is measured from the edge of the
  NPC's footprint; melee requires cardinal (never diagonal) adjacency.
- **Monster data** - Jal-MejRah (bat, 2x2, range 4), Jal-Ak (blob, 3x3, range 15),
  Jal-ImKot (meleer, 4x4), Jal-Xil (ranger, 3x3, range 15), Jal-Zek (mager, 4x4,
  range 15), with the blob's mechanic of reading your overhead exactly 3 ticks
  before it attacks and throwing the style you are *not* protecting against.
- **Waves** - the full wave composition table for waves 1-66 and the nine
  possible spawn locations.
- **Arena** - exact playable bounds and 3x3 pillar positions.

The engine is covered by a suite of unit tests (`npm test`) that pin down specific
verified behaviours, e.g. that a meleer spawning at the south-west spawn sticks on
the west side of the north pillar, or that a mager stops exactly at max range.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # vitest unit tests
npm run lint     # oxlint
npm run build    # typecheck + production build
```

CI (`.github/workflows/ci.yml`) lints, tests and builds every push and pull
request, and deploys to GitHub Pages on pushes to `main`.
