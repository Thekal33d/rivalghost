# RivalGhost economy — current v3

The [contract](../contracts/economy/src/lib.rs) is the economic authority in public on-chain mode. The local server demo is a separate implementation for development; its balances are never imported to NEAR. CR has no cash value.

## Sources, circulation and consumption

Genesis fixes CR at **100,100**: reserve 99,400, HOUND 100, MOTH 600. Joining transfers 100 CR from reserve once. The current implementation has no mint method. Fees replenish reserve; they do not destroy CR. Conservation includes wallets, funded bounties and reserved/escrowed amounts, not just spendable balances.

| System | Rule | Economic purpose |
| --- | --- | --- |
| Recovery job | Destroy 12 enemies; 4 salvage plus a frozen focus bonus when applicable | Materials earned through a checked flight |
| Courier job | Rescue 2 couriers; 6 salvage plus applicable bonus | Alternative objective |
| HOUND commission | Score 12,000 without Pulse; 2 salvage and 8 CR from HOUND | NPC purchases a recording within its own funds |
| MOTH exchange | MOTH purchase quote `max(1, 5 - floor(stock / 8))`; player purchase price is 2 CR higher | Stock-sensitive two-way exchange |
| MOTH constraints | Stock cap 40, daily buying budget 80 CR, protected reserve 40 CR | Merchant cannot buy indefinitely |
| Afterglow | 4 salvage + 4 CR | Cosmetic crafting; materials consumed, fee to reserve |
| Ion Wake | 9 salvage + 6 CR | Cosmetic crafting |
| Sunflare | 12 salvage + 8 CR | Cosmetic crafting |
| Market | Item escrow; atomic transfer; 5% fee rounded down, minimum 1 CR | Player-to-player trade with bounded listings |
| District repair | Stages at 10, 30 and 60 contributed salvage | Shared material sink; changed scenery |

One successful claim per job per pilot per UTC day, reservations, signatures and replay certificates prevent a browser from simply asserting a reward. Salvage is intentionally earned/consumed rather than fixed-supply. Paid cosmetics never change damage, hitboxes or scoring. Rigs unlock through play.

## Crown Pit

A funded Crown begins with at least 20 CR. Entry costs 10 CR. A verified win returns the entrant's 10 and pays the existing bounty, transfers the recorded Crown, and closes the funded challenge. The winner may explicitly commit 20 CR to defend again; there is no automatic reinvestment. A verified loss, tie or expiry adds 8 CR to the bounty and pays 2 CR to its holder.

Expiry is consequential, not a free cancellation: read the displayed deadline before entering. Relay/verification outages can prevent timely completion. The trusted-server model and timeout policy remain prototype risks.

HOUND uses a separate NEAR account and real recorded runs. The code enforces a 60 CR/day Crown spending ceiling plus protected-balance checks; commissions have a separate 24 CR/day bound. This is rule-based NPC behavior. The public recurring HOUND worker is currently disabled, so the live board may have no active funded Crown. Historical receipts demonstrate execution, not continuous current activity.

## Who controls what

| State/action | Authority |
| --- | --- |
| CR, salvage, item ownership/equipment, listings/escrow, district contributions, Crown results | NEAR v3 contract |
| Flight inputs, score computation and replay validation | Deterministic simulation + trusted server verifier |
| Account owner and game-session authorization | Player's device owner signature; sponsored NEAR delegation |
| Economic action permission | Contract session key/epoch, nonce, deadline and operation checks |
| Profiles, leaderboard and shared replay storage | Node service + SQLite |
| Story medals and unlocked UI | Local browser save, not a security boundary |
| Upgrade, pause and verifier-key administration | Operator |
| NPC account keys | Operator-run service |

The contract checks certificates and settles once; it does not replay every frame. [Contract review](contract-review.md) details bounded storage, signatures, costs and tests. [Real receipts](evidence/economy-v3-testnet.json) cover rewards, two-player purchase, restoration and Crown settlement.

## Compute status

The NEAR AI Cloud adapter supports a restricted NPC focus choice and conservative persisted request reservations. One live inference succeeded; recurring inference is disabled and automated on-chain focus updates are not enabled. The model cannot set arbitrary transfer amounts or recipients. No staking, CR-to-compute conversion, TEE verification or player yield is active. [Recorded inference](evidence/near-ai-first-decision.json).

Older design history is retained in [living-economy.md](living-economy.md); it describes an earlier local-only milestone, not current deployment status.
