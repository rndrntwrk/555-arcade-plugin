# @rndrntwrk/plugin-555arcade

Canonical elizaOS/Milaidy plugin for `555 Arcade`.

This package owns the public arcade operator surface for:
- authentication and session bootstrap
- game catalog, play, switch, stop, and go-live gameplay
- score capture, leaderboard, and quests
- advanced battles, rewards, social, admin, and GitHub helpers

It replaces fragmented `five55-*` arcade control surfaces with one plugin and one operator story.

## Primary use cases

- bind an agent to the active arcade session
- fetch the playable game catalog
- start, switch, and stop games
- send or read progression data
- combine with `555 Stream` for live gameplay broadcasts

## Public docs

- `docs/PLUGIN_PUBLIC_STANDARD.md`
- `docs/GET_STARTED.md`
- `docs/INSTALL_AND_AUTH.md`
- `docs/ACTIONS_REFERENCE.md`
- `docs/STATES_AND_TRANSITIONS.md`
- `docs/COMPLEX_FLOWS.md`
- `docs/EDGE_CASES_AND_RECOVERY.md`
- `docs/COVERAGE_AND_GAPS.md`
- `docs/PUBLIC_RELEASE_CHECKLIST.md`
- `docs/WIP_TODO.md`
- `docs/QUICKSTART_3_STEPS.md`
- `docs/OPERATOR_SETUP_MATRIX.md`
- `docs/MILAIDY_WEB_ACCESS.md`

## Install

```bash
bun add @rndrntwrk/plugin-555arcade
```

```bash
npm install @rndrntwrk/plugin-555arcade
```

## Minimal setup

Preferred auth:
- `ARCADE555_AGENT_API_KEY`

Fallbacks:
- `ARCADE555_AGENT_TOKEN`
- shared stream auth (`STREAM555_AGENT_API_KEY` / `STREAM555_AGENT_TOKEN`)

Minimal example:

```env
ARCADE555_BASE_URL=https://555.rndrntwrk.com
ARCADE555_AGENT_API_KEY=<agent-api-key>
ARCADE555_REQUIRE_APPROVALS=true
```

## 3-step path

1. `ARCADE555_HEALTHCHECK`
2. `ARCADE555_SESSION_BOOTSTRAP`
3. `ARCADE555_GAMES_CATALOG` then `ARCADE555_GAMES_PLAY`

Use `docs/GET_STARTED.md` for the full operator walkthrough.

## Operator state model

| State | Meaning |
| --- | --- |
| `installed` | package exists in the host |
| `enabled` | host policy allows the plugin to load |
| `loaded` | `ArcadeControlService` started successfully |
| `authenticated` | arcade auth is valid |
| `ready` | session bootstrapped and core arcade actions can run |

Progress readiness is separate:

| Signal | Meaning |
| --- | --- |
| `sessionBootstrapped` | an arcade session is bound |
| `catalogReachable` | games catalog is reachable |
| `scorePipelineReachable` | score capture path is healthy |
| `leaderboardReachable` | leaderboard path is healthy |
| `questsReachable` | quests path is healthy |

## Action families

- Connection/session
- Games
- Progression
- Advanced operators
- Alice-only advanced mastery

See `docs/ACTIONS_REFERENCE.md` for the full action list.

## Skills

- `skills/arcade-operator/SKILL.md`
- `skills/openclaw/SKILL.md`

## Public readiness boundary

This package owns:
- arcade-specific auth, session, games, and progression operations
- arcade-specific config/UI schema
- canonical `555 Arcade` operator vocabulary

This package does not own:
- stream auth/channel/go-live/ad control (`@rndrntwrk/plugin-555stream`)
- generic Milaidy install/enable plumbing
- Alice-only runtime logic outside the exported advanced mastery surfaces

## Compatibility note

Legacy `FIVE55_*` aliases remain opt-in migration surfaces. Public operator docs should use `ARCADE555_*` names only.
