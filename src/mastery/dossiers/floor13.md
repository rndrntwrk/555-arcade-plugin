# floor13 Atomic Audit

## Audit Status
`audited`

## Controls And Input Semantics
- Move: `Arrow keys`
- Fire: `X`
- Reload: `C`
- Pick / exit advance: `V`
- Retry / start: `Space`

Source truth:
- `src/game/systems/keyboardcontrolsystem.js`
- `agent.js`
- `src/engine/input.js`

Important semantic detail:
- advancing to the next floor is not a separate action
- it is `exit bounds overlap` plus `V`

## Lifecycle State Graph
- `MENU`: root screen class `t`
- `PLAYING`: active floor loop, screen class not `t/f/w`, `__level` defined
- `GAME_OVER`: root screen class `f`
- `WIN`: root screen class `w`

## Objective And Fail Semantics
- Primary objective: survive combat, manage ammo and loot, reach the exit, overlap it, and press `V` to trigger `nextLevel()`.
- Native progress signals:
  - `__level`
  - `__PW_LEVELS`
  - hero HP
  - weapon ammo
  - exit position / overlap
- Fail semantics:
  - death before exit
  - ammo starvation
  - deadlock near doors or exit
  - movement near exit without real overlap

## Level / Room / Map Topology
- Floor-based dungeon loop with up to `13` floors.
- Uses tile-grid navigation with doors registered into A* walkability.
- One exit per floor.
- Loot and enemy pressure affect whether the exit path is actually reachable.

## Native Metric Source Map
- floor progression: `window.__level`, `window.__PW_LEVELS`
- player spatial state: `TAG_PLAYER -> Position / Bounds`
- exit spatial state: `TAG_EXIT -> Position / Bounds`
- health: `Health.h`
- weapon ammo/capacity: `Weapon.b`, `Weapon.bs`
- doors: `GROUP_DOORS`
- walkability influence: `DoorSystem` writes doors into A* walkability

## Current Controller Surface Available To Alice
- engine-level key-state injection now exists via `Input.setKeyState()`
- DOM keyboard fallback still exists
- adapter can inspect player, exit, doors, health, weapon, and dungeon state directly

## Exact Controller Design Required
- floor-specific approach planner with these phases:
  - spawn recovery
  - combat stabilize
  - door-chain route
  - late coarse-only threat suppression
  - fallback replan / local-stage recovery
  - exit overlap confirmation
  - `V` trigger only after overlap
- route behavior must preserve door-chain movement until the attack/standoff tile is actually reached, then recover cleanly once the unusable late coarse-only door plan is suppressed
- once the run is in the finish corridor, the controller must make door-vs-exit precedence explicit:
  - convert to exit-first routing when door pressure no longer dominates
  - drop stale late door targets and acquire a fallback route
  - or classify the near-exit planner conflict explicitly
- same-tile threat collapse remains secondary; the seeded late blocker now happens after the run is already deep in the exit corridor
- add local deadlock classification:
  - coarse-only door target retained with unreachable first step
  - exact-path late door detour still winning over exit conversion
  - missing target-drop / fallback route after the planner conflict is detected
  - exit rect-overlap still unreachable after late planner recovery fails

## Exact Reason Current Controller Fails
Input is no longer the blocker. The retained late-coarse dead-end rejection patch already moved the run past the old attack-tile staging failure, and the finish-corridor recovery patch now prevents the bot from freezing on a live-invalid head tile. On the audited retained runs the controller drops `doorTarget`, hands off into `direct_exit_path`, and keeps moving through the finish corridor honestly. The remaining blocker is the rect-overlap completion itself: the player still has native `Bounds`, the exit still has native `Bounds`, and the bot still never produces `exitOverlap=true`, so the floor never clears. The real fix is finish-corridor rect-overlap completion, not another input tweak, door-fire tweak, or generic near-exit drive patch.

## Exact Telemetry Additions Required
- reason late door targets still win over exit conversion in the finish corridor
- whether the planner prefers exact-path or coarse-only door attack plans once exit proximity is high
- door-target drop or exit-fallback handoff after late door-vs-exit conflict is detected
- finish-corridor handoff from late door planning into `direct_exit_path`
- final path-head versus resolved-step behavior while `doorTarget=null`
- last-tile oscillation versus real `exitOverlap` conversion
- whether the final adjacent state is valid-but-non-overlapping or truly blocked
- player/exit `Bounds` presence and rect source at the claim moment

## Bounded Smoke Gate
- must leave `MENU`
- must show real movement and combat/loot interaction
- must show at least one real late door-chain route commitment before the finish-corridor planner conflict
- must show the door-target drop and handoff into `direct_exit_path`
- must show either real rect-overlap conversion or the classified non-overlap state

## Blocking Subsystem
`finish_corridor_rect_overlap_completion_policy`
