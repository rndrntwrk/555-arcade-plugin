# vedas-run Atomic Audit

## Audit Status
`audited`

## Controls And Input Semantics
- Horizontal movement: `Arrow Left`, `Arrow Right`
- Jump: `Space`
- Restart: `1`
- Start: start button / `game.startLoop()` bootstrap

Source truth:
- `README.md`
- `agent.js`
- `src/app/game.js`
- `src/app/ui.js`

## Lifecycle State Graph
- `MENU`
  - `window.gs` missing
  - or `gs.isRunning` false
  - or `gs.status !== 2`
- `PLAYING`
  - `gs.isRunning` true
  - `gs.status === 2`
- `GAME_OVER`
  - `gs.status === 3`
  - `window.G.h === 2`
  - `lastEndReason` / `lastEndType` set

## Objective And Fail Semantics
- Primary objective: progress through the segment chain, survive gaps and turret pressure, and reach the intended ending path.
- Native progress signals:
  - `tz`
  - `segment`
  - `progressRow`
  - `lastEndReason`
  - `lastEndType`
- Fail semantics:
  - `fell_off_platform`
  - terminal ending branches `1` / `2`
  - hazard death or wrong ending path
  - segment stall with repeated restart

## Level / Room / Map Topology
- Runner topology, not room-based.
- Segment progression is defined by:
  - `segment = floor(absoluteTz / segmentLength)`
- There are multiple endings, including a secret ending path.
- Late-game state changes around the omega/boss sequence.

## Native Metric Source Map
- `tz`, `iy`, `map`, `plane`, `objects`: `window.gs`
- segment and local segment row: derived directly from native `tz`, `plane.segmentLength`, `plane.gsH`
- end reasons / end types:
  - `gs.lastEndReason`
  - `window.G.lastEndReason`
  - `state.lastEndType`
- hazard metrics:
  - `objects`
  - `player.health`

## Current Controller Surface Available To Alice
- direct key holding and tap control from `agent.js`
- restart via native `1`
- current controller already derives:
  - lane score
  - gap distance
  - solid run length
  - segment/progress row

## Exact Controller Design Required
- scripted jump-window policy plus deterministic continuity through:
  - the segment-0 immediate center-gap takeoff
  - the early segment-1 long-jump setup
  - the held center-lane long jump across the first 3-row gap
  - the immediate post-gap recovery after that jump
  - the segment-2 random-platform continuity band
- required phases:
  - intro bootstrap
  - scripted jump windows
  - early segment stabilization
  - hazard-specific lane/jump timing
  - ending branch control
  - restart recovery

## Exact Reason Current Controller Fails
The current root controller now clears the old first seam honestly. Source review plus truthful smoke shows the stable ceiling has moved later: segment 0 immediate-gap carry works, the early segment-1 held long jump works, and the run now reaches segment 2 with progress rows in the mid-20s. The remaining blocker is the segment-2 random-platform band, where control falls back to coarse lane scoring and loses deterministic continuity. The missing policy is no longer the segment-0 to segment-1 jump chain; it is the source-backed segment-2 random-platform continuity controller after post-gap recovery.

## Exact Telemetry Additions Required
- scripted jump-window id / delta / hold hint
- segment continuity phase around:
  - segment-0 immediate-gap takeoff
  - segment-1 long-jump setup
  - segment-1 held long jump
  - segment-1 post-gap recovery
- segment-2 random-platform continuity phase / target lane class
- segment-local hazard topology markers
- ending-branch intent
- per-segment control-surface coverage

## Bounded Smoke Gate
- must leave `MENU`
- must show native segment progression
- must show segment-0 immediate-gap coverage plus held long-jump coverage through the tz≈730 seam
- must show deterministic continuity beyond the first segment-2 random-platform band
- must classify end states by `lastEndReason` / `lastEndType`

## Blocking Subsystem
`segment2_random_platform_continuity_policy`
