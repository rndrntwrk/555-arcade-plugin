# State Diagrams

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> AuthReady: ARCADE555_AUTH_VERIFY
    AuthReady --> SessionBound: ARCADE555_SESSION_BOOTSTRAP
    SessionBound --> InGame: ARCADE555_GAMES_PLAY
    InGame --> InGame: ARCADE555_GAMES_SWITCH
    InGame --> SessionBound: ARCADE555_GAMES_STOP
    InGame --> Tracking: ARCADE555_SCORE_SUBMIT
    Tracking --> InGame
```

