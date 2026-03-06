# 555 Arcade — 3-Step Quickstart

Use this when you need the shortest possible operator runbook.

## Step 1 — Authenticate

Run:
- `ARCADE555_HEALTHCHECK`
- `ARCADE555_AUTH_VERIFY`

## Step 2 — Bootstrap session

Run:
- `ARCADE555_SESSION_BOOTSTRAP`

Expected:
- a reusable session is bound

## Step 3 — Play

Run:
- `ARCADE555_GAMES_CATALOG`
- `ARCADE555_GAMES_PLAY`

Optional next actions:
- `ARCADE555_GAMES_SWITCH`
- `ARCADE555_GAMES_STOP`
- `ARCADE555_SCORE_READ`
- `ARCADE555_LEADERBOARD_READ`
- `ARCADE555_QUESTS_READ`

For live gameplay:
- `ARCADE555_GAMES_GO_LIVE_PLAY`

## Full docs

- `GET_STARTED.md`
- `INSTALL_AND_AUTH.md`
