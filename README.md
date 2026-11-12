# RivalGhost

RivalGhost is a 60-second arcade rivalry game being built for NEAR testnet. The browser now includes **Ghost Signal**, a ten-chapter local campaign across three acts: rescue couriers, evolve your weapons, break a boss signal, and race your saved best ghost. A UTC-seeded daily signal offers a separate expert run. The intended on-chain Crown loop remains a separate versioned competition.

## Workspace

- `apps/web` — the playable React and Canvas experience, with original vector characters and live simulation rendering.
- `apps/verifier` — v1/v2 replay verification, finalized RPC challenge reads, bounded replay storage, and an internal authenticated HTTP service.
- `apps/relayer` — authenticated guest gateway, persistent sponsorship limits and an opt-in testnet bootstrap adapter; NEP-366 relay remains unfinished.
- `packages/sim` — shared deterministic fixed-tick game simulation.
- `packages/game-data` — game constants and schemas.
- `packages/contracts-client` — typed ABI, finalized RPC reads, and a scoped wallet transport with pending-transaction recovery.
- `packages/ui` — reusable presentation components.
- `contracts/rivalghost` — the Crown v1 / expedition v2 NEAR contract prototype, with credit grants, challenge locks, signed settlement, defense, and expiry methods.

## Local setup

```sh
pnpm install
pnpm check
cargo test --workspace
pnpm dev
```

Copy the relevant `.env.example` file before configuring a verifier or relayer. Never commit a private key or funded-account credential.

Run `pnpm guest:serve` in a second terminal to enable the optional **Save pilot** button. This defaults to local identity only, with no account funding or RPC calls. See [guest onboarding](docs/guest-onboarding.md) for configuration and its limits.

See [the development checkpoint](docs/development-status.md) for implemented features, validation, and the remaining integration milestones.

## Social play

Open **Your Pilot** to set a username and customize armor, helmet and insignia. The **Leaderboard** shows real, server-replayed submissions by chapter and rig. Post a finished flight or a saved best to create a ghost challenge; add other pilots as rivals and race their recorded lines. See [social play](docs/social-play.md) for endpoints, quotas and the hosting boundary. The local preview has no invented players, and localhost links need public hosting before friends elsewhere can use them.

## Current scope

Drag or use WASD/arrows to steer and aim; firing is automatic. Press Space or tap Pulse to clear nearby fire. Collect two gold cells to evolve your weapon. Mint rescue pods repair hull. Four moving grazes (three in Null Choir) trigger a repeatable three-second Surge; chained kills build a multiplier up to five. Bosses change patterns at half health, and yellow laser lanes warn before firing.

Choose Needle, Fan, or Guard before a flight. Each chapter offers clear, rescue, and no-hull-damage medals. Clearing a chapter unlocks the next. A boss clear ends after a short extraction, with a maximum mission length of 60 seconds. Escape or Pause stops the action, and leaving the window pauses automatically. Personal best replays are separated by chapter and rig; daily records are also separated by UTC date. The pale ghost is a previous local flight and cannot collide with you. Profile data stays on this device and is not trusted for competitive rewards.

The browser campaign now uses local rules version 3 with ten distinct chapter twists. Desktop flight fills the window in landscape, while mobile uses a fitted portrait view. Boss hits show actual damage, exact HP and phase changes. See [the immersive flight update](docs/immersive-flight.md). Original v2 ghosts remain stored separately from v3 bests, and medals/unlocks are preserved. The contract now supports separately bound expedition v2 competitions alongside legacy Crown v1. Campaign flights still make no contract calls. Local v3 results are rejected by the current v2 competition verifier; v2 results cannot settle as v1 certificates. Competitive v2 requires a contract-held mission, rig and seed, plus a deployment-bound certificate. See [the gameplay research and expansion plan](docs/ghost-signal-design.md) for design sources and the competitive protocol boundary. [The earlier visual pass](docs/arcade-design-pass.md) records the established art direction.

The first vertical slice is testnet-only. Credits are game credits with no cash value. Contract deployment, account funding, and public publishing happen only after explicit approval.

See [the verifier runbook](docs/verifier-runbook.md) for startup, internal-service authentication, finalized transaction recovery, and remaining integration gates. `pnpm contract:size` enforces the original 100,000-byte deployment ceiling; the current 171,283-byte optimized artifact fails that gate. No deployment has occurred.
