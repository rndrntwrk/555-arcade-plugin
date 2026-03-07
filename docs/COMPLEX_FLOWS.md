# 555 Arcade — Complex Flows

This document covers the non-trivial operator flows that matter for public use.

## 1. Combined stream + arcade live gameplay

Use when gameplay must go live through the canonical Cloudflare-backed path.

1. `ARCADE555_SESSION_BOOTSTRAP`
2. `ARCADE555_GAMES_GO_LIVE_PLAY`
3. confirm live state through `555 Stream`
4. switch games with `ARCADE555_GAMES_SWITCH`
5. stop gameplay with `ARCADE555_GAMES_STOP`
6. stop the stream from `555 Stream`

Rules:
- do not use a raw website stream when the requirement is live gameplay through the arcade control surface
- session continuity matters; use explicit `sessionId` when you need deterministic reuse

## 2. Catalog → play → switch → stop

1. `ARCADE555_GAMES_CATALOG`
2. `ARCADE555_GAMES_PLAY`
3. `ARCADE555_GAMES_SWITCH`
4. `ARCADE555_GAMES_STOP`

Preferred behavior:
- switch in-place rather than stop/start when you can

## 3. Score + leaderboard loop

1. `ARCADE555_SCORE_READ`
2. `ARCADE555_SCORE_SUBMIT`
3. `ARCADE555_LEADERBOARD_READ`

Rules:
- treat score submission as replay-safe and run-aware
- do not mutate leaderboard state from the public plugin surface; ranked writes must flow through canonical score submission

## 4. Quest lifecycle

1. `ARCADE555_QUESTS_READ`
2. optional `ARCADE555_QUESTS_CREATE`
3. `ARCADE555_QUESTS_COMPLETE`

Default public operators normally only need read visibility.

## 5. Battle/reward/social/admin workflows

These are advanced surfaces:
- battles
- rewards
- social scoring
- admin theme/event/cabinet control
- GitHub listing

They should be exposed in advanced/operator-admin modes, not the default GA control path.

## 6. Mastery surfaces

Mastery actions exist for Alice and advanced certification workflows.

They should not shape the default public operator onboarding. Keep them in advanced documentation and behind deliberate operator intent.
