# Historical Crown v1/v2 review — superseded by contract-review.md

# RivalGhost — contract review and size evidence

November 13, 2026 · size optimization `89daba2`; approved expiry correction `bf0f0aa`; sign-in milestone `7dda7c5`

The optimized contract is **99,448 bytes**, below the strict **100,000-byte** ceiling. This is an implemented size/correctness review with regression checks, not an independent security audit or approval to deploy valuable assets.

## Artifact and reproducible check

| Measurement | Result |
| --- | --- |
| Previous optimized artifact | 171,363 bytes |
| Current raw Cargo artifact | 123,175 bytes |
| Current optimized artifact | 99,448 bytes / about 97.12 KiB |
| Strict gate | `< 100000`, passing; 552 bytes of headroom |
| Reduction from previous optimized build | 71,915 bytes / 42.0% |
| SHA-256 | `6815039240bff8213dc860f35939d8cb78c63d16cc0f78ab77d014803bbf858b` |
| Toolchain measured | rustc 1.98.1; near-sdk 5.29.0; serde-json-wasm 1.0.1; Binaryen 132.0.0 |
| Deployable candidate | `target/near/rivalghost_contract.wasm` |

Run `pnpm contract:check` from the repository. It checks Rust formatting, native contract tests, builds the optimized artifact, enforces the unchanged byte ceiling and exercises raw/optimized Wasm. `pnpm check` checks the application separately. Never deploy the larger raw Cargo artifact. The Rust compiler version is recorded here, not automatically pinned by a toolchain file; future compiler/dependency changes must pass the gate again. The small remaining margin matters: future v3/item features need a fresh size budget.

## What was changed

1. Replaced generated per-method JSON glue with a small integer-only Serde codec and shared argument/state helpers. Gameplay method names and valid JSON shapes remain available. Every gameplay entry point rejects attached NEAR. Initialization rejects an existing state, and now requires the contract account as predecessor. Deploy and initialize using that account's authorized key.
2. Arguments are capped at 8,192 bytes and eight nesting levels before JSON decoding. Unknown fields, duplicate fields, invalid account IDs, noninteger/overflowing integer values and malformed input are rejected. The host still reads the input before this bound is checked. Strict rejection of extra fields is an intentional tightening of the old SDK ABI.
3. Replaced per-type cached storage maps with immediate-write SDK maps, retaining the existing prefixes and Borsh layout. Writes avoid decoding discarded previous values. A regression test compares metadata and actual key/value bytes with the previous SDK map.
4. Kept certificate verification and host SHA-256/Ed25519 verification. Decimal certificate encoding matches unsigned boundary values and the existing TypeScript-signed fixture. No cryptographic checks or overflow checks were removed to meet the limit.
5. Kept only a player's latest challenge record. Starting their next flight removes the previous completed record; active challenges cannot be displaced. `get_active_challenge` filters completed records. `get_challenge` returns null for pruned history, so historical receipts must be archived off-chain. This does not retroactively clean abandoned history from a hypothetical older deployment; no deployment currently exists.
6. A winner can fund a defense only when at least the full 120-second challenge window remains. This prevents charging 20 CR for a round that cannot accept another flight.
7. The pinned optimizer restructures control flow and shrinks it again using restricted Wasm features. It does not enable SIMD, GC, tail calls, multi-memory or multivalue. Native NEAR host imports remain present.

## Review coverage and evidence

The review covered initialization and caller authorization; grant uniqueness; balance/escrow movements; Crown and player locks; win/tie/loss behavior; defense and closure; certificate domains, identity, mission, timing and signature binding; public input parsing; retained storage; and the build artifact.

- **19 Rust tests pass**, including signed win/loss, mission binding, grant reuse, initialization authorization, defense timing, storage compatibility and challenge pruning.
- **99 TypeScript tests pass**, together with application typechecking and production builds.
- Both actual Wasm artifacts execute the same TypeScript-generated v2 signed payout and a signed legacy tie/loss. Resulting storage is byte-identical between raw and optimized builds.
- The Wasm exercise rejects **62 calls per artifact**: uninitialized access, init takeover/reinitialization, invalid keys/accounts, attached deposits, malformed/oversized/deep JSON, unauthorized grants/seeding, lock conflicts, altered certificates, late settlement, duplicate settlement/expiry and invalid defense/closure.
- Ten repeated flight/expiry cycles retain **798 bytes of key/value payload** for the tested fixture, without growth. This number excludes NEAR trie/account overhead and code storage; it is not a deployed storage bill.
- Failed-call storage rollback is checked by a deterministic host double. The double models NEAR receipt rollback; it does not independently validate the network's VM, gas instrumentation or deployment compatibility.

