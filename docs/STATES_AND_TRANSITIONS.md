# 555 Arcade — States and Transitions

This is the public state reference for the `555 Arcade` plugin.

## Operator-visible lifecycle

```mermaid
stateDiagram-v2
    [*] --> NotInstalled
    NotInstalled --> InstalledDisabled: package present
    InstalledDisabled --> Enabled: host enables plugin
    Enabled --> Loaded: service start succeeds
    Loaded --> Authenticated: auth verify succeeds
    Authenticated --> SessionBootstrapped: bootstrap succeeds
    SessionBootstrapped --> CatalogReady: catalog succeeds
    CatalogReady --> Ready
    Ready --> Playing: game play or go-live play succeeds
    Playing --> Switching: switch requested
    Switching --> Playing: switch succeeds
    Playing --> Ready: stop succeeds
    Ready --> Degraded: downstream dependency issue
    Degraded --> Ready: recovery succeeds
    Loaded --> Failed: service start/runtime error
```

## State meanings

| State | Meaning |
| --- | --- |
| `installed` | package exists in the host |
| `enabled` | host policy says it should load |
| `loaded` | `ArcadeControlService` is running |
| `authenticated` | arcade auth is valid |
| `sessionBootstrapped` | session exists and is bound |
| `catalogReachable` | game catalog read path is healthy |
| `ready` | the plugin can execute core arcade operations |
| `playing` | a game is active |
| `degraded` | plugin is up but one or more dependencies are impaired |

## Progress state

```mermaid
stateDiagram-v2
    [*] --> Unknown
    Unknown --> ScoreReady
    Unknown --> LeaderboardReady
    Unknown --> QuestsReady
    ScoreReady --> ProgressReady
    LeaderboardReady --> ProgressReady
    QuestsReady --> ProgressReady
    ProgressReady --> Degraded
    Degraded --> ProgressReady
```

Signals:
- `scorePipelineReachable`
- `leaderboardReachable`
- `questsReachable`

## Live gameplay path

When using `ARCADE555_GAMES_GO_LIVE_PLAY`:

```mermaid
stateDiagram-v2
    [*] --> SessionBootstrapped
    SessionBootstrapped --> ProvisioningOutput
    ProvisioningOutput --> LiveReady: Cloudflare output present
    ProvisioningOutput --> Recovering: active stream without CF output
    Recovering --> LiveReady: stop/start recovery succeeds
    LiveReady --> Playing
    Playing --> Ready: gameplay stopped
```

## Public rules

- `configured` must not be used as a synonym for `loaded`
- `ready` should imply auth + session + catalog readiness for the default operator flow
- progress readiness should not be collapsed into gameplay readiness
- mastery readiness is not the same thing as GA operator readiness
