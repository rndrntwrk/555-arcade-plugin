---
name: "555 Arcade Operator Skill"
description: "Run the canonical 555 Arcade operator flow: verify, bootstrap, catalog, play, switch, progress, and stop."
metadata:
  {
    "audience": ["operator", "agent"],
    "plugin": "@rndrntwrk/plugin-555arcade",
    "surface": "public-preview",
  }
---

# 555 Arcade Operator Skill

Use this skill when the agent needs to operate the canonical `555 Arcade` plugin without drifting back into fragmented `five55-*` behavior.

## When to use

- arcade auth/session verification
- catalog fetch
- play/switch/stop
- score, leaderboard, or quest reads
- live gameplay through the arcade plugin
- ecosystem docs live at `https://docs.rndrntwrk.com/arcade/overview`

## Primary workflow

1. `ARCADE555_HEALTHCHECK`
2. `ARCADE555_AUTH_VERIFY`
3. `ARCADE555_SESSION_BOOTSTRAP`
4. `ARCADE555_GAMES_CATALOG`
5. `ARCADE555_GAMES_PLAY` or `ARCADE555_GAMES_GO_LIVE_PLAY`
6. `ARCADE555_GAMES_SWITCH` when moving to another game
7. progression actions as needed
8. `ARCADE555_GAMES_STOP`

Example payloads:

```json
{"sessionId":"session_123"}
```

```json
{"gameId":"knighthood","mode":"agent"}
```

## Rules

- prefer deterministic parameters: `sessionId`, `gameId`, `mode`
- use `ARCADE555_GAMES_SWITCH` instead of stop+play where possible
- treat score submission as replay-safe per run/checkpoint
- keep mastery actions out of the default operator flow unless the task explicitly requires advanced Alice-only certification work
- treat battles, rewards, social, admin, and GitHub helpers as advanced surfaces, not first-run setup

## Recovery

- if catalog is empty, stop and verify auth/base URL/dialect
- if switch fails, retry once, then fall back to play
- if live gameplay reports missing output, use `ARCADE555_GAMES_GO_LIVE_PLAY`

## Operator vs agent usage

- Operators should use this skill to bootstrap, play, switch, and inspect progression state.
- Agents should keep payloads narrow and deterministic, and should avoid Alice-only mastery actions unless explicitly instructed.
- Public guidance should use `ARCADE555_*` names only; `FIVE55_*` aliases are migration-only.
