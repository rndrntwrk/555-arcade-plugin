---
name: "OpenClaw Arcade Skill"
description: "Use the canonical 555 Arcade plugin from OpenClaw-style agents with observable-state constraints."
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
