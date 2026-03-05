# Operator Setup Matrix

## Minimum required

- API token with game/session scopes
- `ARCADE555_BASE_URL` or `STREAM555_BASE_URL`
- `ARCADE555_AGENT_TOKEN` or `STREAM555_AGENT_TOKEN`

## Recommended

- `ARCADE555_DEFAULT_SESSION_ID` for stable operator runs
- `ARCADE555_REQUIRE_APPROVALS=true` in production
- `ARCADE555_SCORE_CAPTURE_API_URL` when score capture is split from control-plane base
- `ARCADE555_LEADERBOARD_API_URL` when leaderboard service is split from control-plane base
- `ARCADE555_QUESTS_API_URL` when quests service is split from control-plane base
- `ARCADE555_BATTLES_API_URL` + `ARCADE555_BATTLES_CREATE_ENDPOINT` when battle create/read are split
- `ARCADE555_REWARDS_API_URL` when rewards projection/allocation service is split
- `ARCADE555_SOCIAL_API_URL` when social scoring service is split
- `ARCADE555_ADMIN_API_URL` + `ARCADE555_ADMIN_BEARER_TOKEN` when admin controls are split
- `ARCADE555_GITHUB_TOKEN` when GitHub repo listing is needed by operators

## Scope recommendations

- Read-only operators: catalog + state + score read + leaderboard read + quests read + battles read + rewards project + social monitor
- Live operators: add play/switch/stop + score submit
- Admin operators: add leaderboard write + quests create/complete + battles create/resolve + rewards allocate + social assign points + theme/event/cabinet admin actions, with approvals enabled
