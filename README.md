# @rndrntwrk/plugin-555arcade

Unified 555 arcade plugin for Milaidy/elizaOS agents.

This package consolidates game control surfaces that were previously split across multiple `five55-*` bundled plugins.

## Features

- 3-step flow: authenticate -> bind session -> play
- Unified action namespace: `ARCADE555_*`
- Game launch lifecycle: catalog, play, switch, stop
- Score telemetry submission for leaderboard pipelines
- Service/providers model aligned with `@rndrntwrk/plugin-555stream`
- Config fallback to `STREAM555_*` for migration safety

## Install

```bash
bun add @rndrntwrk/plugin-555arcade
```

## Required env

| Variable | Required | Notes |
| --- | --- | --- |
| `ARCADE555_BASE_URL` | Recommended | Falls back to `STREAM555_BASE_URL` |
| `ARCADE555_AGENT_TOKEN` | Recommended | Falls back to `STREAM555_AGENT_TOKEN` |
| `ARCADE555_DEFAULT_SESSION_ID` | Optional | Auto-bind session |
| `ARCADE555_REQUIRE_APPROVALS` | Optional | Defaults to `true` |
| `ARCADE555_ENABLE_LEGACY_ACTION_ALIASES` | Optional | Set to `true` to expose compatibility aliases like `FIVE55_GAMES_PLAY` |

## 3-step quickstart

1. `ARCADE555_HEALTHCHECK`
2. `ARCADE555_SESSION_BOOTSTRAP`
3. `ARCADE555_GAMES_CATALOG` then `ARCADE555_GAMES_PLAY`

Detailed setup:
- `docs/QUICKSTART_3_STEPS.md`
- `docs/OPERATOR_SETUP_MATRIX.md`
- `docs/MILAIDY_WEB_ACCESS.md`

## Actions (initial v0.1)

- `ARCADE555_HEALTHCHECK`
- `ARCADE555_AUTH_VERIFY`
- `ARCADE555_SESSION_BOOTSTRAP`
- `ARCADE555_GAMES_CATALOG`
- `ARCADE555_GAMES_PLAY`
- `ARCADE555_GAMES_SWITCH`
- `ARCADE555_GAMES_STOP`
- `ARCADE555_SCORE_SUBMIT`

## Compatibility note

This package is designed to coexist with legacy `FIVE55_*` actions during migration. Canonical cutover should be controlled by runtime flags in Milaidy.
Set `ARCADE555_ENABLE_LEGACY_ACTION_ALIASES=true` only when legacy bundled game plugins are suppressed.
