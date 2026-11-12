# Verifier and settlement integration

## What is connected

The current simulator produces an expedition v2 replay. The verifier reads the locked challenge and Crown from one finalized NEAR block, re-simulates that replay, stores its canonical bytes under its SHA-256 hash, and signs a deployment-bound certificate. The contract validates that certificate before settlement. `fixtures/expedition-v2-settlement.json` is a public, deterministic cross-language fixture: TypeScript verifies its real game replay and signature; Rust settles the exact certificate and rejects reuse.

This is locally tested integration code. No contract, wallet session, guest account, public endpoint or live transaction is configured. The browser still runs the free local campaign. The wallet transport is implemented but is not mounted in the browser UI.

## Build and validate

```sh
pnpm install --frozen-lockfile
pnpm check
cargo test --workspace
```

Regenerate the public test fixture after an intentional protocol change:

```sh
node tools/generate-competition-fixture.mjs
```

The generator uses a publicly known deterministic test key, shared with the Rust tests. Never use it for a deployment. It does not generate or fund a NEAR account.

## Internal service configuration

Start with `apps/verifier/.env.example`. Set a testnet contract ID, RPC URL, path to an owner-readable private Ed25519 JWK, a random service token of at least 32 characters, and a dedicated replay directory. The key must match the contract's verifier public key. Use a new deployment key, not the test fixture key.

```sh
pnpm --filter @rivalghost/verifier... build
node --env-file=apps/verifier/.env apps/verifier/dist/server.js
```

The server binds only to `127.0.0.1:8787` by default. Startup checks the RPC's network and verifies the signing key against the deployed public key. Missing configuration fails clearly; it does not fall back to mock chain state. `/healthz` reports process readiness after startup checks, not ongoing RPC health.

`POST /verify` requires `Authorization: Bearer <VERIFIER_SERVICE_TOKEN>` and JSON:

```json
{"challengeId":"0","playerId":"player.testnet","replay":{"rulesVersion":2,"seed":313,"chapter":0,"rig":"fan","runs":[{"input":0,"ticks":3600}]}}
```

The input shown is an illustrative replay, not an opening score or a live challenge. The request cannot supply authoritative scores, mission settings, expiry or contract state. A successful response contains a certificate, `status: "verified"`, and `settled: false`.

**This endpoint is service-to-service, not a public browser API.** Keep its token and signing key out of web code, Vite variables and logs. The authenticated guest gateway now establishes the player's identity and binds submissions to that player before calling it; see [guest onboarding](guest-onboarding.md). Its NEAR provisioning adapter still needs real deployment validation. A shared service credential is not end-user authentication. Do not publish the verifier directly as a substitute for that gateway.

Current limits: 128 KiB request body, 30 authenticated verification attempts per minute, one request in progress, request timeouts, and a dedicated local replay store capped at 64 MiB / 4,096 files. The store deduplicates content, publishes complete files atomically, and refuses new writes at capacity. Signing happens only after persistence; storage failures return no certificate. These limits are for one process. Shared storage, retention, observability and distributed quotas need a separate production design.

## Transaction transport and recovery

`WalletContractTransport` adapts a NEAR Wallet Selector-compatible selected wallet. It only calls `start_challenge`, `settle_challenge`, `defend_crown`, or `expire_challenge` on the configured testnet contract, with zero attached deposit and a 30 Tgas allowance. This is a developer wallet transport, **not the sponsored guest relay**; zero deposit does not mean gas-free. The allowance still needs deployment measurement.

After signing, it requests the transaction's `FINAL` execution result. A timeout or incomplete response yields a `PendingTransactionError` containing the transaction hash and signer. `confirm()` performs read-only recovery; it never resubmits. Contract failure is reported as failure, not a pending payout. The future UI must persist pending transaction identity across reloads and show separate local, verified and settled states.

The implementation follows NEAR's [contract view RPC](https://docs.near.org/api/rpc/contracts) and [transaction finality RPC](https://docs.near.org/api/rpc/transactions). The challenge and Crown reads use the same finalized block; an optimistic transaction result is not treated as final settlement.

## Remaining release gates

- Validate guest provisioning against a deployed contract; implement the restricted NEP-366 relay with sponsorship accounting.
- Browser competition controller, pending-result recovery and proof drawer.
- HOUND worker competing through the same verification path.
- A fresh testnet contract deployment; the new Crown/Challenge storage layout has no migration for existing deployments.
- Resolve the failing contract-size budget; measure state growth and actual method receipts.
- Run a real deployed guest-to-settlement flow, including failure and retry cases, before enabling public competition.
