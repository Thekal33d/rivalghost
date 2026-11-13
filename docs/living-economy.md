# RivalGhost — living economy & NPC compute

November 13, 2026 · implementation checkpoint

## Play it
Open http://localhost:5173/ and choose **Workshop**.

1. Open your demo wallet if this is a new pilot. The 100 CR grant comes from the existing finite reserve.
2. Fly MOTH’s free recovery job: destroy 12 enemies. A server replay check awards four salvage, plus one if this is MOTH’s featured focus. A missed objective can be retried for free.
3. Craft **Afterglow** for four salvage and four CR, equip it, then launch a flight to see the coral wake.
4. Recover more cargo to craft Ion Wake or Sunflare, sell salvage to MOTH, list a cosmetic for another pilot, or contribute to the city.
5. Try HOUND’s commission: 12,000 points without Pulse. His eight-CR payment is reserved at launch, and the successful recording becomes a free practice rival in the Workshop archive.

This is a **working local server economy**, not NEAR settlement. Items, CR and restoration live in this server’s SQLite database. The existing 36 free pilot styles and all rigs remain free. Paid items never change combat stats or hitboxes.

## Connected systems

| System | Implemented behavior |
| --- | --- |
| MOTH salvage exchange | One-time 600 CR funding transferred from the existing reserve. Buy price is `max(1, 5 - floor(stock/8))`; sale price is two CR higher. Inventory cap 40, daily purchase budget 80 CR, protected wallet reserve 40 CR. Server rejects stale quotes. |
| Recovery jobs | Three objectives available across all ten districts. One successful reward per job per UTC day. Every launch binds a pilot, random seed, chapter, rig, rules, focus bonus and district stage. Fifteen-minute reservation; cancellation releases a commission. |
| Crafting | Afterglow 4 salvage + 4 CR; Ion Wake 9 + 6; Sunflare 12 + 8. Materials are consumed; fees return to reserve. Equipped trails render in flight. |
| Player market | An item leaves usable inventory while listed. Atomic purchase transfers it to the buyer and CR to seller/reserve. Fee is 5%, floored, minimum one CR. Up to five listings per pilot, 200 globally; asking prices 1–200 CR. Cancellation returns the item. |
| Ghost commissions | Eight CR from HOUND, protected 20-CR reserve and 24-CR daily commission allocation. Funds are held before flight and returned on failure/cancellation/expiry. Successful non-exclusive recordings are retained (latest 30, latest 12 displayed) and can be raced. No invented trades or royalty claims. |
| District restoration | All pilots contribute to ten shared material sinks. Scenery changes at 10, 30 and 60 contributions. The launch captures its stage; subsequent repairs never change an ongoing flight. Recovery jobs use separate mission seeds. Existing v3 chapter mechanics remain unchanged. |
| NPC reasoning | Deterministic MOTH policy works now. Configurable NEAR AI chooses one of two valid recovery focuses. A chosen job gets a fixed +1 salvage, frozen at launch. The model cannot select prices, wallet amounts, transfer recipients or arbitrary tools. |

The original **100,100 CR conservation invariant** includes Crown bounties, entries, NPC/player wallets and commission escrow. These systems share one ledger and commit atomically. Materials are deliberately earned and consumed; they are not part of that CR invariant.

## NEAR compute and stake-to-inference

Decision confirmed by the creator: **developer-funded NPC compute pool first; optional individual player staking later.** Neither the Cloud account nor wallet is set up yet.

The implemented server adapter calls NEAR AI Cloud’s documented Chat Completions endpoint. It sends only inventory/restoration counts, accepts an exact allowlisted JSON choice, caps output at 64 tokens, uses an eight-second timeout, shares concurrent work, and persists request reservations before network calls. Requests are spaced at least six hours apart, with a configurable daily cap (maximum 24; six-hour spacing further limits calls). Failures still count against the allowance and use a local fallback. Flight simulation never waits for AI.

No live request was made. The adapter is tested with provider doubles. **This version does not verify TEE attestation or response signatures**; it never labels ordinary API output as cryptographically verified. Route privacy depends on the selected model. The current NEAR inference SDK’s Node runtime requirement is newer than the repository’s baseline, so verified SDK integration remains separate work.

A read-only staking adapter can request the provider’s farm configuration and the expected organization’s farm state. It checks account/organization/configuration binding, handles stale/unknown values, and caches results for five minutes. The UI distinguishes provider-reported farm credits from spendable balance and independent chain verification. It cannot stake, bind an account, sync funds, or withdraw.

