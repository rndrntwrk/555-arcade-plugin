# 555 Arcade — Operator Setup Matrix

## Minimum production setup

| Key | Required | Preferred value | Notes |
| --- | --- | --- | --- |
| `ARCADE555_BASE_URL` | Recommended | `https://555.rndrntwrk.com` | Primary arcade base URL |
| `ARCADE555_AGENT_API_KEY` | Preferred | `<secret>` | Preferred auth path |
| `ARCADE555_AGENT_TOKEN` | Fallback | `<secret>` | Static bearer fallback |
| `ARCADE555_REQUIRE_APPROVALS` | Yes | `true` | Keep enabled in production |

## Common additions

| Key | When to use |
| --- | --- |
| `ARCADE555_DEFAULT_SESSION_ID` | Reuse a stable session |
| `ARCADE555_GAMES_API_DIALECT` | Choose gameplay transport dialect |
| `ARCADE555_CF_CONNECT_TIMEOUT_MS` | Tune Cloudflare live gameplay waits |
| `ARCADE555_CF_CONNECT_POLL_MS` | Tune live-output polling |
| `ARCADE555_CF_RECOVERY_ATTEMPTS` | Tune bounded recovery attempts |

## Split-service overrides

Only use these when the deployment is actually split:
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

## Recommended profiles

### Public gameplay operator

```env
ARCADE555_BASE_URL=https://555.rndrntwrk.com
ARCADE555_AGENT_API_KEY=<agent-api-key>
ARCADE555_REQUIRE_APPROVALS=true
```

### Live gameplay operator

```env
ARCADE555_BASE_URL=https://555.rndrntwrk.com
ARCADE555_AGENT_API_KEY=<agent-api-key>
ARCADE555_DEFAULT_SESSION_ID=<session-id>
ARCADE555_GAMES_API_DIALECT=agent-v1
ARCADE555_REQUIRE_APPROVALS=true
```

### Shared stream + arcade operator

```env
ARCADE555_BASE_URL=https://555.rndrntwrk.com
STREAM555_AGENT_API_KEY=<shared-agent-api-key>
ARCADE555_REQUIRE_APPROVALS=true
```

## Role guidance

- read-only operators: auth, bootstrap, catalog, score read, leaderboard read, quests read
- live operators: add play/switch/stop and live gameplay
- admin operators: add quests create/complete, battles, rewards, social, theme/event/cabinet actions

Mastery actions are intentionally outside the default GA operator role.
