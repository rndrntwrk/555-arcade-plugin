# chesspursuit Atomic Audit

## Audit Status
`audited`

## Controls And Input Semantics
- Move: `Arrow keys` or mouse
- Start / restart: `Space` plus click bootstrap in the current adapter
- Pause / resume: `Enter`

Source truth:
- `src/index.html`
- `agent.js`
- exported runtime state on `window.__chessPursuitState`

## Lifecycle State Graph
- `MENU`
  - intro is active or player is missing
- `PLAYING`
  - player exists, game is not over, paused is false
- `PAUSED`
  - exported paused flag is true
- `GAME_OVER`
  - exported `gameIsOver` or legacy `vb` is true

## Objective And Fail Semantics
- Primary objective: move the king through the scrolling board while advancing row/checkpoint progress and avoiding chess-piece threat lines.
- Native progress signals:
  - `progressRow`
  - `checkpoint`
  - player row/col
- Fail semantics:
  - fatal threat violation
  - invalid move churn
  - static-board stall without row/checkpoint advancement
  - player row falling under the native progress threshold (`player.row < progress - 0.9`)
  - pause/menu false classification on a visible board

## Level / Room / Map Topology
- This is not a room graph.
- It is a scrolling board with fixed width `8`.
- Progress is board-relative:
  - row advancement
  - checkpoint cells
  - threat zones from piece movement patterns

## Native Metric Source Map
- player: `__chessPursuitState.player` or `window.Eb`
- board: `__chessPursuitState.board` or `window.zb`
- progress row: `__chessPursuitState.progress` or `window.xb`
- checkpoint count: `__chessPursuitState.checkpoint` or `window.rb`
- game over: `__chessPursuitState.gameIsOver` or `window.vb`
- pause and invalid move state:
  - `paused`
  - `playerInvalid`
  - `keysBlockedUntilAllUp`

## Current Controller Surface Available To Alice
- adapter has direct native board access
- adapter computes controller-side:
  - threats
  - safe moves
  - move priorities
- adapter can start with `Space` and click, and can pause with `Enter`

## Exact Controller Design Required
- deterministic pre-checkpoint route-target selection, then checkpoint-row conversion
- required phases:
  - intro bootstrap
  - legal-move scan
  - pre-checkpoint route-target selection
  - checkpoint advance
  - invalid-move recovery
  - static-board stall break

## Exact Reason Current Controller Fails
The current controller now reads the board and legality truthfully and no longer fails mainly from invalid-move churn. The retained planner patches also recover out of the row-cap seam and the worst opposite-edge flips. The remaining blocker is later and narrower: once the player reaches the source-backed wedge rows before checkpoint 1, the move-selection phase inside that wedge still does not hold the correct central conversion line long enough to capture checkpoint 1. The problem is now checkpoint-1 wedge-window move selection, not the earlier generic edge-route bias or seam survival.

## Exact Telemetry Additions Required
- pre-checkpoint reset counts:
  - `gameOverCount`
  - `menuReentryCountAfterPlaying`
  - `restartCount`
- furthest-row tracking:
  - `furthestProgressRow`
  - `furthestPlayerRow`
  - `lifeMaxProgressRow`
  - `lifeMaxPlayerRow`
- split checkpoint distance metrics:
  - `playerCheckpointDistanceRows`
  - `nextCheckpointDistanceRows`
- native loss-threshold margin:
  - `fellBehindThresholdRow`
  - `progressLagMargin`
- retain invalid-move cause classification and `checkCount`
- expose pre-checkpoint route-state diagnostics:
  - `pawnBandCurrentRowPawns`
  - `pawnBandRowPlus2Pawns`
  - `pawnBandRightCurrentPawns`
  - `pawnBandRightPlus2Pawns`
  - `edgeSlalomDirection`
  - `edgeSlalomTargetCol`
  - `edgeSlalomCurrentRowPawns`
  - `edgeSlalomRowPlus2Pawns`
  - `edgeSlalomRowPlus4Pawns`

## Bounded Smoke Gate
- must leave `MENU`
- must show `progressRow` increase
- must materially close `nextCheckpointDistanceRows`
- must keep a justified, non-oscillating pre-checkpoint route target long enough to convert checkpoint 1
- must ultimately convert that into native `checkpoint` advancement before reset
- must not pass on a static or legality-only board with no checkpoint attainment

## Blocking Subsystem
`checkpoint1_wedge_window_move_selection_policy`
