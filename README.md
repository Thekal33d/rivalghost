# RivalGhost

RivalGhost is a 60-second arcade rivalry game being built for NEAR testnet. The browser now includes **Ghost Signal**, a ten-chapter local campaign across three acts: rescue couriers, evolve your weapons, break a boss signal, and race your saved best ghost. A UTC-seeded daily signal offers a separate expert run. The intended on-chain Crown loop remains a separate versioned competition.

## Workspace

- `apps/web` — the playable React and Canvas experience, with original vector characters and live simulation rendering.
- `apps/verifier` — deterministic replay checks and settlement certificate issuance.
- `apps/relayer` — placeholder for the sponsored transaction relay; no live relay yet.
- `packages/sim` — shared deterministic fixed-tick game simulation.
- `packages/game-data` — game constants and schemas.
- `packages/contracts-client` — browser-to-contract boundary.
- `packages/ui` — reusable presentation components.
- `contracts/rivalghost` — the Crown v1 NEAR contract prototype, with credit grants, challenge locks, signed settlement, defense, and expiry methods.

## Local setup

```sh
pnpm install
pnpm check
cargo test --workspace
pnpm dev
```

Copy the relevant `.env.example` file before configuring a verifier or relayer. Never commit a private key or funded-account credential.

See [the development checkpoint](docs/development-status.md) for implemented features, validation, and the remaining integration milestones.

## Current scope

Drag or use WASD/arrows to steer and aim; firing is automatic. Press Space or tap Pulse to clear nearby fire. Collect two gold cells to evolve your weapon. Mint rescue pods repair hull. Four moving grazes trigger a repeatable three-second Surge; chained kills build a multiplier up to five. Bosses change patterns at half health, and yellow laser lanes warn before firing.

Choose Needle, Fan, or Guard before a flight. Each chapter offers clear, rescue, and no-hull-damage medals. Clearing a chapter unlocks the next. A boss clear ends after a short extraction, with a maximum mission length of 60 seconds. Escape or Pause stops the action, and leaving the window pauses automatically. Personal best replays are separated by chapter and rig; daily records are also separated by UTC date. The pale ghost is a previous local flight and cannot collide with you. Profile data stays on this device and is not trusted for competitive rewards.

The expedition uses rules version 2; the existing Crown simulator and contract remain on version 1. Campaign flights make no contract calls and cannot be issued a v1 settlement certificate. See [the gameplay research and expansion plan](docs/ghost-signal-design.md) for design sources and the future competitive v2 integration gate. [The earlier visual pass](docs/arcade-design-pass.md) records the established art direction.

The first vertical slice is testnet-only. Credits are game credits with no cash value. Contract deployment, account funding, and public publishing happen only after explicit approval.
