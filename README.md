# RivalGhost

RivalGhost is a 60-second arcade rivalry game being built for NEAR testnet. The intended competitive loop is to beat a recorded rival run, claim its Crown and Bounty, and leave the next challenger a replay to beat. The current browser build is free local practice with fixed Pup and HOUND score targets.

## Workspace

- `apps/web` — the playable React and Canvas experience, with original vector characters and live simulation rendering.
- `apps/verifier` — deterministic replay checks and settlement certificate issuance.
- `apps/relayer` — tightly scoped sponsored transaction relay.
- `packages/sim` — shared deterministic fixed-tick game simulation.
- `packages/game-data` — game constants and schemas.
- `packages/contracts-client` — browser-to-contract boundary.
- `packages/ui` — reusable presentation components.
- `contracts/rivalghost` — the NEAR contract, currently a tested state shell.

## Local setup

```sh
pnpm install
pnpm check
cargo test --workspace
pnpm dev
```

Copy the relevant `.env.example` file before configuring a verifier or relayer. Never commit a private key or funded-account credential.

## Current scope

Drag or use WASD/arrows to steer; firing is automatic. Graze bullets while moving to earn points. Four grazes unlock one three-second Surge per run, doubling takedown points. Practice needs no wallet and makes no contract calls. Results save a local personal best and show a replay hash, not an on-chain settlement claim. See [the arcade design pass](docs/arcade-design-pass.md) for the visual direction, implemented feedback, and remaining playtesting.

The first vertical slice is testnet-only. Credits are game credits with no cash value. Contract deployment, account funding, and public publishing happen only after explicit approval.
