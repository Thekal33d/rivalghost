# RivalGhost Cost Model

**Status:** testnet planning baseline, November 2026. This is a guardrail document, not a promise of mainnet prices. It must be updated with measured testnet receipts before public launch.

## What the contract stores

The current contract stores one balance and grant flag per admitted player; Crown records; at most the latest Challenge and its index per player; and operator/verifier metadata. Crown records and operator registration have no global quota yet. Closed Crowns are retained. HOUND policies, replay bodies, Workshop items and activity history are off-chain; they are not fields in this contract.

The planned global limits below are requirements, not claims of implemented enforcement. Review findings and local payload measurements are in [the contract review](contract-review.md).

## Current NEAR cost assumptions

NEAR documentation describes storage collateral as approximately **1 NEAR per 100 KB**. Its gas guide gives a deployment estimate of `0.58 + 0.13 × code size in KB` Tgas and a gas-price floor example of `0.0001 NEAR/Tgas`. Account creation is documented as a fixed `0.007 NEAR` fee. These values are planning inputs, not a substitute for a network estimate at deployment time. [Storage](https://docs.near.org/smart-contracts/anatomy/storage) · [Gas](https://docs.near.org/protocol/transactions/gas)

| Item | Planning cap | Reason |
| --- | ---: | --- |
| Release Wasm | <100 KB | Keeps code storage near or below 1 NEAR equivalent. |
| Game-account funding buffer | 2 NEAR equivalent | Covers account creation, code/storage collateral, and a small execution reserve before measured costs replace this allowance. |
| Active Crown records | bounded | Stops board growth from becoming an uncapped storage liability. |
| Recent activity retained per Crown | 5 events | Enough for the UI without writing an indexer on-chain. |
| Replay/certificate payload on-chain | fixed hashes and compact fields only | Avoids expensive unbounded byte arrays. |

At the 100 KB code ceiling, the documented deployment-gas formula produces `13.58 Tgas`; at the documented floor example that is approximately `0.001358 NEAR` in gas, separate from storage collateral. The contract size must be measured from the optimized Wasm output, not inferred from Rust source size.

## Sponsored-write budget

The first testnet competitive loop sponsors at most two ordinary player writes:

1. `start_challenge` — locks the player’s 10 CR entry after finality.
2. `settle_challenge` — consumes one verifier certificate and performs exactly one payout.

`defend_crown` is an optional third sponsored write. Practice, Ghost playback, leaderboard reads, HOUND copy, and replay viewing are read-only or off-chain.

NEP-366 delegated actions are constrained to one receiver. The player’s delegated action therefore calls the RivalGhost contract directly with zero attached deposit. It does not attempt a NEP-141 or NEP-245 transfer, which requires a 1 yoctoNEAR attachment incompatible with the restricted function-call-key MVP. [Meta transactions](https://docs.near.org/protocol/transactions/meta-tx)

### Initial operational ceilings

These are launch-time circuit breakers for testnet, not economy rules:

| Control | Initial ceiling | Enforcement point |
| --- | ---: | --- |
| Sponsored contract calls per guest per day | 3 | Relayer preflight and contract unresolved-Challenge check. |
| Unresolved Challenges per guest | 1 | Contract. |
| Certificate submission attempts per Challenge | 2 | Relayer; the contract still rejects reuse. |
| Guest bootstrap requests per IP/account/day | 3 | Bootstrap service. |
| Relayer gas allowance per delegated action | 30 Tgas | Relayer build-time policy. |
| Relayer daily spend ceiling | 1 NEAR testnet equivalent | Relayer ledger and emergency pause. |

With the documentation’s example floor, 30 Tgas is about 0.003 NEAR in gas. Actual gas burnt, prepaid gas, receipt count, and account balance will be captured per method on testnet. The relayer pauses new sponsored writes before the daily ceiling is exceeded; it never silently switches the player to a paid flow.

## Measurement gate before deployment

No deployment should happen until the following values are recorded in `docs/cost-report.md`:

- optimized Wasm byte size;
- account creation cost and initial storage deposit;
- gas burnt and total tokens charged for `create_guest`, `start_challenge`, `settle_challenge`, `defend_crown`, expiry, and close methods;
- storage increase and decrease for a Crown, Challenge, settlement, and cleanup;
- relayer balance before/after a controlled batch of five guest flows;
- proof that replay payloads and UI assets did not enter contract state.

The deployment checklist must stop if release Wasm is 100 KB or more, a method permits unbounded storage growth, or measured costs exceed the sponsor cap without an explicit revised budget.

## UX decisions that keep cost out of the player’s way

- The arena, Ghost replay, and assets preload while entry finality completes; gameplay never polls the chain per tick.
- The result sequence is explicit: local result → replay check → settlement finality. CR values do not animate as final until contract state confirms them.
- A verifier or RPC outage creates a recoverable pending state. It does not convert an unavailable service into a player loss.
- Normal screens never make players understand gas, hashes, or wallet mechanics. Evidence is available in the optional Proof drawer for judges and advanced users.

## Explicit exclusions

This hackathon build does not deploy mainnet contracts, fund mainnet accounts, issue transferable tokens, or provide cash-out. Any of those requires a new cost assessment and explicit approval.

## Measured local artifact — November 13, 2026

Optimized **99,428 bytes**, raw **123,147 bytes**, SHA-256 `13c00ccfe2294110283287b930cf960a44d175211e96036313baae968ff8e3a9`. `pnpm contract:check` passes the unchanged `<100000` byte gate, 19 native tests and raw/optimized Wasm regression checks. Ten repeat flight/expiry cycles retained 798 key/value bytes in the host-double fixture, without growth. This excludes trie/account overhead and is not a network storage charge.

Code-only collateral is approximately 0.9943 NEAR under the documentation's rough ratio. Deployment formula estimate: 13.506 Tgas, about 0.001351 NEAR at the example burn floor. Neither figure is an actual receipt. Current gas documentation distinguishes purchase and burn prices; refresh the sponsor's upfront funding reservation against network configuration before enabling provisioning. Global account/Crown limits, v3 settlement, real NEAR VM execution and per-method gas measurements remain open.

## Guest bootstrap implementation checkpoint

The local pilot service spends nothing by default. Explicit testnet provisioning reserves child funding plus two 300 Tgas ceilings at the configured gas-price cap before any provider calls. Reservations and daily attempt limits persist in SQLite; uncertain attempts remain charged against capacity. Per-pilot provisioning is limited to three attempts per UTC day, while the HTTP IP limits apply per minute. These implemented bootstrap limits are distinct from the proposed competitive relay ceilings above. The NEP-366 relay is still unfinished. See [guest onboarding](guest-onboarding.md) for exact configuration and bounds.
