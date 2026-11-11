# RivalGhost

RivalGhost is a 60-second arcade rivalry game for NEAR testnet. A player beats a recorded rival run, claims its Crown and Bounty, and leaves the next challenger a replay to beat.

## Workspace

- `apps/web` — the playable React and Phaser experience.
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

The first vertical slice is testnet-only. Credits are game credits with no cash value. Contract deployment, account funding, and public publishing happen only after explicit approval.
