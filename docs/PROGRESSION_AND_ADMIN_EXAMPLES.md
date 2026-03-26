# Progression And Admin Examples

Use this document when you need concrete examples for the progression and
advanced/admin surfaces that sit beyond the default play loop.

## Default operator flow

Default operator flow should remain:

1. bootstrap session
2. fetch catalog
3. start or switch game
4. read score and leaderboard state
5. stop safely

This is the path to teach first.

## Progression examples

### Example 1: Read score after a run

Action:
- `ARCADE555_SCORE_READ`

Typical inputs:
- `gameId`
- `sessionId`
- optional `runId`

Use when:
- a run just ended
- an operator needs to confirm whether a score synced
- support needs to inspect one specific play session

### Example 2: Submit score when the flow requires explicit submission

Action:
- `ARCADE555_SCORE_SUBMIT`

Typical inputs:
- `gameId`
- `sessionId`
- score or outcome payload expected by the current game/runtime contract

Use when:
- the current title does not auto-sync a result
- the operator is closing a bounded run and needs the canonical record written

### Example 3: Read leaderboard and quest state without mutating anything

Actions:
- `ARCADE555_LEADERBOARD_READ`
- `ARCADE555_QUESTS_READ`

Typical uses:
- confirm whether a score changed rank
- explain current progression state to a player
- confirm quest eligibility before using any admin surface

## Recommended progression sequence

1. `ARCADE555_SCORE_READ`
2. `ARCADE555_LEADERBOARD_READ`
3. `ARCADE555_QUESTS_READ`
4. `ARCADE555_SCORE_SUBMIT` only when the game/runtime requires an explicit
   write

The operator should exhaust the read path before using a write path.

## Advanced/admin guidance

Advanced and admin actions should be introduced only after the default operator
path is stable.

### Example 4: Manage session continuity across a game switch

Actions:
- `ARCADE555_GAMES_SWITCH`
- `ARCADE555_SCORE_READ`

Use when:
- one operator session spans more than one title
- the next title should inherit the current live/operator context

Check after the switch:
- the new `gameId` is active
- the prior game's score state is settled
- leaderboard reads still resolve against the intended game

### Example 5: Work a battle or reward path

Actions:
- `ARCADE555_BATTLES_CREATE`
- `ARCADE555_BATTLES_RESOLVE`
- `ARCADE555_REWARDS_PROJECT`
- `ARCADE555_REWARDS_ALLOCATE`

Use when:
- the flow is no longer simple single-player progression
- the operator is running a competitive or rewards-backed event

Rule:
- do not introduce these actions into beginner docs
- always pair them with the recovery/cleanup expectation for the event

### Example 6: Use admin-only intervention surfaces

Actions:
- `ARCADE555_THEME_SET`
- `ARCADE555_EVENT_TRIGGER`
- `ARCADE555_CABINET_POSSESS`
- `ARCADE555_CABINET_RELEASE`

Use when:
- the default public flow cannot recover itself
- an event, theme, or cabinet state needs operator intervention

Admin rule:
- explain why the intervention is needed
- confirm the platform returns to the normal default flow afterward

## Documentation rule

- beginner/operator docs teach the default flow
- advanced/admin docs teach exceptions, intervention, and recovery
- do not collapse both layers into one checklist
- if an example requires a non-GA or advanced action, label it as advanced
