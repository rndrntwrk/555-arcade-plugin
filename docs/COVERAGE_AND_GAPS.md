# 555 Arcade — Coverage and Gaps

Last reviewed: March 6, 2026.

## Publicly covered today

## Core operator path
- install and enable
- auth verify
- session bootstrap
- catalog read
- play
- switch
- stop
- go-live gameplay path

## Progression
- score read/submit
- leaderboard read/write
- quests read/create/complete

## Advanced operators
- battles
- rewards
- social
- admin theme/event/cabinet
- GitHub repo listing

## Milaidy surface
- package-owned config schema
- package-owned UI schema
- canonical `555 Arcade` naming
- action-first operator layout

## Known gaps or risks

## P0
- public operator docs still need game-by-game strategy and mastery docs; that work is intentionally separate from this plugin standardization pass
- advanced admin surfaces are documented, but they are not yet simplified into opinionated public role presets

## P1
- progression examples can be expanded with more concrete payload samples
- public screenshots/gifs of Milaidy operator panels are not packaged yet

## P2
- legacy compatibility aliases still exist for migration safety and increase conceptual surface area

## Explicit non-goals for this package

- stream channel/auth/ad control belongs in `@rndrntwrk/plugin-555stream`
- Alice-only mastery certification is not part of the default public GA operator story

## Publication read

The plugin is documentation-ready for public onboarding at the platform/operator level.

Before broad publication, the remaining practical gaps are:
- richer progression examples
- role-specific advanced operator guidance
- separate game-mastery docs
