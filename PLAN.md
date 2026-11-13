# RivalGhost On-chain Economy and NEAR Sign-in Implementation Plan

## Overview
Replace the local economic authority with one bounded NEAR testnet contract. CR, salvage, owned cosmetics, escrow, market trades, repairs, Crown payouts and NPC budgets must settle there; deterministic gameplay and replay files remain off-chain.

The existing playable alpha and historical plan are preserved. This plan supersedes the old Crown-only deployment scope. No live economy deployment has occurred; the old optimized artifact is 99,448 bytes.

## Goals
- One authoritative economy, visible finalized receipts and no duplicate rewards.
- NEAR Auth sign-in with a developer-funded sponsor and explicit scoped game-session consent.
- Preserve ten chapters, existing play controls and cosmetic-only purchases.
- Commit every verified milestone using Thekal33d <jimohkhalid16@gmail.com>.

## Non-Goals
- Mainnet, cash-out, real-money player stakes, on-chain frame simulation or paid combat advantages.
- Claiming off-chain replay verification or AI inference is trustless.
- Claiming NEP-245 compatibility without implementing and testing that standard separately.

## Assumptions and Constraints
- Strict deployed Wasm limit: less than 100,000 bytes; retain the unchanged legacy gate too.
- Operator: rivalghost-ops-thekal33d.testnet; reported balance 10 test NEAR.
- AI pilot allowance $5 overall, current local reservation cap $1; recurring paid calls remain disabled after the one approved successful live test.
- One bounded pilot record per account, maximum 1,000 players; three reusable Crown slots; at most 200 listings; bounded per-player receipts and active runs.
- Proposed fresh on-chain balances; story progress retained. User migration choice pending.

## Requirements
### Functional
- Finite 100,100 CR genesis: reserve 99,400, HOUND 100, MOTH 600; grants transfer 100 from reserve once. No mint admin method.
- Implement replay-attested daily recovery, courier and commission rewards, frozen mission context, expiry and single-use settlement.
- Implement MOTH stock/prices/reserve/daily spending, crafting recipes, owned equipment, listing escrow, cancel/buy/fees and district repair burns.
- Implement Crown seed/entry/win/loss/expiry/defense/closure and on-chain NPC spend constraints.
- Authenticate every economic action by the actor's NEAR transaction or a signed scoped session intent. HTTP login alone is insufficient authority.
- Bind certificates and intents to testnet, current contract, actor, sequence and expiry. Verifier cannot transfer inventory or mint CR.
- Read finalized state before reporting settlement. Network failure never substitutes a local ledger write.
### Non-Functional
- Keep gameplay free of chain waits after a flight reservation is finalized.
- Bound state and JSON input sizes; use integer accounting and transaction rollback.
- Keep keys server-only or non-exportable browser keys; no secret in Git, browser bundle or logs.
- Disclose trusted verifier, upgrade authority, session rights and sponsor limits.

## Technical Design
### Data Model
Compact contract state contains configuration, reserve and aggregate counters, NPC policy counters, ten district levels, three Crown slots, bounded marketplace entries, player maps, session authorization, one current run and most recent action receipt per player. Replay content hashes reference stored off-chain recordings. Historical transaction receipts live off-chain and on the chain explorer.
### API Design
Versioned v3 contract API separates initialization, account/session registration, signed economic actions, verifier settlement, bounded housekeeping, governance and views. Shared TypeScript encoding and cross-language fixtures define signatures. The relayer submits only validated game actions to the configured contract and records transaction hashes for uncertain outcomes before any retry.
### Architecture
Browser intent -> browser signature -> sponsored relayer -> contract authorization -> atomic ledger mutation -> finalized receipt -> UI refresh. Replay -> deterministic verifier -> domain-bound certificate -> contract validation and payout. NEAR Auth supplies identity ownership proof; explicit session authorization delegates only the game's internal assets, never NEAR transfers.
### UX Flow
Free play remains available. Sign in/link pilot, explicitly authorize the game session, claim the finite starter allocation, then use Workshop or Crown Pit. Show confirming, confirmed and recoverable failure states; require confirmation before charging entry. Session expiry prompts reconnection without discarding flight recordings.

