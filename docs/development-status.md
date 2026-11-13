# RivalGhost development checkpoint

November 13, 2026

**Stage: playable game with a deployed, integrated NEAR testnet economy.** Personal NEAR Auth login and game-session authorization are verified live. Browser job reward and MOTH sale receipts are verified. The creator reports craft/equip and account recovery tests passed. The public demo preview is live at https://rivalghost.xyz/; hosted authentication and live-data cutover remain next.

## Implemented

- Ten authored chapters, three free rigs, thirty medals, daily flights, deterministic ghosts, reactive environments and responsive desktop/mobile Canvas gameplay.
- Server profiles, avatars, replay-checked leaderboards, rivals and shareable ghosts. These social records and local campaign saves are not economic assets.
- Compact v3 contract: finite CR, salvage, daily verified jobs/commissions, MOTH exchange, cosmetic ownership/crafting/equipment, market escrow/fees, shared repairs, Crown purses/entry/payouts, HOUND budgets and roles.
- Actual testnet contract `game.rivalghost-ops-thekal33d.testnet`, **98,677-byte** Wasm. Two-player trade, verified rewards, repair and Crown settlement passed on real NEAR; balances preserved through final hardening upgrade.
- Sponsored NEP-366 session authorization; signed browser actions; durable transaction journal; finalized receipts; uncertain-result recovery; no local economy fallback when on-chain mode is enabled.
- Local HOUND worker now funds real on-chain Crown ghosts. Browser Workshop/Crown Pit display finalized contract state and explorer receipts.
- NEAR Auth identity and explicit 12-hour game-session consent. Shared provider accepts **http://localhost:3000** exactly; port 5173 and /auth/callback were rejected. The corrected game reaches the login form. A later callback exposed the live provider rejecting the NEP-413 login payload. Identity login now uses server-verified OIDC with PKCE; explicit delegate signing remains the game-session step. Personal login and MPC delegate approval now completed on testnet; finalized contract state confirms 100 CR and session epoch 1.

- Login hardening: server-held PKCE, one-time nonce/state/cookie binding, RS256 identity-token verification, explicit identity-first authorization, persistent errors, exact approved signing-token retrieval and retry recovery. Browser verified pre-login authorization gating; personal identity and game-session approval are now verified end to end. Active-session UI shows device-specific readiness and expiry.

## Evidence

`pnpm check`: 133 tests plus typechecks/builds pass. `pnpm economy:check`: 20 native Rust tests across crates, raw/optimized Wasm parity, 34 rejected calls per artifact and bounded repeated-job storage. Live testnet receipts and measured gas are in `docs/evidence/economy-v3-testnet.json`. Personal sign-in/session evidence is in `docs/evidence/near-auth-live-testnet.json`. See [contract review](contract-review.md).

The creator authorized up to 4 test NEAR; 3.3 allocated, plus approximately 0.035575 account-creation fees. No mainnet transfers. One paid NEAR AI decision succeeded in the earlier milestone; recurring inference stays disabled and no additional AI credit was used here.

## Next

1. Test gameplay and two-player social features at `https://rivalghost.xyz/`. DNS, HTTPS, frontend delivery and API health are verified. This public preview uses demo balances; no live testnet keys or player database have moved.
2. Register the exact hosted NEAR Auth callback/origin: provider preflight currently rejects the callback. Then migrate the live database and protected keys with one active signer and repeat login/recovery plus economic browser tests online.
3. Add the separately bounded operator path for AI decisions to update contract focus before calling inference-driven economic behavior live. Stake-to-compute remains future work.
4. Human difficulty/retention tests, real-phone performance and fresh-player public rehearsal; capture actual gameplay and receipts for judges.

The on-chain economy starts fresh; unverified demo balances are never imported. Old campaign saves remain in the old browser origin's storage. Switching from localhost:5173 to localhost:3000 does not automatically move local medals/ghosts. The deployed contract includes operator/verifier trust and does not claim an external token standard.
