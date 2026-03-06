---
name: "OpenClaw Arcade Skill"
description: "Use the canonical 555 Arcade plugin from OpenClaw-style agents with observable-state constraints."
metadata:
  {
    "audience": ["agent"],
    "plugin": "@rndrntwrk/plugin-555arcade",
    "integration": "openclaw",
  }
---

# OpenClaw Arcade Skill

This skill defines the control handshake between OpenClaw agents and `555 Arcade`.

## Required sequence

1. `ARCADE555_HEALTHCHECK`
2. `ARCADE555_AUTH_VERIFY`
3. `ARCADE555_SESSION_BOOTSTRAP`
4. `ARCADE555_GAMES_CATALOG`
5. `ARCADE555_GAMES_PLAY`
6. `ARCADE555_SCORE_SUBMIT` when reporting outcomes

Example payloads:

```json
{"gameId":"sector-13","mode":"agent"}
```

```json
{"gameId":"sector-13","runId":"run_123","score":9876}
```

## Rules

- do not assume hidden or future game state
- use observable outputs only
- keep action payloads minimal and explicit
- use `ARCADE555_GAMES_SWITCH` rather than stop/start when changing games mid-session

## Combined live flow

If the OpenClaw agent is also driving a livestream:
- use `ARCADE555_GAMES_GO_LIVE_PLAY`
- coordinate stream start/stop from `555 Stream`
- keep ad and stream controls in the stream plugin, not the arcade plugin
