# Milaidy Web Access

When `@rndrntwrk/plugin-555arcade` is installed and enabled by runtime policy, Milaidy should expose a single **555 Arcade** control surface.

Expected operator workflow:
1. Verify auth/session status from the plugin card.
2. Load catalog and launch/switch games from one panel.
3. Submit score telemetry and verify response in action output.

Migration note:
- Keep `FIVE55_*` aliases available until canonical rollout is complete.
- Suppress legacy arcade cards only when canonical parity is validated.

