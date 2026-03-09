# playback Atomic Audit

## Audit Status
`audited`

## Controls And Input Semantics
- Movement: `Arrow keys` or `WASD`
- Jump: `J` or `Space`
- Object manipulation: `G` pick up, `B` drop, `T` throw, `I` insert, `K` eject
- Recorder transport: `P` play, `R` record, `[` rewind, `]` fast-forward
- Combat/action: `Enter` shoot

Source truth:
- `src/ts/common/inputs.ts`
- `agent.js` `actionMap` and `keyMap`

## Lifecycle State Graph
- `MENU`
  Enter when runtime is not fresh and `worldAge/localIndex` are effectively zero.
- `PLAYING`
  Enter when runtime hook is live, `worldAge` is advancing, and `playerEntity` exists.
- `PAUSED`
  Enter when overlay `#o` is visible during an otherwise live run.
- `GAME_OVER`
  Enter when `deathAge` is recent relative to `worldAge`.

## Objective And Fail Semantics
- Primary objective: solve the room graph by using recorder/tape/object interactions to leave the bootstrap room and continue room transitions.
- Native win/progress signals:
  - `roomTransitions`
  - `localIndex`
  - runtime `score`
- Fail semantics:
  - blank-state / boot false progress
  - start-room softlock
  - downstream room stall after bootstrap
  - death/restart loops without room transitions

## Level / Room / Map Topology
- `room.factory.ts` defines a `5 x 5` world.
- The game is room-graph based, not a single linear platform course.
- Current controller only has one explicit room-specific design:
  - start-room tape bootstrap
- After that it falls back to generic movement heuristics.

## Native Metric Source Map
- `worldAge`: `game.Oa`
- `localIndex`: `playerEntity.ea`
- `deathAge`: `playerEntity.pa`
- `roomCoords`: `game.fb`
- `room matrix`: `game.mb`
- Tape detection is controller-derived by scanning room entities where `V === 5`

## Current Controller Surface Available To Alice
- `agent.js` can call `setInput()` directly when runtime objects are available.
- Keyboard-event fallback exists.
- Runtime hook is installed by wrapping `Jb()` and sampling live game/player state.

## Exact Controller Design Required
- Replace generic post-bootstrap behavior with room-specific substates tied to actual room objectives.
- Required substates:
  - bootstrap room step approach / step jump / upper-platform traverse / far-right drop / floor pickup
  - bootstrap room insert / play continuation
  - per-room puzzle solver
  - room-transition confirmation
  - room softlock recovery

## Exact Reason Current Controller Fails
The current controller no longer fails for blank-state reasons. It now reaches the start-room right-side choke honestly, and source/runtime inspection shows there is no active `F` transfer platform in this room. The new setup metrics show the earlier and more important failure: during `START_ROOM_STEP_JUMP`, the controller never creates a valid single-surface grab setup at all. By the time the run reaches the crate/terrain corner, the samples are already in a contaminated multi-surface state or a too-late single-surface state. The blocker is therefore the pre-grab step-jump setup policy, not a missing platform or a generic hurdle-phase jump cadence. Because tape pickup still never happens, downstream room logic never begins.

## Exact Telemetry Additions Required
- native room-objective completion markers
- room-local puzzle state / objective markers
- room-specific softlock classification

## Bounded Smoke Gate
- must leave `MENU`
- must capture non-blank evidence
- must create a valid single-surface setup during `START_ROOM_STEP_JUMP`, then convert that into a crate/terrain grab window, reach the tape floor, and begin tape pickup
- must show `roomTransitions > 0`
- must show downstream room progress, not only bootstrap-room activity

## Blocking Subsystem
`start_room_step_jump_single_surface_setup_policy`
