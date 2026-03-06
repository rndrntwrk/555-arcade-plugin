# 555 Arcade — Get Started

This is the shortest correct path to a working arcade operator setup.

## Goal

Get an agent from:
- plugin installed
- authenticated
- session bootstrapped
- catalog visible
- game running
- score/progression observable

## Prerequisites

- Milaidy or elizaOS host with `@rndrntwrk/plugin-555arcade` installed
- one of:
  - `ARCADE555_AGENT_API_KEY` preferred
  - `ARCADE555_AGENT_TOKEN` fallback
  - shared stream auth fallback when arcade-specific auth is not present

## Step 1 — Install and enable

Add the plugin to the character/runtime:

```json
{
  "plugins": [
    "@elizaos/plugin-bootstrap",
    "@rndrntwrk/plugin-555arcade"
  ]
}
```

Expected result:
- plugin card shows `Installed`
- plugin card shows `Enabled`

## Step 2 — Verify auth and bootstrap the session

Run:
1. `ARCADE555_HEALTHCHECK`
2. `ARCADE555_AUTH_VERIFY`
3. `ARCADE555_SESSION_BOOTSTRAP`

Expected result:
- auth is valid
- session is created or rebound

## Step 3 — Fetch the catalog

Run:
- `ARCADE555_GAMES_CATALOG`

Expected result:
- one or more game IDs are returned

If the catalog is empty, do not continue into play/switch actions.

## Step 4 — Start gameplay

Normal gameplay:
- `ARCADE555_GAMES_PLAY`

Live gameplay through Cloudflare/stream path:
- `ARCADE555_GAMES_GO_LIVE_PLAY`

If a game is already running and you want to move to another one:
- `ARCADE555_GAMES_SWITCH`

To end the current game:
- `ARCADE555_GAMES_STOP`

## Step 5 — Read progression

Common progression actions:
- `ARCADE555_SCORE_READ`
- `ARCADE555_SCORE_SUBMIT`
- `ARCADE555_LEADERBOARD_READ`
- `ARCADE555_QUESTS_READ`

## Step 6 — Stop cleanly

Run:
- `ARCADE555_GAMES_STOP`

If the stream is also live through `555 Stream`, stop the stream from that plugin after gameplay has ended.

## Good defaults

- keep `ARCADE555_REQUIRE_APPROVALS=true`
- prefer `agent-v1` dialect unless there is a specific compatibility reason not to
- use explicit `gameId`
- use explicit `sessionId` when you want stable session continuity

## Next docs

- `INSTALL_AND_AUTH.md`
- `ACTIONS_REFERENCE.md`
- `EDGE_CASES_AND_RECOVERY.md`