The contract performs no asynchronous cross-contract calls, token transfers or NEAR withdrawals. CR is an internal integer ledger, not a redeemable token. Anyone may relay a valid settlement, but recipients come from the stored challenge and Crown, not a caller-supplied payout address. A trusted verifier attests gameplay; the contract does not replay the game itself.

## Resolved expiry finding

The creator approved forfeiture on November 13. Expired contract challenges and newly opened local ranked attempts now move the 10-CR entry as 8 CR to the bounty and 2 CR to the holder, exactly once. Withholding a losing replay no longer produces a refund. The Crown Pit warns about the two-minute settlement deadline, including pauses and disconnections, before entry. Already-open local attempts from the old version retain their original refund terms. There is no deployed contract to migrate. A separate verifier-outage remedy is still unimplemented; do not promise automatic outage refunds.

## Findings still open before public ranked value

| Priority | Finding and concrete consequence | Required follow-through |
| --- | --- | --- |
| High — legacy replay | v1 certificates omit the deployment domain. If the same verifier key is reused and challenge fields match, a certificate can be accepted on another deployment. v2 checks `near:testnet` and the exact contract account. | Retire v1 creation/settlement or migrate it to deployment-bound signatures before public operation. Use separate verifier keys in any interim isolated demo. Do not represent v1 as deployment-bound. |
| High — economic alignment | The on-chain operator grants 100 CR per new account; the contract has no global reserve cap. The local Workshop instead transfers grants from a finite 100,100-CR ledger. These are different economies. | Define and implement one funded supply model before connecting Workshop balances to NEAR. Add admission/Sybil controls; a browser identity is not proof of one human. |
| Medium — storage budget | Per-player challenge history is now bounded, but operator-created accounts and Crown records have no global quota or pruning. Closed Crowns remain stored. | Add bounded registration/active-round capacity and archival/cleanup, plus sponsor limits, before unattended public operation. A trusted operator is not a storage budget. |
| Medium — availability | The verifier key is fixed after initialization; there is no contract pause, key rotation or service-outage cancellation method. Verifier compromise can authorize fraudulent scores; outage can prevent settlement. | Design rotation/version overlap and a narrow recovery policy with regression tests. Contract-account upgrade access is powerful and must be secured. Never use the public test-fixture signing key live. |
| Release blocker — scope | This contract supports Crown rules v1 and expedition v2. Current gameplay/economy additions use v3 locally. Workshop items, market, restoration, NPC wallets and compute funding are not settled by this artifact. | Complete v3 protocol and asset/supply design before claiming on-chain ownership or linking valuable rewards. |
| Release blocker — runtime | No NEAR VM sandbox deployment, game-contract testnet receipt, measured per-method gas or live contract-storage bill exists. The operator is now funded with 10 testnet NEAR; the game contract remains undeployed. | Validate the exact hashed artifact in the NEAR runtime, record costs, then prepare a concrete deployment. |

## Cost implications

The size reduction lowers code-storage collateral, but does not remove execution or state costs. NEAR currently documents roughly **1 NEAR per 100 KB**. On that approximation, code alone is about **0.9945 NEAR** versus **1.7136 NEAR** previously, saving about **0.7192 NEAR** of locked collateral. Account/state overhead is additional. [NEAR storage documentation](https://docs.near.org/smart-contracts/anatomy/storage)

Using the documented deployment formula `0.58 + 0.13 × KB` with decimal KB gives about **13.508 Tgas**, or **0.001351 NEAR** at the example burn-price floor. These are planning calculations, not measured receipts. Current documentation also distinguishes upfront gas purchase price from burn price, so a sponsor needs more available balance than the eventual burned amount. Refresh network configuration when deploying. [NEAR gas documentation](https://docs.near.org/protocol/transactions/gas)

No funds were spent, accounts created, or contracts deployed during this work. NPC inference and staking costs are separate from this game contract's size. Developer-funded compute remains the chosen first-release model; player staking is future work.

## Operator setup follow-up

The creator has now created and funded `rivalghost-ops-thekal33d.testnet`. Read-only finalized RPC at block 277514809 confirms 10 testnet NEAR, 182 bytes of account storage and no contract code. This is account readiness only, not game deployment or runtime validation. No signing key was accessed during the verification.
