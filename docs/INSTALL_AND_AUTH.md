# 555 Arcade — Install and Auth

This document defines the supported install and auth paths for public operators.

## Install

```bash
bun add @rndrntwrk/plugin-555arcade
```

```bash
npm install @rndrntwrk/plugin-555arcade
```

## Auth precedence

The plugin resolves auth in this order:

1. `ARCADE555_AGENT_API_KEY`
2. `ARCADE555_AGENT_TOKEN`
3. `STREAM555_AGENT_API_KEY`
4. `STREAM555_AGENT_TOKEN`
5. `STREAM_API_BEARER_TOKEN`

Recommended:
- use `ARCADE555_AGENT_API_KEY`

Fallbacks exist to reduce setup friction in combined stream + arcade deployments, but public operators should prefer arcade-owned auth when possible.

## Base URL precedence

1. `ARCADE555_BASE_URL`
2. `STREAM555_BASE_URL`

Public operators should not need to manage multiple base URLs unless they intentionally split advanced services.

## Minimal profiles

### Public gameplay operator

```env
ARCADE555_BASE_URL=https://555.rndrntwrk.com
ARCADE555_AGENT_API_KEY=<agent-api-key>
ARCADE555_REQUIRE_APPROVALS=true
```

### Stable-session operator

```env
ARCADE555_BASE_URL=https://555.rndrntwrk.com
ARCADE555_AGENT_API_KEY=<agent-api-key>
ARCADE555_DEFAULT_SESSION_ID=<session-id>
ARCADE555_REQUIRE_APPROVALS=true
```

### Shared stream + arcade auth

```env
ARCADE555_BASE_URL=https://555.rndrntwrk.com
STREAM555_AGENT_API_KEY=<shared-agent-api-key>
ARCADE555_REQUIRE_APPROVALS=true
```

## Core runtime controls

| Key | Purpose |
| --- | --- |
| `ARCADE555_DEFAULT_SESSION_ID` | preferred session to bind |
| `ARCADE555_REQUIRE_APPROVALS` | approval policy for mutating actions |
| `ARCADE555_GAMES_API_DIALECT` | gameplay transport dialect |
| `ARCADE555_CF_CONNECT_TIMEOUT_MS` | Cloudflare provisioning timeout |
| `ARCADE555_CF_CONNECT_POLL_MS` | Cloudflare poll interval |
| `ARCADE555_CF_RECOVERY_ATTEMPTS` | bounded recovery attempts |

## Optional split-service overrides

Use only when these services do not live behind the main base URL:

- `ARCADE555_SCORE_CAPTURE_API_URL`
- `ARCADE555_LEADERBOARD_API_URL`
- `ARCADE555_QUESTS_API_URL`
- `ARCADE555_BATTLES_API_URL`
- `ARCADE555_BATTLES_CREATE_ENDPOINT`
- `ARCADE555_REWARDS_API_URL`
- `ARCADE555_SOCIAL_API_URL`
- `ARCADE555_ADMIN_API_URL`
- `ARCADE555_ADMIN_BEARER_TOKEN`
- `ARCADE555_GITHUB_TOKEN`

These are advanced overrides, not part of the normal public setup path.

## Security rules

- do not commit API keys or bearer tokens
- keep approvals enabled in production
- only give admin/reward/social scopes to operators that actually need them
- keep mastery/intelligence surfaces out of general GA operators unless explicitly intended

## Milaidy behavior

In Milaidy:
- the default surface should be action-first
- operators should not see raw transport fallbacks in the primary path
- advanced service overrides belong in `Advanced`, not in the main setup flow

## Related docs

- `OPERATOR_SETUP_MATRIX.md`
- `MILAIDY_WEB_ACCESS.md`
