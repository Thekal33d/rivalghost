# RivalGhost — HOUND’s Crown economy

## Requirement check / 12 November 2026

The [official games track](https://nearhackathon.com/) calls for NPC wallets, player-owned markets and responsive economies. Its [market-town example](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/09-games.md) suggests NEP-245 items, social/email login, readable merchant reasoning and a fast-forward economy demonstration. That example is not a universal mandatory implementation checklist. RivalGhost currently uses nontransferable internal game credits, not NEP-245 inventory; browser-key login is not social/email recovery. Do not claim those integrations.

Before this milestone the contract had credit settlement rules, but the browser had no funded economy and HOUND had no decision-making service. Social scores alone do not establish track readiness.

## Play loop before implementation

- **Every 30 seconds:** dodge, rescue, build a chain, watch the actual rival ghost’s score. Economy never interrupts combat.
- **Every five minutes:** choose among three HOUND Crowns with different ghost styles. Pay 10 local demo CR to reserve a run. A win returns the entry and pays the existing bounty; a loss/tie transfers 8 CR to the bounty and 2 CR to its holder. A winner can keep the payout or explicitly stake 20 CR to open one defense.
- **Every session:** see who owns each Crown, its changing bounty, HOUND’s available balance and recent decisions. HOUND rehearses real input-only flights, chooses a strategy, attacks only within budget, or explains its pass. The same ghost/rules/rig/seed binds both pilots. All combat loadouts remain free. Practice stays available with zero CR.

## Character and meaningful choices

HOUND is a rival who wants its stolen flight recorder back but refuses to bankrupt itself. Pup is a direct chaser; Hound prioritizes rescues; Alpha reads incoming fire. Opening targets stay fixed during challenges. Counterflights choose among declared controllers, never inflate scores or edit health. Dialogue is authored from actual outcomes and balances. No LLM or sentient-agent claim.

The player chooses risk, target and whether to defend. Failure changes the next player’s bounty. HOUND’s limited bankroll changes what it can afford, and its decision log makes its reasoning inspectable. Retention should come from mastery and rivalry; no paid power, randomized purchases, punitive streaks or balance refills disguised as earnings.

## Implementation steps

1. Correct the NEAR contract’s empty-bounty challenge gate and defense eligibility; test credit conservation.
2. Add input-only NPC controllers, a readable budget policy, a persistent server-authoritative local Crown ledger, replay-bound settlement, timeout refunds, and automatic NPC decisions.
3. Mount the Crown Pit, balance/receipt views, ghost race and explicit defense in the game. Add an isolated seven-day simulation for judges.
4. Test economic invariants and gameplay, preserve v1/v2 settlement compatibility, measure the rebuilt Wasm, and commit each coherent milestone.

## Deployment boundary

The browser economy in this milestone is a clearly labeled **local, server-authoritative simulation**, with no cash value, transferability or gas spending. Its HOUND balance is a separate ledger wallet, not yet a funded NEAR account. It is not a substitute for the deployed track demonstration. Existing competitive contracts/verifier remain v2; local Crown flights use v3. A production bridge needs explicit v3 certification/versioning or a deliberately v2 competitive frontend, restricted sponsoring, real NPC signing authority, finality handling and transaction receipts. No fake settlement badge.

Finite demo credits start at 100,100 total: 100,000 in the grant reserve and 100 in HOUND’s wallet. A browser pilot may explicitly claim 100 once, transferred from the reserve. Entries, stakes, wins, losses and expiry move credits; they do not mint. This does not prevent Sybil browser identities and must not secure valuable assets without stronger identity/abuse measures.

## Implemented and verified

The **Crown Pit** is now playable via `pnpm dev` plus `pnpm guest:serve`. Claim the one-time demo grant, choose a fixed Crown target, pay 10 CR to reserve it, and fly against its real recorded ghost. The server re-simulates the run, issues an idempotent local receipt and updates balances atomically. Results explicitly distinguish beating a chapter boss from outscoring the Crown holder. A wall-clock reservation countdown stays visible during pause. Reloaded results can be retried from the Pit without paying twice.

HOUND starts with 100 CR and stakes 20 on each of three Crowns, leaving 40 available. It keeps a minimum reserve of 20. Every 15 seconds the server evaluates eligible player-held defenses; a successful rehearsal, positive estimated value, two-minute cooldown and a 60 CR daily attack ceiling gate its action. The confidence calculation is a declared heuristic, not a calibrated win probability. HOUND plays reproducible input-only flights and settles through the same simulation checks as players. It never claims an LLM or chain wallet is running when they are not.

The one-time defense is **per round**, not per holder. After it has been used and the Crown changes hands again, the purse remains closed until the 30-minute round ends. Expiry returns unclaimed bounty to the holder and unresolved entries to their challengers. There are no automatic player refills. NPC opening stakes also come from its existing balance; if it cannot protect its reserve, the Crown stays closed.

The isolated seven-day workbench uses scripted players and real generated replays. It includes HOUND counterattacks and shows daily NPC spending, purses, both pilot balances and conservation. Its decisions are inspectable and its results never write to real demo wallets. This is a counterfactual simulation, not live community activity.

### Implementation map

- `packages/game-data/src/hound-policy.ts`: single readable spending policy and explanation strings.
- `packages/sim/src/hound.ts`: three declared movement/Pulse controllers; no game-state mutation.
- `apps/relayer/src/economy.ts`: bounded SQLite ledger, atomic conservation checks, locks, canonical replay settlement, expiry and NPC ticks.
- `apps/web/src/CrownPit.tsx`: target board, wallets, receipts, explicit defense and judge workbench.
- `contracts/rivalghost/src/lib.rs`: rejects empty-bounty challenges and premature defense; still v1/v2 only.

### Bounds, failure cases and costs

One ledger row stores at most 1,000 player wallets, three Crown replays, the latest attempt/receipt per pilot and 60 recent events. Old receipts remain retryable until that pilot starts a new challenge. It is a bounded single-service prototype, not a historical indexer. A transaction checks that wallets + bounties + unresolved entries always equal 100,100 CR. The existing same-origin/session/body limits apply. Starts are capped at six per pilot per ten minutes; settlement and lab computation have quotas. Back up the existing guest SQLite file to preserve access and balances.

A timeout refund cannot distinguish an outage from a player withholding a losing replay; replay copying and new-browser grant farming are also possible. These limits make this unsuitable for valuable rewards. Before valuable settlement, design and validate anti-abuse rules, identity/recovery, completion/forfeit policy and fair network-failure handling. Practice remains free even when CR is depleted. The NPC needs the local service process running; it does not run independently on NEAR.

No gameplay frame, rehearsal or NPC tick performs a chain call. Future deployment should keep controller/replay data off-chain, store only compact balances/locks/hashes, and sponsor only bounded start/settle/explicit-defense transactions. This change adds no contract fields. At this milestone the optimized Wasm was 171,363 bytes. The subsequent [contract review](contract-review.md) reduced it to **99,448 bytes**, below the unchanged 100,000-byte ceiling. No measured gas bill or deployed storage figure is available.

### Evidence and remaining track gaps

75 TypeScript tests and 12 Rust tests pass. The eight economy tests cover one-time grants and restart persistence, locked entries, authenticated identity and mission binding, ties and 8/2 splits, duplicate settlement, expiry, budget rules, actual NPC takeover, and isolated seven-day conservation. Raw and optimized Wasm pass the same signed-settlement/storage smoke check. Browser QA confirms the one-time grant, reserved ghost flight, replay-checked loss receipt and updated 90/42/28 player/NPC/bounty balances, plus desktop/phone layout and the seven-day workbench. This is not a human retention study or multi-device release test.

Still required for an honest deployed hackathon demo: NEAR NPC account/signing authority, v3 protocol promotion or explicit v2 competition selection, restricted sponsored execution, real receipt/finality recovery, testnet storage/gas measurements, public hosting and human playtesting. Player-owned item trading, NEP-245 inventory and social/email recovery are not implemented. Decide whether to add these based on track fit and remaining time; do not present this local CR ledger as those features.