## Implementation Plan
### Serial Dependencies (Must Complete First)
1. Freeze policy and shared ABI; establish the compact v3 artifact and size measurement.
2. Implement all economic transitions with supply, ownership, authentication and replay protection tests.
3. Freeze certificate/session formats before adapting the verifier and browser.
### Parallel Workstreams
These are architectural boundaries; work will run serially in this task.
- Contract: bounded ledger, Crown/jobs/market/NPC policies, expiry, pause and verifier rotation.
- Auth and relay: sponsor setup, explicit scoped consent, device signatures, budgets, durable transaction recovery.
- Game client/verifier: v3 simulation, settled views and receipts, frozen mission/repair context, honest chain/demo labels.
### Merge Phase
Connect every economic button and NPC mutation to the chain adapter. Exercise sign-in, grant, jobs, market, repair, Crown settlement and restart recovery against a real NEAR runtime, then funded testnet. Enable publicly only after evidence is recorded.

## Testing and Validation
- CR conservation including all escrow; asset creation only from bounded verified rewards/recipes; invalid/duplicate/expired/mismatched actions rejected.
- Two-player trading and Crown races, cross-contract signatures, session expiry/revocation, daily rollover, failed transaction rollback and storage caps.
- Shared TypeScript/Rust signature fixtures and raw/optimized Wasm behavior parity.
- Existing TypeScript/Rust checks plus new economy tests; actual runtime gas/storage measurement before deployment.
- Browser callback, account linking, refresh recovery and mobile/desktop confirmation flow.

## Rollout and Migration
Keep local demo usable until on-chain mode is validated. Deploy to a new testnet contract; no deployed legacy state exists to migrate. Do not import unverified demo balances automatically. On-chain mode fails closed for mutations; rollback pauses new spending and preserves settled chain ownership, never rewrites it from local state.

## Verification Checklist
- [x] Inspect existing implementation, budget and deployment state.
- [x] Compact v3 contract builds below 100,000 bytes (98,620 bytes).
- [x] Core conservation, ownership, signed result/action and bounded-history Wasm checks pass; live integration checks remain.
- [ ] Auth sponsor and real callback validated.
- [ ] Browser economic actions and NPC actions settle on-chain.
- [ ] Real runtime gas/storage and bounded growth measured.
- [ ] Public testnet end-to-end receipts recorded; hosting configured.
- [ ] Commit and push each milestone.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Bytecode growth | High | High | Compact replacement; measure before wiring; keep strict gate |
| Auth provider/API drift | Medium | High | Pinned upstream protocol, real callback/signature test |
| Verifier or operator compromise | Medium | High | Narrow authority, bounded rewards, pause and rotation; disclose trust |
| Sponsor depletion/uncertain RPC result | Medium | High | Daily caps, persisted transaction identity, finalized reconciliation |
| Sybil grants | High | Medium | Fixed reserve/player cap; test CR only; no claim of unique humanity |
| Deadline pressure | High | High | Evidence-based milestones; never label a local demo as deployed |

## Open Questions
- [ ] Fresh on-chain economy or explicitly reviewed demo migration?
- [ ] Final domain and VPS deployment access/method; existing CX23 server capacity alone is not a deployment configuration.
- [ ] Dedicated auth/game sponsor accounts, protected key files and measured testnet allowance.

## Decision Log
| Decision | Rationale | Alternatives Considered |
|---|---|---|
| One compact v3 economy contract | Full economy within requested per-contract size ceiling | Expanding legacy ABI or hiding size across multiple contracts |
| Explicit signed game sessions | Smooth play while preserving player authorization | Server session alone, OAuth on every shop action |
| Finite genesis supply | Preserve local policy and avoid unlimited admin minting | Uncapped starter grants |
| Developer-funded inference | User preference; no required player stake | Player stake-to-compute at launch |
| Preserve legacy contract as reference | Existing fixtures remain reproducible | Destructive overwrite before replacement validation |
