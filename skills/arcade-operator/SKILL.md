---
name: "555 Arcade Operator Skill"
description: "Run the canonical 555 Arcade operator flow: verify, bootstrap, catalog, play, switch, progress, and stop."
---

# 555 Arcade Operator Skill

Use this skill when the agent needs to operate the canonical `555 Arcade` plugin without drifting back into fragmented `five55-*` behavior.

## When to use

- arcade auth/session verification
- catalog fetch
- play/switch/stop
- score, leaderboard, or quest reads
- live gameplay through the arcade plugin

## Primary workflow

1. `ARCADE555_HEALTHCHECK`
2. `ARCADE555_AUTH_VERIFY`
3. `ARCADE555_SESSION_BOOTSTRAP`
4. `ARCADE555_GAMES_CATALOG`
5. `ARCADE555_GAMES_PLAY` or `ARCADE555_GAMES_GO_LIVE_PLAY`
6. `ARCADE555_GAMES_SWITCH` when moving to another game
7. progression actions as needed
8. `ARCADE555_GAMES_STOP`

## Rules

- prefer deterministic parameters: `sessionId`, `gameId`, `mode`
- use `ARCADE555_GAMES_SWITCH` instead of stop+play where possible
- treat score submission as replay-safe per run/checkpoint
- keep mastery actions out of the default operator flow unless the task explicitly requires advanced Alice-only certification work

## Recovery

- if catalog is empty, stop and verify auth/base URL/dialect
- if switch fails, retry once, then fall back to play
- if live gameplay reports missing output, use `ARCADE555_GAMES_GO_LIVE_PLAY`
