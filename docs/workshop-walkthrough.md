# RivalGhost — Workshop walkthrough

Open **http://localhost:5173/** and choose **WORKSHOP ✳**. The five sections are present in the current browser build. For a new demo pilot, use **OPEN MY WORKSHOP** to claim 100 demo CR from the finite server reserve. Reconnect an existing pilot if you want their server wallet. These credits have no cash value.

## 1. Recovery Jobs — earn your materials

Choose a district in **FLY IN**, then **FLY JOB**. The three jobs are:

- **MOTH / Recovery line:** destroy 12 enemies for four salvage.
- **MOTH / Bring them home:** rescue two couriers for six salvage.
- **HOUND / Buy your ghost:** score 12,000 without Pulse for two salvage and eight CR. HOUND reserves the payment before launch; another pilot can race the successful checked recording.

MOTH's featured job gets one extra salvage, shown before launch. One successful reward per job per UTC day; missed objectives can be retried free. Replay checks determine success. HOUND buys a non-exclusive recording, not exclusive ownership of your ghost.

Below the jobs is **MOTH / SALVAGE EXCHANGE**: sell recovered salvage for CR or buy stocked salvage. Prices respond to inventory and MOTH has a finite wallet, reserve and daily purchasing budget. An empty shop cannot sell materials it does not have.

## 2. Craft & Equip — your item shop

Choose **CRAFT & EQUIP**, then craft an item and press **EQUIP TRAIL**:

| Item | Cost | Appearance |
| --- | --- | --- |
| Afterglow | 4 salvage + 4 CR | Coral ribbon and diamond sparks |
| Ion Wake | 9 salvage + 6 CR | Twin mint contrails |
| Sunflare | 12 salvage + 8 CR | Golden comet tail |

Your next flight displays the equipped trail. These are cosmetic items; they do not increase damage, speed or scoring. The three ship rigs and 36 pilot styles remain free.

The first satisfying loop is: **Recovery job → Afterglow → Equip → Fly again**. This connects playing well with an immediately visible reward.

## 3. Pilot Market — trade what you craft

Set **YOUR ASKING PRICE / CR**, then list an owned trail. One item is held while listed, preventing simultaneous use or sale of that copy. Another pilot can purchase it; cancelling returns it. The seller receives the price minus a 5% fee, floored with a one-CR minimum; the fee returns to the reserve. The empty state is intentional when nobody has listed anything.

This market is shared within the running server. A real second-device trade is still a release check; there are no fabricated sellers or purchases.

## 4. Rebuild the City — a shared goal

Choose a district and **DONATE 1** salvage. Shared repairs restore lights at 10, 30 and 60 pieces. The district appearance is captured when a flight launches, so another player's contribution cannot change your run midway. This is a cosmetic community sink; it does not alter competitive physics.

## 5. NPC Reactor — what runs MOTH's decisions

This screen shows reasoning, funding, stake connection and request usage. It currently reads **LOCAL POLICY / CLOUD NOT CONFIGURED** and **Not linked or verified**.

The server integration can let NEAR AI select MOTH's featured recovery job within fixed limits. Server rules retain control of prices, transfers and rewards; gameplay never waits for inference. The chosen model is a developer-funded pool first, individual player staking later. No wallet or Cloud account is configured, no stake has been placed and no live inference has been claimed.

## Where the chain fits

**Crown Pit** is a separate competitive loop. The current browser economy is server-authoritative and local; the optimized NEAR contract is a tested candidate for v1/v2 Crown settlement. Workshop ownership, crafting, markets and current v3 gameplay are not on-chain yet.

The next coherent release milestone is to reconcile the finite economy with v3 settlement and bounded asset storage, resolve legacy signatures, then validate the contract in NEAR's runtime. Account/Cloud setup and a concrete compute allowance can proceed alongside that work. See the accompanying contract review for findings and the passing 99,448-byte artifact.
