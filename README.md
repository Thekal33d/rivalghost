# RivalGhost

RivalGhost is a 60-second arcade rivalry game being built for NEAR testnet. The browser now includes **Ghost Signal**, a ten-chapter local campaign across three acts: rescue couriers, evolve your weapons, break a boss signal, and race your saved best ghost. A UTC-seeded daily signal offers a separate expert run. The v3 Workshop/Crown economy is deployed on NEAR testnet; personal NEAR Auth login validation and public hosting remain release gates.

## Workspace

- `apps/web` — the playable React and Canvas experience, with original vector characters and live simulation rendering.
- `apps/verifier` — v1/v2 compatibility plus v3 economy replay verification, finalized RPC challenge reads, bounded replay storage, and an internal authenticated HTTP service.
- `apps/relayer` — NEAR Auth identity/session gateway, durable sponsored NEP-366/game relay, testnet economy adapter and bounded HOUND worker.
- `packages/sim` — shared deterministic fixed-tick game simulation.
- `packages/game-data` — game constants and schemas.
- `packages/contracts-client` — typed ABI, finalized RPC reads, and a scoped wallet transport with pending-transaction recovery.
- `packages/ui` — reusable presentation components.
- `contracts/economy` — deployed compact v3 finite economy; 98,677-byte optimized Wasm.
- `contracts/rivalghost` — the Crown v1 / expedition v2 NEAR contract prototype, with credit grants, challenge locks, signed settlement, defense, and expiry methods.

## Local setup

```sh
pnpm install
pnpm check
cargo test --workspace
pnpm dev
```

Open **http://localhost:3000**. The shared NEAR Auth testnet client accepts this exact root callback; port 5173 is not allowlisted. Old local saves remain in their original browser origin.

Copy the relevant `.env.example` file before configuring a verifier or relayer. Never commit a private key or funded-account credential.

Run `pnpm guest:serve` in a second terminal to enable the optional **Save pilot** button. This defaults to local identity only, with no account funding or RPC calls. See [guest onboarding](docs/guest-onboarding.md) for configuration and its limits.

See [the development checkpoint](docs/development-status.md) for implemented features, validation, and the remaining integration milestones.

## Social play

Open **Your Pilot** to set a username and customize armor, helmet and insignia. The **Leaderboard** shows real, server-replayed submissions by chapter and rig. Post a finished flight or a saved best to create a ghost challenge; add other pilots as rivals and race their recorded lines. See [social play](docs/social-play.md) for endpoints, quotas and the hosting boundary. The local preview has no invented players, and localhost links need public hosting before friends elsewhere can use them.

## Crown economy and NPC

Open **Crown Pit** or **Workshop** with the guest service running. Default unconfigured development uses the local demo. With `ECONOMY_MODE=onchain`, balances, jobs, MOTH exchange, crafting, inventory/equipment, player listings, repairs and Crown payouts settle on `game.rivalghost-ops-thekal33d.testnet`. Economic writes fail closed on chain errors. Sign in through NEAR Auth and explicitly authorize a 12-hour device session before using game assets.

HOUND funds real ghosts, obeys its contract budget and can counterattack with actual replayed flights. The seven-day workbench remains an isolated simulation. CR has no cash value; free story/practice flights remain available. The ledger is finite at 100,100 CR and cosmetics provide no combat advantage. See [live evidence and trust limits](docs/contract-review.md).

## Current scope

Drag or use WASD/arrows to steer and aim; firing is automatic. Press Space or tap Pulse to clear nearby fire. Collect two gold cells to evolve your weapon. Mint rescue pods repair hull. Four moving grazes (three in Null Choir) trigger a repeatable three-second Surge; chained kills build a multiplier up to five. Bosses change patterns at half health, and yellow laser lanes warn before firing.

Choose Needle, Fan, or Guard before a flight. Each chapter offers clear, rescue, and no-hull-damage medals. Clearing a chapter unlocks the next. A boss clear ends after a short extraction, with a maximum mission length of 60 seconds. Escape or Pause stops the action, and leaving the window pauses automatically. Personal best replays are separated by chapter and rig; daily records are also separated by UTC date. The pale ghost is a previous local flight and cannot collide with you. Profile data stays on this device and is not trusted for competitive rewards.

The browser campaign now uses local rules version 3 with ten distinct chapter twists. Desktop flight fills the window in landscape, while mobile uses a fitted portrait view. Boss hits show actual damage, exact HP and phase changes. See [the immersive flight update](docs/immersive-flight.md). Original v2 ghosts remain stored separately from v3 bests, and medals/unlocks are preserved. Competitive v3 missions bind the actor, contract, seed, chapter and reserved economic context to verifier-signed results. The contract verifies certificates; it does not simulate frames on chain. Original v1/v2 code remains a reference and is not the deployed economy.

Run `pnpm economy:check` for the deployed contract's strict `<100000` size gate, native tests and raw/optimized Wasm checks; `pnpm contract:check` retains the legacy artifact checks. Actual testnet receipts, gas measurements and deployment hashes are in `docs/evidence/`. See [development status](docs/development-status.md) and [sign-in steps](docs/near-auth-plan.md).

## Living economy and NPC compute

Open **Workshop** for free recovery jobs, MOTH salvage trading, cosmetic crafting/player listings, HOUND ghost commissions and shared district restoration. **NPC Reactor** shows the current compute/funding state. One approved paid NEAR AI Cloud decision has succeeded. Recurring inference remains disabled, and no staking is active. Automatic Cloud decisions are not yet wired to contract governance. [Implementation and operator setup](docs/living-economy.md).

Workshop: [guided walkthrough](docs/workshop-walkthrough.md). Contract: [review, costs and remaining release gates](docs/contract-review.md). Run `pnpm economy:check` before every economy contract milestone.
