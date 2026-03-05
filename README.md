# @rndrntwrk/plugin-555arcade

Unified 555 arcade plugin for Milaidy/elizaOS agents.

This package consolidates game control surfaces that were previously split across multiple `five55-*` bundled plugins.

## Features

- 3-step flow: authenticate -> bind session -> play
- Unified action namespace: `ARCADE555_*`
- Game launch lifecycle: catalog, play, switch, stop
- Canonical mastery namespace backed by the package-owned mastery engine and evidence store
- Score telemetry submission for leaderboard pipelines
- Service/providers model aligned with `@rndrntwrk/plugin-555stream`
- Legacy `FIVE55_*` env/action fallbacks for Release A-B migration safety

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
| `ARCADE555_SCORE_CAPTURE_API_URL` | Optional | Overrides score-capture API base (fallback: `FIVE55_SCORE_CAPTURE_API_URL`, then `ARCADE555_BASE_URL`) |
| `ARCADE555_LEADERBOARD_API_URL` | Optional | Overrides leaderboard API base (fallback: `FIVE55_LEADERBOARD_API_URL`, then `ARCADE555_BASE_URL`) |
| `ARCADE555_QUESTS_API_URL` | Optional | Overrides quests API base (fallback: `FIVE55_QUESTS_API_URL`, then `ARCADE555_BASE_URL`) |
| `ARCADE555_BATTLES_API_URL` | Optional | Overrides battles API base (fallback: `FIVE55_BATTLES_API_URL`, then `ARCADE555_BASE_URL`) |
| `ARCADE555_BATTLES_CREATE_ENDPOINT` | Optional | Overrides battles create endpoint (fallback: `FIVE55_BATTLES_CREATE_ENDPOINT`, default `/battle/create`) |
| `ARCADE555_REWARDS_API_URL` | Optional | Overrides rewards API base (fallback: `FIVE55_REWARDS_API_URL`, then `ARCADE555_BASE_URL`) |
| `ARCADE555_SOCIAL_API_URL` | Optional | Overrides social API base (fallback: `FIVE55_SOCIAL_API_URL`, then `ARCADE555_BASE_URL`) |
| `ARCADE555_ADMIN_API_URL` | Optional | Overrides admin API base (fallbacks include `FIVE55_ADMIN_API_URL`, legacy admin envs, then `ARCADE555_BASE_URL`) |
| `ARCADE555_ADMIN_BEARER_TOKEN` | Optional | Overrides admin auth token (fallbacks include `FIVE55_ADMIN_BEARER_TOKEN` and legacy admin token envs) |
| `ARCADE555_GITHUB_TOKEN` | Optional | GitHub token for repository listing action (fallbacks: `GITHUB_API_TOKEN`, `ALICE_GH_TOKEN`) |
| `ARCADE555_ENABLE_LEGACY_ACTION_ALIASES` | Optional | Release A-B compatibility switch for aliases like `FIVE55_GAMES_PLAY` |

## 3-step quickstart

1. `ARCADE555_HEALTHCHECK`
2. `ARCADE555_SESSION_BOOTSTRAP`
3. `ARCADE555_GAMES_CATALOG` then `ARCADE555_GAMES_PLAY`

Detailed setup:
- `docs/QUICKSTART_3_STEPS.md`
- `docs/OPERATOR_SETUP_MATRIX.md`
- `docs/MILAIDY_WEB_ACCESS.md`

## Actions (current)

- `ARCADE555_HEALTHCHECK`
- `ARCADE555_AUTH_VERIFY`
- `ARCADE555_SESSION_BOOTSTRAP`
- `ARCADE555_GAMES_CATALOG`
- `ARCADE555_GAMES_PLAY`
- `ARCADE555_GAMES_SWITCH`
- `ARCADE555_GAMES_STOP`
- `ARCADE555_MASTERY_BRIEF`
- `ARCADE555_MASTERY_CERTIFY`
- `ARCADE555_MASTERY_STATUS`
- `ARCADE555_MASTERY_VALIDATE`
- `ARCADE555_MASTERY_EVIDENCE`
- `ARCADE555_SCORE_READ`
- `ARCADE555_SCORE_SUBMIT`
- `ARCADE555_LEADERBOARD_READ`
- `ARCADE555_LEADERBOARD_WRITE`
- `ARCADE555_QUESTS_READ`
- `ARCADE555_QUESTS_CREATE`
- `ARCADE555_QUESTS_COMPLETE`
- `ARCADE555_BATTLES_READ`
- `ARCADE555_BATTLES_CREATE`
- `ARCADE555_BATTLES_RESOLVE`
- `ARCADE555_REWARDS_PROJECT`
- `ARCADE555_REWARDS_ALLOCATE`
- `ARCADE555_SOCIAL_MONITOR`
- `ARCADE555_SOCIAL_ASSIGN_POINTS`
- `ARCADE555_THEME_SET`
- `ARCADE555_EVENT_TRIGGER`
- `ARCADE555_CABINET_POSSESS`
- `ARCADE555_CABINET_RELEASE`
- `ARCADE555_GITHUB_LIST_REPOS`

## Compatibility note

This package is designed to coexist with legacy `FIVE55_*` actions during Releases A-B. Canonical cutover should be controlled by runtime flags in Milaidy, while legacy aliases remain opt-in compatibility surfaces only.

Mastery note:
Canonical mastery actions now execute against the package-owned mastery engine and migrate legacy run state from `MILADY_STATE_DIR/five55-mastery` into `MILADY_STATE_DIR/arcade555/mastery` on first access.
