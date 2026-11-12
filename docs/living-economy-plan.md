# RivalGhost — living economy implementation

## Milestones
1. Extend the existing conserved CR ledger with MOTH, verified recovery jobs, HOUND commissions, crafting, escrowed player listings and district repair contributions. Keep migration additive and test rollback, replay binding and retries.
2. Build a playable Workshop: launch free jobs, receive checked receipts, equip visible cosmetic trails, trade with pilots and MOTH, restore districts, race commissioned ghosts. Freeze district stage and mission seed at launch; preserve existing story/competitive rules.
3. Add a server-only NEAR AI Cloud advisor with bounded calls, caching, timeouts, deterministic fallback and validated choices. AI may choose a recovery focus; it may never mint credits or move assets directly.
4. Expose truthful compute status and documented stake-to-inference setup. No real stake, funding transaction, or paid inference until an account, provider configuration and spending authorization exist.
5. Verify complete local flow, responsive UI, negative economic cases and existing regressions; commit each milestone.

## Trust and cost boundaries
The local economy remains a server demo, not a NEAR settlement. Existing v2 contract cannot certify v3 campaign recordings. Replay verification checks the simulation, not human play; copies, bots and new identities are not suitable for valuable rewards. No transferable token claims until the asset/auth/settlement contract is implemented and deployed.

One finite 100,100 CR ledger includes Crown bounties and entry escrow. MOTH receives 600 from the existing reserve once. CR cannot buy inference or redeem NEAR. Salvage is earned with capped daily jobs, consumed by crafting/repair, or purchased by MOTH within its inventory and daily budget. Craft fees and listing fees return to reserve. NPC ghost commissions retain real replays and remain non-exclusive.

Stake-to-inference is a funding rail for NEAR AI Cloud, not a game reward. Official docs describe staking rewards becoming Cloud credits; value varies with price and reward rate. The currently published overview does not provide a contract address or transaction schema sufficient to safely construct a stake transaction. Use the official operator workflow until those are verified. Do not invent a staking endpoint, balance or attestation.

Sources: https://docs.near.ai/cloud/staking-for-inference/overview ; https://docs.near.ai/cloud/guides/usage-reporting ; https://nearhackathon.com/
