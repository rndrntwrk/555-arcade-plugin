# Operator Setup Matrix

## Minimum required

- API token with game/session scopes
- `ARCADE555_BASE_URL` or `STREAM555_BASE_URL`
- `ARCADE555_AGENT_TOKEN` or `STREAM555_AGENT_TOKEN`

## Recommended

- `ARCADE555_DEFAULT_SESSION_ID` for stable operator runs
- `ARCADE555_REQUIRE_APPROVALS=true` in production

## Scope recommendations

- Read-only operators: catalog + state + leaderboard read
- Live operators: add play/switch/stop + score submit
- Admin operators: add quests/battles/rewards once those actions are enabled in later versions

