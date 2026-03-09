# ninja Atomic Audit

## Audit Status
`audited`

## Controls And Input Semantics
- Move: `ArrowLeft / ArrowRight`
- Jump: `Space`
- Retry: `R`

Source truth:
- `agent.js`
- runtime key handlers

Important semantic detail:
- mastery progression is real only when runtime level state advances
- controller-derived score is quality-only, not the progression authority

## Lifecycle State Graph
- `MENU`
  - `!G.aA`
  - no playable level/player state
- `PLAYING`
  - `G.aA`
  - `level.cs`
  - `!level.bx`
- `GAME_OVER`
  - `level.bx` or `level.dZ`

## Objective And Fail Semantics
- Primary objective: clear fixed stealth-platform levels by following real geometry to the exit.
- Native progress signals:
  - `level._a`
  - player position / velocity
  - exit coordinates
  - tile matrix
- Fail semantics:
  - death / retry
  - wall-cling loop
  - chamber / roof-gap stall
  - non-runtime progression path

## Level / Room / Map Topology
- Ordered fixed level chain with embedded source-backed matrix data.
- Level 0 is the active closure blocker.
- Later levels are irrelevant until level 0 closes honestly.

## Native Metric Source Map
- level progression: `level._a`
- player state: `level._H`
- tile grid: `level.S._C`
- exit coordinates: `level.S.am`
- enemy set: `level._V`

## Current Controller Surface Available To Alice
- direct runtime level, matrix, player, exit, and enemy inspection
- embedded route knowledge sourced from game code
- route/state diagnostics from the adapter

## Exact Controller Design Required
- deterministic level-0 runtime-gap controller first
- then per-level route policies
- required phases:
  - menu bootstrap
  - chamber ascent
  - roof-gap approach
  - top-corridor closure
  - exit intercept
  - retry recovery

## Exact Reason Current Controller Fails
The controller now reaches the real level-0 chamber honestly, but it still does not convert that state into a stable roof-gap and top-corridor closure. The stable blocker is the level-0 runtime-gap transition policy. Until that seam closes, level 8 mastery is not a real target.

## Exact Telemetry Additions Required
- runtime-gap route substates
- chamber and roof-gap promotion state
- best waypoint progression through the level-0 seam
- explicit proof that no synthetic level advancement path fired

## Bounded Smoke Gate
- must leave `MENU`
- must reach the level-0 chamber
- must progress through roof-gap / top-corridor substates
- must produce real runtime level advancement
- must not pass on chamber entry alone

## Blocking Subsystem
`level0_runtime_gap_transition_policy`
