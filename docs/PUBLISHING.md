# Publishing

This package is prepared for a public preview release.

## Release target

- Package: `@rndrntwrk/plugin-555arcade`
- Version: `0.1.0-beta.1`
- npm tag: `beta`
- Canonical docs: `https://docs.rndrntwrk.com/arcade/overview`

## Preflight

1. `bun install --frozen-lockfile`
2. `bun run release:preview`
3. `bun run release:manifest`

## Tag and publish

1. `git tag v0.1.0-beta.1`
2. `git push origin main --tags`
3. `npm publish --access public --tag beta`

## GitHub release

- Title: `555 Arcade 0.1.0-beta.1`
- Body source: `docs/RELEASE_NOTES_0.1.0-beta.1.md`

## Release posture

- Public preview, not GA
- Advanced and Alice-only surfaces remain non-GA
- Current product truth stays in `docs/COVERAGE_AND_GAPS.md`
