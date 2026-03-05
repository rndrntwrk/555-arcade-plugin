# OpenClaw Integration Skill (Arcade)

This skill defines the control handshake between OpenClaw agents and the canonical 555 Arcade plugin.

Required sequence:
1. Check availability with `ARCADE555_HEALTHCHECK`.
2. Bind target session with `ARCADE555_SESSION_BOOTSTRAP`.
3. Query game availability with `ARCADE555_GAMES_CATALOG`.
4. Launch with `ARCADE555_GAMES_PLAY`.
5. Report outcomes via `ARCADE555_SCORE_SUBMIT`.

Rules:
- Do not assume hidden game state.
- Use observable outputs only.
- Keep action payloads minimal and explicit.

