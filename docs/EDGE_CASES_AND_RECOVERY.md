# 555 Arcade — Edge Cases and Recovery

## Auth verifies, but session bootstrap fails

Symptom:
- `ARCADE555_AUTH_VERIFY` succeeds
- `ARCADE555_SESSION_BOOTSTRAP` fails

Meaning:
- auth is valid, but session routing or runtime assumptions are wrong

Recovery:
- retry with explicit `sessionId`
- confirm the configured base URL/dialect is correct
- verify the upstream environment is reachable from the host

## Catalog is empty

Symptom:
- `ARCADE555_GAMES_CATALOG` returns no games

Meaning:
- wrong environment, bad dialect, or upstream catalog issue

Recovery:
- verify `ARCADE555_GAMES_API_DIALECT`
- confirm the correct base URL
- stop before issuing play/switch actions

## Game switch fails

Symptom:
- `ARCADE555_GAMES_SWITCH` fails mid-session

Recovery:
- retry switch once
- fall back to `ARCADE555_GAMES_PLAY` for the target game
- if live gameplay is required, use `ARCADE555_GAMES_GO_LIVE_PLAY`

## Live gameplay fails with missing output

Symptom:
- upstream reports missing RTMPS/Cloudflare output

Meaning:
- the active session does not have the required output provisioned

Recovery:
- use `ARCADE555_GAMES_GO_LIVE_PLAY`
- allow the bounded recovery path to stop/restart the session into a Cloudflare-backed state
- do not keep retrying plain play/switch if the output contract is missing

## Progress reads are healthy, but gameplay is not ready

Meaning:
- score or leaderboard services can be healthy while the active session/game path is still degraded

Rule:
- treat gameplay readiness and progression readiness separately

## Advanced surfaces confuse public operators

Meaning:
- the plugin is exposing admin/mastery behavior too prominently

Recovery:
- keep advanced actions in `Advanced`
- keep Alice-only mastery surfaces out of the default operator flow

## Shared stream auth works, but arcade-specific auth is absent

Meaning:
- fallback resolution succeeded

Rule:
- acceptable for combined deployments
- public docs should still recommend arcade-owned auth first
