# where-were-going-we-do-need-roads Atomic Audit

## Audit Status
`audited`

## Controls And Input Semantics
- Start: start button / runtime `start()`
- Reset: reset button
- Road shaping: pointer drag

Source truth:
- `agent.js`
- `index.html`
- runtime pointer and player state

Important semantic detail:
- the controller shapes the road ahead of the car; this is not discrete lane switching

## Lifecycle State Graph
- `MENU`
  - home visible or runtime missing
- `PLAYING`
  - runtime present and end screen hidden
- `GAME_OVER`
  - end visible or `window.gameOver`

## Objective And Fail Semantics
- Primary objective: maximize distance while keeping the car out of danger bands with valid road geometry.
- Native progress signals:
  - distance
  - player position / velocity
  - danger bands ahead
- Fail semantics:
  - hazard collision
  - pointer drift into danger bands
  - buried / invalid road geometry
  - conservative shaping that never reaches mastery distance

## Level / Room / Map Topology
- Endless column stream with ahead-of-car danger windows.
- No discrete rooms or levels.
- Mastery is a pacing and geometry problem.

## Native Metric Source Map
- distance: `window.G.distance` or `window.distance`
- player: `window.G.player`
- danger bands: `getColumn(x).danger`
- pointer target: runtime pointer state

## Current Controller Surface Available To Alice
- ahead-of-car lookahead
- pointer target selection
- geometry validity diagnostics

## Exact Controller Design Required
- valid-road-geometry plus distance-pacing controller
- required phases:
  - bootstrap
  - lookahead danger scan
  - safe path shaping
  - distance pacing
  - restart recovery

## Exact Reason Current Controller Fails
Runtime corruption and invalid-placement false signals were fixed. The retained controller now keeps invalid placement at zero honestly and improves real distance, but it still drives too conservatively to hit the mastery bar. The blocker is distance pacing under valid geometry.

## Exact Telemetry Additions Required
- lookahead band choice versus chosen pointer target
- distance pacing trend with still-zero invalid placements
- repeated over-conservative height choices
- player trajectory versus predicted danger bands

## Bounded Smoke Gate
- must keep valid geometry
- must materially improve distance
- must not trade speed for hidden invalid placement

## Blocking Subsystem
`valid_road_geometry_distance_pacing_policy`
