# 555 Arcade — Actions Reference

This is the canonical public action list for `@rndrntwrk/plugin-555arcade`.

## Public guidance

- use `ARCADE555_*` action names in docs, UI, and agent prompts
- treat Alice-only mastery actions as advanced/non-GA
- treat legacy `FIVE55_*` aliases as migration-only surfaces

## Connection and session

| Action | Category | Purpose | Typical inputs | Public GA |
| --- | --- | --- | --- | --- |
| `ARCADE555_HEALTHCHECK` | Connection | Verify base API reachability | none | Yes |
| `ARCADE555_AUTH_VERIFY` | Connection | Verify auth/token viability | none | Yes |
| `ARCADE555_SESSION_BOOTSTRAP` | Session | Create or reuse a session | `sessionId` | Yes |

## Games

| Action | Category | Purpose | Typical inputs | Public GA |
| --- | --- | --- | --- | --- |
| `ARCADE555_GAMES_CATALOG` | Games | List playable games for the current environment | optional filters | Yes |
| `ARCADE555_GAMES_PLAY` | Games | Start a game in the current session | `gameId`, `mode` | Yes |
| `ARCADE555_GAMES_SWITCH` | Games | Switch from one game to another without ending the session | `gameId`, `mode` | Yes |
| `ARCADE555_GAMES_STOP` | Games | Stop the current game | optional `sessionId` | Yes |
| `ARCADE555_GAMES_GO_LIVE_PLAY` | Games/Live | Start gameplay and ensure Cloudflare-backed live output is provisioned | `gameId`, `mode`, `sessionId` | Yes |
| `ARCADE555_GAMES_LIVE_CAPABILITY_SPRINT` | Games/Diagnostics | Multi-slot diagnostic sprint across the catalog | sprint options | No, advanced diagnostic |

## Progression

| Action | Category | Purpose | Typical inputs | Public GA |
| --- | --- | --- | --- | --- |
| `ARCADE555_SCORE_READ` | Progress | Read current or recent score state | `gameId`, `sessionId`, `runId` | Yes |
| `ARCADE555_SCORE_SUBMIT` | Progress | Submit score/outcome data | score payload | Yes |
| `ARCADE555_LEADERBOARD_READ` | Progress | Read leaderboard state | `gameId`, ranking options | Yes |
| `ARCADE555_QUESTS_READ` | Progress | Read active or completed quests | filters | Yes |
| `ARCADE555_QUESTS_CREATE` | Progress | Create a quest | quest payload | Advanced |
| `ARCADE555_QUESTS_COMPLETE` | Progress | Complete or mark quest state | quest id/payload | Advanced |

## Advanced operators

| Action | Category | Purpose | Typical inputs | Public GA |
| --- | --- | --- | --- | --- |
| `ARCADE555_BATTLES_READ` | Battles | Read battle records | `status` | Advanced |
| `ARCADE555_BATTLES_CREATE` | Battles | Create a battle challenge | `gameId`, `targetId`, wager fields | Advanced |
| `ARCADE555_BATTLES_RESOLVE` | Battles | Resolve battle outcome | `battleId`, `winnerId` | Advanced |
| `ARCADE555_REWARDS_PROJECT` | Rewards | Read/project rewards state | filters | Advanced |
| `ARCADE555_REWARDS_ALLOCATE` | Rewards | Allocate rewards | reward payload | Advanced |
| `ARCADE555_SOCIAL_MONITOR` | Social | Read social/performance signals | filters | Advanced |
| `ARCADE555_SOCIAL_ASSIGN_POINTS` | Social | Assign social points | assignment payload | Advanced |
| `ARCADE555_THEME_SET` | Admin | Set the active platform theme | `theme` | Advanced |
| `ARCADE555_EVENT_TRIGGER` | Admin | Trigger a timed platform event | `type`, `durationMinutes` | Advanced |
| `ARCADE555_CABINET_POSSESS` | Admin | Possess an arcade cabinet/session | `gameId` or `cabinetId` | Advanced |
| `ARCADE555_CABINET_RELEASE` | Admin | Release a possessed cabinet/session | `cabinetId` or `gameId` | Advanced |
| `ARCADE555_GITHUB_LIST_REPOS` | GitHub | List configured repos for operator workflows | query options | Advanced |

## Alice-only / advanced mastery

These actions are intentionally not part of the default GA operator surface.

| Action | Purpose | Public GA |
| --- | --- | --- |
| `ARCADE555_MASTERY_BRIEF` | Produce a mastery brief for a game/run | No |
| `ARCADE555_MASTERY_CERTIFY` | Run mastery certification | No |
| `ARCADE555_MASTERY_STATUS` | Read mastery/cert state | No |
| `ARCADE555_MASTERY_VALIDATE` | Validate mastery evidence | No |
| `ARCADE555_MASTERY_EVIDENCE` | Read mastery evidence bundle | No |

## Compatibility

Legacy `FIVE55_*` aliases are available only when:
- `ARCADE555_ENABLE_LEGACY_ACTION_ALIASES=true`

Public docs should not depend on those aliases.

Direct leaderboard mutation is not part of the public plugin surface. Ranked public entries must flow through canonical score submission on `POST /game/{id}/record`.
