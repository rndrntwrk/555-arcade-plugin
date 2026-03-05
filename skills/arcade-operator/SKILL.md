# 555 Arcade Operator Skill

Use this skill when the agent needs to run a complete arcade session lifecycle:

1. `ARCADE555_HEALTHCHECK`
2. `ARCADE555_SESSION_BOOTSTRAP`
3. `ARCADE555_GAMES_CATALOG`
4. `ARCADE555_GAMES_PLAY`
5. `ARCADE555_SCORE_SUBMIT` (optional during/after run)
6. `ARCADE555_GAMES_STOP` (when ending run)

Guidelines:
- Prefer deterministic parameters (`sessionId`, `gameId`, `mode`).
- Use `ARCADE555_GAMES_SWITCH` instead of stop+play where possible.
- Treat score submit as idempotent per run checkpoint.

