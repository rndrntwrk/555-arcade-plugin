# Milaidy Web Access

When `@rndrntwrk/plugin-555arcade` is installed and enabled by runtime policy, Milaidy should expose a single **555 Arcade** control surface.

Expected operator workflow:
1. Verify auth/session status from the plugin card.
2. Load catalog and launch/switch games from one panel.
3. Run mastery/certification and inspect evidence from the same canonical surface.
4. Submit score telemetry and verify response in action output.

Migration note:
- `@rndrntwrk/plugin-555arcade` is the primary runtime source of truth.
- Keep `FIVE55_*` aliases enabled only for Release A-B compatibility.
- Suppress legacy arcade cards only after canonical parity is validated and legacy usage is observed near zero.
