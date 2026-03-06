# 555 Arcade — Milaidy Web Access

This document defines how `555 Arcade` should appear inside Milaidy.

## Plugin card expectations

The Milaidy plugin card should expose:
- canonical name: `555 Arcade`
- lifecycle summary: `Installed`, `Enabled`, `Loaded`, `Authenticated`, `Ready`
- `Session`
- `Games`
- `Progress`
- `Advanced`

## Default operator experience

The default operator should be able to:
1. verify auth
2. bootstrap a session
3. fetch the catalog
4. play, switch, and stop games
5. read score, leaderboard, and quest readiness

They should not need to:
- understand legacy `five55-*` plugin fragmentation
- manage raw split-service overrides in the default path
- see Alice-only mastery controls unless explicitly in advanced mode

## UI state mapping

| Milaidy state | Meaning |
| --- | --- |
| `Installed` | package present |
| `Enabled` | host policy allows loading |
| `Loaded` | runtime service started |
| `Authenticated` | auth check succeeded |
| `Ready` | session bootstrapped and core arcade actions can run |

## Action entrypoints from Milaidy

Expected first actions:
1. `ARCADE555_HEALTHCHECK`
2. `ARCADE555_AUTH_VERIFY`
3. `ARCADE555_SESSION_BOOTSTRAP`
4. `ARCADE555_GAMES_CATALOG`
5. `ARCADE555_GAMES_PLAY`
6. `ARCADE555_GAMES_SWITCH`
7. `ARCADE555_GAMES_STOP`

## Host notes

- Milaidy owns install/enable/test plumbing
- `555 Arcade` owns its domain wording, grouping, and readiness semantics
- legacy alias surfaces should not appear as separate plugin cards
