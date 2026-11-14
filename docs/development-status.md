# RivalGhost development status

**November 14, 2026 — playable public testnet pilot.** Application revision `9ea48ac` is live at [rivalghost.xyz](https://rivalghost.xyz/). This update reconciles earlier November 13 checkpoints; it does not claim production readiness.

## Available now

- Ten authored story chapters, three free rigs, thirty medals, daily flights and deterministic ghosts.
- Desktop landscape and mobile gameplay, music/SFX, first-flight tutorial, progressive feature unlocks and account invitations.
- Profiles, avatars, replay-checked social scores, auto-posting after profile setup, rivals and challenge links.
- Public device-account sign-in with encrypted recovery, explicit 12-hour purchase permission, sponsored delegation and finalized receipts.
- Deployed v3 economy: finite CR, salvage, jobs/commissions, MOTH exchange, cosmetics, marketplace escrow, restoration and Crown settlement. Local Demo remains separate.
- Durable relay journal and uncertain-transaction recovery; no silent demo-economy fallback in on-chain mode.

## Verified evidence

The [public read-only snapshot](evidence/public-runtime-2026-11-14.json) confirms healthy API, enabled device sign-in/on-chain mode and finalized contract state. Downloading the public bytecode independently measured **98,677 bytes** with the same SHA-256 as the recorded build. Historical live receipts cover two-player trade, jobs, repairs and Crown settlement. Device-account recovery preserved the same 93 CR and one salvage in a second browser.

See the [evidence index](evidence/README.md) for reproducible commands and the independent fresh-clone rehearsal. Test counts in older milestone notes describe those commits, not the current test suite.

## Deliberately disabled or incomplete

- Recurring HOUND worker and recurring NEAR AI inference are disabled in the public release. One paid inference test and prior HOUND execution do not imply ongoing automation.
- Hosted NEAR Auth callback approval remains unresolved. The working public default is the embedded device-account flow, not that provider redirect.
- No stake-to-compute activation, automated Cloud-to-contract focus control, attestation verification, NEP-245, NEAR Intents or mainnet asset economy.
- Account recovery does not sync local campaign saves. Server-authoritative replay results are not proof of human input.

## Next validation priorities

1. Fresh-player and second-device public rehearsal, including actual onboarding budget exhaustion and understandable recovery.
2. Difficulty, retention and performance tests on real phones; no fabricated user metrics.
3. Load/abuse/moderation work before removing the small public sponsorship caps.
4. A separately approved, monitored NPC automation pilot before describing the economy as continuously AI-operated.

For the actual rules, use [economy.md](economy.md). For the shortest runnable path, use the [root README](../README.md).