The official overview describes staking rewards funding eligible Cloud credits. This is not free unlimited compute, a return paid to players, or a conversion of game CR into NEAR. Use provider terms for withdrawal timing and risks. The API index currently marks some farm routes deprecated while individual reference pages still document them; confirm their availability with the operator account before enabling reporting. No contract address or wallet transaction is invented from these pages.

Primary references:
- [Staking overview](https://docs.near.ai/cloud/staking-for-inference/overview)
- [Farm configuration API](https://docs.near.ai/api-reference/staking-farm/get-staking-farm-configuration)
- [Organization farm API](https://docs.near.ai/api-reference/staking-farm/get-organization-staking-farm-state)
- [Chat Completions API](https://docs.near.ai/api-reference/chat/create-chat-completion)
- [Verified JavaScript SDK](https://docs.near.ai/cloud/inference-sdk/javascript)
- [NEAR hackathon](https://nearhackathon.com/)

## Operator activation — pending accounts

1. Create a NEAR wallet and a [NEAR AI Cloud](https://cloud.near.ai) organization. Keep private keys/seed phrases out of chat and source control.
2. Confirm the provider’s current wallet-linked staking flow, contract/network, withdrawal rules and organization eligibility. Review a concrete amount and transaction before staking. RivalGhost does not require player staking to play.
3. Place the inference key and a supported Chat model in the server environment: `NEAR_AI_API_KEY`, `NEAR_AI_MODEL`. Set an approved `NEAR_AI_DAILY_REQUESTS` allowance and provider-side monetary spending limit. Request caps are not a dollar-denominated hard cap.
4. Only after authorization, set `NEAR_AI_ENABLED=true`. A small live smoke call must validate the selected model, actual usage and fallback before public release.
5. Optional farm reporting uses a **separate server-only NEAR-authenticated access token**, `NEAR_AI_STAKE_ACCESS_TOKEN`, the user’s default `NEAR_AI_ORGANIZATION_ID`, and expected `NEAR_AI_STAKE_ACCOUNT`. An inference API key is not a substitute for that token. Do not prefix any secret with `VITE_`.
6. Confirm reporting identity and freshness against the operator’s dashboard. Unknown or failed reports stay unknown; do not infer funded status from a configured key.

Future individual staking needs its own authenticated account-binding/consent/withdrawal flow. It must not grant combat power or force staking to enter a game.

## Validation and honest limits

- Full `pnpm check`: **88 tests**, typechecking and production build passed. Subsequent backend hardening passed all 21 focused economy/compute tests.
- Tests cover conservation, migration, wallet reserve, commission escrow/refund, replay/identity binding, duplicate claims, invalid quotes, atomic inventory transfers, rollback, cancellation and frozen district stages.
- Compute tests cover disabled operation, concurrent request sharing, persisted daily caps, invalid model actions, outages, oversized responses, cache behavior and farm identity mismatch.
- Browser QA: a real free recovery produced a checked cargo receipt; that salvage crafted Afterglow, which was equipped and visibly rendered in desktop flight. Mobile Workshop layout and truthful disabled Reactor status were inspected. Prior medals and canonical chapter best stayed intact.
- This is not proof of human play. Automated/copy-generated inputs and new identities are not safe foundations for valuable rewards. Public operation needs abuse controls, stronger identity, moderation and recovery.
- Multi-device market interaction, live Cloud/model compatibility, stake activation, real phones and public hosting remain unverified.
- NEP-245 asset custody/trading and v3 settlement are **not implemented on NEAR**. The subsequent contract review reduced the optimized artifact to 99,428 bytes, below the original 100,000-byte target, and tightened initialization, challenge retention and defense timing. See [the review](contract-review.md) for unresolved release findings. No deployment costs were incurred.
- OutLayer replay attestation is not integrated: it would require a compatible deterministic WASM verifier, version binding, funded execution and verified result callbacks. The current provider choice is NEAR AI Cloud for bounded NPC decisions.

## Next release milestones

1. Create operator accounts and approve a concrete compute budget; validate live inference and stake reporting.
2. Decide and implement the v3 settlement/asset contract, identity and sponsorship boundaries before enabling valuable trading; measure storage/gas and resolve the Wasm size gate.
3. Host the server/UI, configure a repository remote, run a second-device pilot market test, and capture the real judge walkthrough.
