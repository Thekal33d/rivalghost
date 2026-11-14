# RivalGhost v3 economy contract review

> Contract findings and receipts below were recorded November 13, 2026. Later public deployment and device-account recovery are covered in [current status](development-status.md) and [device-wallet.md](device-wallet.md). Historical login gates and test counts below are not current release status.

November 13, 2026. The deployed testnet bytecode is **98,677 bytes**, below the strict **100,000-byte** ceiling by **1,323 bytes**. This is an implementation review with automated and live-runtime evidence, not an independent security audit.

## Deployment

- Account: `game.rivalghost-ops-thekal33d.testnet`.
- Artifact: `target/near/rivalghost_economy.wasm`; source: `contracts/economy`.
- SHA-256: `f80add454965b8c1edef65ce9ce45f1ba6c1d1ffa4654be0be43e940d986a090`.
- [Final upgrade receipt](https://testnet.nearblocks.io/txns/AUVVnrnz3CHgPThrBkCbw7nL6J949v2pPEppWUxHQrpj). Finality `FINAL`; deployed code hash checked; complete world state unchanged by upgrade.
- Reproduce: `pnpm economy:check` and `pnpm check`. Legacy Crown v1/v2 stays in a separate crate and is not the deployed game. Its [historical review](contract-review-legacy.md) is retained for comparison.

## Economic authority

The contract owns CR, salvage, item quantities/equipment, market escrow, fees, job rewards, shared repairs, Crown entry/bounty/payouts and NPC balances/budgets. Genesis is exactly 100,100 CR: reserve 99,400, HOUND 100, MOTH 600. A new pilot's 100 CR comes from the reserve once; no admin mint method exists. Gameplay, replay storage, profiles, story medals and AI inference remain off-chain. Cosmetic ownership is an internal ledger; it does not implement NEP-245 or claim external marketplace interoperability.

Signed game actions bind contract, testnet, actor, nonce, session epoch, deadline, operation and arguments. Only an account-authorized NEAR transaction can establish/revoke its device session; sponsored HTTP sessions cannot grant themselves economic authority. Sessions last at most 12 hours and cannot transfer native NEAR. Verifier certificates bind actor, reserved mission/seed, repair appearance, frozen bonus, sequence, expiry and key version. Replay settlement cannot supply arbitrary recipients. MOTH cannot invoke player actions; HOUND is limited to its Crown roles and capped spending.

Account registration is capped at 1,000; three Crown slots are reused; global listings cap at 200, five per seller; inventory and salvage are bounded. One active run and latest receipt are retained per player. JSON input is bounded to 8,192 bytes/eight nesting levels; binary certificates cap at 512 bytes. Every gameplay method rejects attached NEAR. All ledger transitions are synchronous and atomic.

## Evidence

- 114 TypeScript tests, type checking and production builds pass; 20 native Rust tests pass across both crates.
- Raw and optimized economy Wasm produce identical tested state. Both reject 34 adversarial calls; ten repeated job cycles retain constant storage for the fixture.
- Real testnet: two implicit players funded; delegated join/session authorization; actual replay reward and duplicate-result idempotency; craft/equip/list; second-player purchase; repair; HOUND seed; Crown entry/payout. All 100,100 CR including escrow remain conserved.
- Relay tests cover persisted signed transaction bytes before broadcast, uncertain-result reconciliation without a second debit, nested receipt failure, network/method restrictions and conservative allowance accounting.
- Auth tests use real local JWT/Ed25519 cryptography with mocked provider signing. The actual browser now reaches NEAR Auth's login form; personal login/MPC return is still pending. Do not describe that final step as passed.
- Public receipts and measured costs: `docs/evidence/economy-v3-testnet.json`; deployment: `testnet-setup.json`; build: `economy-v3-local.json`.

## Measured cost and storage

| Actual testnet operation | Gas burnt | Total outcome tokens burnt (test NEAR) |
| --- | ---: | ---: |
| Initial deploy + initialize | 9.449 Tgas | 0.00092256 |
| Final code upgrade | 7.853 Tgas | 0.00076298 |
| Delegated join + session | 4.691 Tgas | 0.00042451 |
| Verified recovery reward | 2.550 Tgas | 0.00023269 |
| Item purchase | 2.630 Tgas | 0.00024069 |
| Crown settlement | 2.574 Tgas | 0.00023509 |

These are measured receipt totals, not sponsor reservation limits, storage collateral or future price guarantees. After the upgrade, code plus account/state storage used 100,144 bytes; this does **not** mean the Wasm exceeds 100 KB. At NEAR's documented 10^19 yoctoNEAR/byte, that footprint requires about 1.00144 NEAR collateral. The contract was funded with 2 test NEAR; more players/listings require additional storage headroom before the 1,000-player cap can safely be filled. [NEAR storage](https://docs.near.org/smart-contracts/anatomy/storage)

The user approved up to 4 test NEAR. 3.3 was allocated across five service accounts; creation fees total approximately 0.035575 test NEAR. Later deployments, onboarding and relays spend from those funded accounts. No mainnet funds or AI credits were consumed by this integration.

## Remaining boundaries

- Trusted replay verifier can attest fraudulent scores if compromised; operator can pause/rotate verifier and the contract key can upgrade code. This is not trustless game execution.
- One account is not one human. Finite grants/caps limit exposure but do not solve Sybil farming or copied replay strategies.
- Pause blocks new spending while settlement and cleanup remain available. Expired Crown entries forfeit 8 CR to the purse and 2 CR to the holder; no automatic verifier-outage refund exists.
- One process must own each sponsor key and SQLite database. Unknown transactions block subsequent sends until reconciliation. Historical replay/receipt data needs backups and retention planning for public hosting.
- HOUND's bounded on-chain worker is running locally. Recurring AI inference, inference-driven on-chain focus updates, attestation verification and stake-to-compute remain separate work; no staking is active.
- Personal Auth0/MPC login, two-device recovery, hosted HTTPS callback and public concurrency tests remain release gates.
