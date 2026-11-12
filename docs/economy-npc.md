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
