# 555 Arcade — Public Release Checklist

Use this before publishing a release externally.

## Package

- [ ] `package.json` name, repo, homepage, and issue tracker are correct
- [ ] `elizaos.displayName` is `555 Arcade`
- [ ] `config/plugin-config.schema.json` is current
- [ ] `config/plugin-ui.schema.json` is current
- [ ] `dist/` builds cleanly

## Docs

- [ ] `README.md` is current
- [ ] `GET_STARTED.md` matches the real operator flow
- [ ] `INSTALL_AND_AUTH.md` matches the real auth precedence and config model
- [ ] `ACTIONS_REFERENCE.md` covers core, advanced, and non-GA mastery surfaces
- [ ] `STATES_AND_TRANSITIONS.md` matches Milaidy/operator UI states
- [ ] `EDGE_CASES_AND_RECOVERY.md` covers catalog, session, and live-output failures
- [ ] `COVERAGE_AND_GAPS.md` is honest about what is and is not public-ready
- [ ] `WIP_TODO.md` is current

## Skills

- [ ] operator skill is current
- [ ] OpenClaw skill is current
- [ ] skill docs use canonical `ARCADE555_*` names

## Functional verification

- [ ] `ARCADE555_HEALTHCHECK` succeeds
- [ ] `ARCADE555_AUTH_VERIFY` succeeds
- [ ] `ARCADE555_SESSION_BOOTSTRAP` succeeds
- [ ] `ARCADE555_GAMES_CATALOG` returns live catalog entries
- [ ] `ARCADE555_GAMES_PLAY` works in a real session
- [ ] `ARCADE555_GAMES_SWITCH` works in a real session
- [ ] `ARCADE555_GAMES_STOP` works in a real session
- [ ] progression surfaces (`score`, `leaderboard`, `quests`) are reachable
- [ ] `ARCADE555_GAMES_GO_LIVE_PLAY` works when live gameplay is in scope

## Security

- [ ] no secrets are hard-coded in docs or examples
- [ ] public docs use placeholder secrets only
- [ ] advanced admin tokens are documented as advanced-only
- [ ] stream auth fallback is documented as compatibility, not the primary story

## Publishing

- [ ] version bumped intentionally
- [ ] changelog/release note written
- [ ] tags/registry publish command verified
