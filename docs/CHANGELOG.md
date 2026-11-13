# Changelog

## 2026-11-13 — NEAR Auth, ranked expiry and operator setup

- Implemented testnet NEAR Auth compatibility adapter, one-use proof/session checks, stable pilot linking and a bounded signing sponsor. Live signing remains disabled pending configuration and end-to-end provider validation.
- Applied approved expiry forfeiture: new ranked entries distribute 8 CR to bounty and 2 CR to holder at deadline. Older pending local entries retain their original terms. Added the pre-entry deadline/disconnection notice.
- Contract artifact is now 99,448 bytes (552 bytes below strict limit); 19 Rust tests and raw/optimized Wasm checks pass. Full application checks pass 99 tests.
- Published the project to Thekal33d/rivalghost. Recorded the $5 total, four-decisions/day AI pilot with no automatic top-ups; no paid calls or purchases enabled.
- Added wallet/AI/Hetzner setup guidance. Existing CX23 sharing awaits resource and Trialoom deployment inspection; no new server purchased.

## November 13 — contract review and size gate
- Reduced optimized Wasm from 171,363 to 99,428 bytes; retained strict `<100000` gate and signature/overflow checks.
- Restricted initialization, bounded per-player challenge retention and required a full flight window for defense.
- Added `pnpm contract:check`: 19 native tests and actual Wasm checks with 62 rejected calls and ten constant-storage cycles per artifact.
- Recorded open expiry, legacy signature, supply/storage and v3 deployment findings; no funds or deployment actions.
- Added the Workshop walkthrough. Full application checks pass all 88 tests.


## November 12, 2026 — Crown economy and autonomous local HOUND

- Corrected the contract to block empty-bounty challenges and premature defense.
- Added a finite server-authoritative demo CR ledger, reserved flights, replay-bound/idempotent receipts, optional defense and expiry refunds.
- Added three input-only HOUND styles, autonomous counterflights with reserve/daily/cooldown limits and visible factual reasoning.
- Added the responsive Crown Pit, pause-aware reservation timer, recovered result retries and isolated seven-day economy workbench.
- Verified 75 TypeScript tests, 12 Rust tests, build/type checks, optimized Wasm smoke equivalence and browser grant/flight/loss flow.
- Kept NEAR spending disabled. The 171,363-byte optimized contract still fails the original 100,000-byte gate; deployed NPC wallets and v3 settlement remain pending.

## November 12, 2026 — Pilot identities and social rivalry

- Added editable unique usernames and 36 free avatar combinations, shown in profiles, navigation, results and leaderboard entries.
- Added persistent, replay-checked v3 boards with chapter/rig/daily filters and one best score per pilot.
- Added one-way rival lists, explicit score posting, shareable recorded-ghost challenges, opponent score differences and rematches.
- Kept the social loop off-chain; localhost sharing still requires public hosting for other devices.
- Verified 67 TypeScript tests plus builds/type checking; browser-checked the avatar workshop and mobile leaderboard empty state.

## November 12, 2026 — Immersive flight and chapter remix

- Replaced the narrow desktop arena with full-window landscape flight, fitted mobile portrait play, screen-relative controls and optional fullscreen.
- Added actual boss hit feedback, grouped damage numbers, HP/percentage, armor cracks and phase-two status.
- Added ten authored environments, route transitions and ten local chapter mechanics, including tides, freight beams, echo interceptors, ash strikes and graze-powered Pulse resets.
- Isolated changed physics in local v3; preserved original v2 replays, medals and unlocks. The current verifier rejects v3 competitive submissions.
- Verified 59 TypeScript tests, production build/type checking, all 30 v3 chapter/rig combinations and browser desktop/mobile layout checks.

## November 12, 2026 — Saved pilots and contract build correction

- Added optional browser pilot keys, one-use signature authentication, HttpOnly sessions, and an identity-bound verification gateway. Campaign play remains local.
- Added disabled-by-default testnet bootstrap with exact key permissions, idempotent grant checks, durable sponsorship reservations and fail-closed caps. No real account was funded.
- Fixed NEAR host compilation and added pinned Wasm optimization plus executable raw/optimized parity checks. Current artifact is 171,283 bytes; the unchanged 100,000-byte gate still fails.
- Verified 53 TypeScript tests, ten Rust tests, production build/type checking and desktop/phone-sized save/restore UI.

## November 12, 2026 — Ten-chapter Ghost Signal

- Expanded the campaign from three to ten authored chapters with crossing, aimed, sweeping and mixed boss attacks, new formations and district palettes.
- Added a three-act campaign map, 30-medal progression, full unlock chain and preserved all existing saves and original chapter replays.
- Kept daily records and Crown v1 separate; no additional contract transactions or storage.

## November 12, 2026 — Competitive integration foundation

- Bound expedition competitions to chapter, rig, seed, revision and testnet deployment while preserving the v1 protocol.
- Locked each Crown during a flight; settlement or expiry releases both Crown and player locks.
- Added finalized RPC reads, an internal authenticated HTTP verifier, bounded replay storage and a restricted wallet transport that distinguishes verification from finalized settlement. The browser campaign remains local.
- Added a cross-language replay-to-settlement fixture and adversarial tests.
- Added an optimized Wasm size gate; the measured 220,885-byte artifact exceeds the unchanged 100,000-byte ceiling, so deployment remains blocked on optimization.

## November 13, 2026 — Living economy and compute

- Shared conserved CR ledger extended with MOTH, mission-bound recovery/commission receipts, escrowed listings, crafting and repair sinks.
- Playable Workshop, original MOTH SVG, three visible cosmetic trails, raceable commissioned ghosts and ten restoration tracks.
- NEAR AI Cloud choice adapter with persistent request caps/fallback and read-only staking-farm reporting; disabled until accounts and funding are configured.
- 88 TypeScript tests and full check pass. Browser recovery → cargo → craft → equip → flight flow verified. No NEAR deployment or spending.
