# clawstrike Atomic Audit

## Audit Status
`audited`

## Controls And Input Semantics
- Move: `ArrowLeft / ArrowRight`
- Jump: `ArrowUp`
- Roll: `ArrowDown`
- Attack / menu bootstrap: `Space`
- Retry: `R`

Source truth:
- `agent.js`
- `index.html` gameplay loop

Important semantic detail:
- level advancement is native and tied to clearing all `human` enemies on the current gameplay screen

## Lifecycle State Graph
- `MENU`
  - `MainMenuScreen`
- `PLAYING`
  - `GameplayScreen`
- `GAME_OVER`
  - `GameOverScreen` or `FullGameOverScreen`
- `WIN`
  - `GameCompleteScreen`

## Objective And Fail Semantics
- Primary objective: clear sequential combat levels by killing each room's enemies fast enough to advance `runLevelIndex`.
- Native progress signals:
  - `runLevelIndex`
  - `runDeaths`
  - `runTime`
  - live enemy count
- Fail semantics:
  - enemy count never collapses
  - death loop
  - final enemy not converted
  - ambiguous clear/death screen handling

## Level / Room / Map Topology
- Sequential ALL_LEVELS run.
- Mix of horizontal and vertical combat rooms.
- Hazards vary by level family.

## Native Metric Source Map
- level progression: `window.G.runLevelIndex`
- deaths/time: `window.G.runDeaths`, `window.G.runTime`
- enemy counts: `GameplayScreen.world.category('human')`
- hazards and level shape: source-backed level metadata in `agent.js`

## Current Controller Surface Available To Alice
- tactical enemy scan
- navigation grid
- combat spacing / engage risk policy
- finisher behavior

## Exact Controller Design Required
- combat-throughput-first controller
- level-clear confirmation from native enemy-count collapse
- required phases:
  - bootstrap
  - enemy scan
  - spacing and approach
  - finisher conversion
  - hazard recovery
  - level-clear confirm
  - retry recovery

## Exact Reason Current Controller Fails
The retained finisher patch proves the controller can clear the first fight and reach level 1 honestly. The remaining blocker is combat throughput and level-clear conversion deeper in the run: enemies stay alive too long, final-enemy closure is inconsistent, and `runLevelIndex` never reaches the required mastery bar.

## Exact Telemetry Additions Required
- native enemy-count transitions
- clear-versus-death screen classification
- last-enemy finisher timing
- hazard-driven attack suppression traces

## Bounded Smoke Gate
- must clear the first level honestly
- must show native enemy-count collapse
- must raise `runLevelIndex` through real clears
- survival without level conversion does not count

## Blocking Subsystem
`combat_throughput_and_level_clear_policy`
