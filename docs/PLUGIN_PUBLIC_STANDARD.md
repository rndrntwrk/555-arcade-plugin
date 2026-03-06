# 555 Arcade Public Standard

This document defines the public-release standard for `@rndrntwrk/plugin-555arcade`.

Use it as the source of truth for:
- package shape
- Milaidy hosting expectations
- operator-facing state vocabulary
- required docs and skills
- release gate expectations

## Scope

`555 Arcade` is the canonical first-party plugin for:
- authentication and session bootstrap
- game catalog, play, switch, stop, and go-live gameplay
- score capture, leaderboard, and quests
- advanced battles, rewards, social, admin, and GitHub helpers

It is the gameplay/progression plugin. Stream transport and ads belong to `@rndrntwrk/plugin-555stream`.

## Required package surface

The package should ship and maintain:

- `README.md`
- `config/plugin-config.schema.json`
- `config/plugin-ui.schema.json`
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
- `skills/arcade-operator/SKILL.md`
- `skills/openclaw/SKILL.md`

Historical docs may stay, but they should either remain current or point at the canonical replacements.

## Required metadata

`package.json` should keep these accurate:

- `name`
- `repository`
- `homepage`
- `bugs`
- `elizaos.displayName`
- `elizaos.configSchemaFile`
- `elizaos.pluginUiSchemaFile`

## Required operator state vocabulary

The public UI and API should use the same core lifecycle terms:

| Token | Meaning |
| --- | --- |
| `installed` | package present in the host |
| `enabled` | host policy allows the plugin to load |
| `loaded` | service/provider layer initialized |
| `authenticated` | auth is valid |
| `ready` | the primary operator flow can act |
| `degraded` | the plugin is up, but one or more dependencies are degraded |

`555 Arcade` can add arcade-specific secondary readiness:

| Token | Meaning |
| --- | --- |
| `sessionBootstrapped` | an arcade session is bound |
| `catalogReachable` | the games catalog is reachable |
| `scorePipelineReachable` | score submission is healthy |
| `leaderboardReachable` | leaderboard read/write is healthy |
| `questsReachable` | quest surfaces are healthy |

## Milaidy hosting boundary

Milaidy should own:
- install/enable/test plumbing
- generic plugin rendering
- generic lifecycle badges

`555 Arcade` should own:
- arcade config schema
- arcade UI grouping
- action grouping
- arcade wording
- readiness semantics

Milaidy should not hardcode arcade-specific operator behavior when package-owned schema can express it.

## Doc rules

Public docs should:
- use canonical `555 Arcade` naming
- keep the primary flow action-first: verify → bootstrap → catalog → play/switch/stop
- separate GA/default surfaces from advanced or Alice-only surfaces
- keep examples secret-safe
- document recovery and session semantics honestly
- use relative links only

## Skill rules

The package should keep:
- one operator skill
- one OpenClaw-facing skill if OpenClaw support is claimed

Skill docs should cover:
- when to use the skill
- prerequisites
- primary workflow
- safety rules
- recovery and escalation

## Release gate

`555 Arcade` is not public-ready unless:
- docs are current
- skills are current
- the primary auth → bootstrap → catalog → play/switch/stop path has been smoke-tested
- score, leaderboard, and quest surfaces are documented accurately
- Alice-only mastery is clearly separated from GA operator setup
- known gaps are explicitly listed in `docs/COVERAGE_AND_GAPS.md`
