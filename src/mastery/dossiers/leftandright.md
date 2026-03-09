# leftandright Atomic Audit

## Audit Status
`audited`

## Controls And Input Semantics
- Left car toggle: `ArrowLeft`
- Right car toggle: `ArrowRight`
- Start / restart: `Space`

Source truth:
- `agent.js`
- runtime car sprites and lane constants
- `src/js/main.js`

Important semantic detail:
- failure is not just collectible choice
- commitment timing under cooldown is the real closure problem

## Lifecycle State Graph
- `MENU`
  - no live car sprites
- `PLAYING`
  - live left/right sprites
  - `!window.isGameOver`
- `GAME_OVER`
  - `window.isGameOver`

## Objective And Fail Semantics
- Primary objective: keep both cars alive while collecting viable collectibles and avoiding obstacles.
- Native progress signals:
  - score
  - survival time
  - live sprites
  - fail reasons
- Fail semantics:
  - `obstacle_hit`
  - `missed_collectible`
  - committed-too-early lane hold
  - cooldown-locked recovery failure

## Level / Room / Map Topology
- Endless four-lane stream.
- Left car controls lanes `A/B`.
- Right car controls lanes `C/D`.
- This is a timing/arbitration game, not a room graph.

## Native Metric Source Map
- score: `window.score`
- active cars: `window.left_sprite`, `window.right_sprite`
- stream entities: `window.sprites`
- fail reasons: runtime fail-reason hooks in `main.js`

## Current Controller Surface Available To Alice
- per-side lane scoring
- lane commitment diagnostics
- swap cooldown and decision-age tracing

## Exact Controller Design Required
- dual-car lane arbitration with stale-commit re-evaluation
- cooldown-aware invalidation handling
- required phases:
  - run bootstrap
  - lane-score evaluation
  - urgent collect decision
  - committed-lane hold
  - invalidation re-evaluation
  - restart recovery

## Exact Reason Current Controller Fails
Truthful fail reasons now show that `obstacle_hit` dominates. The current controller commits too early to an already-desired or urgent-collect lane, that lane invalidates while cooldown is still active, and the car dies before a new safe swap can execute.

## Exact Telemetry Additions Required
- commitment age
- first invalidation after commit
- cooldown-locked versus committed-too-early classification
- per-side lane score/risk/reward tail

## Bounded Smoke Gate
- must improve survival without score collapse
- must reduce obstacle-hit dominance
- must show better commitment timing in pre-death traces
- must not rely on broad cooldown hacks

## Blocking Subsystem
`lane_commitment_timing_and_invalidation_policy`
