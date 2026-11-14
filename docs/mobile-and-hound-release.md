# Mobile journey repair and bounded HOUND activation

November 14, 2026. Application changes: `a092fc6` and `9002c3d` on main; final account spacing and validation in `d884b0f`.

## Mobile failure and repair

At 320 × 568, the previous public build placed the first post-flight walkthrough card outside the viewport while its blocker dimmed the entire page. The same regression check fails against the old build and passes against the replacement. Both guided and ordinary Chapter 01 flights actually defeat the first boss in the automated check; neither produces a browser exception.

- Walkthrough cards clamp to the visible viewport and keep dismissal/navigation reachable.
- Result actions stay at the bottom; transmission, unlock and sharing details use dismissible sheets.
- Workshop jobs and Crown targets have phone selectors and fixed primary actions. Desktop keeps the full comparison layout.
- Account setup comes before cosmetic customization. Account actions remain visible; extra bottom space prevents the action bar from covering the customization link.
- Moving account controls outside the customization form also prevents their buttons from inadvertently submitting a callsign change.
- Score-posting copy only says “posted” after a successful response.

Validation: 173 TypeScript tests pass; workspace type checks and production build pass. Isolated Chromium checks cover guided/ordinary first-boss clears at 320 × 568, 390 × 844 and 430 × 932, visible economic actions, dialog opening/closing, horizontal overflow, and desktop Crown cards. Existing audio checks also pass, including 844 × 390 landscape, mute, pause/resume, browser blur, and music-download failure. These are browser-emulation checks, not physical-phone testing.

Reproduce with a local production web server and an installed Playwright module:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright CHECK_URL=http://127.0.0.1:4192 node tools/check-mobile-journey.cjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright CHECK_URL=http://127.0.0.1:4192 node tools/check-mobile-economy.cjs
```

The browser checks use isolated API fixtures. They do not create accounts or send economic transactions.

## Activation evidence

At 13:38 UTC, all three Crown rounds were active with 20 CR bounties and actual replay scores of 19,820, 28,200 and 30,400. All three seed transactions finalized, no transaction remained pending, and HOUND retained 20 CR. See the [timestamped evidence and transaction hashes](evidence/hound-activation-2026-11-14.json). Both first-boss browser checks also passed against the public site.

## HOUND operating limits

The live worker uses `hound.rivalghost-ops-thekal33d.testnet`, separate from player sponsorship. It executes deterministic, replay-verified flights; no scores are invented.

- Maximum **16 HOUND-signed actions per UTC day**, with a **0.48 test-NEAR gas reservation cap**. Reservation is a conservative ceiling, not actual gas spent.
- Eight historical actions had already consumed the initial eight-action allowance on activation day. They remain in the journal; the 16-action cap permits eight additional actions that day. No budget records were reset.
- Existing contract rules retain the **20 CR reserve**, **60 CR/day challenge-entry budget**, **24 CR/day commission budget**, and two-minute attack cooldown. Crown seeding/defense is separate from the challenge-entry budget.
- Player/maintenance relay limits remain unchanged. Unused allowance does not carry forward.
- Crown rounds last 30 minutes. This bounded pilot may exhaust its daily transaction allowance; all-day availability is not promised. Empty or expired Crowns remain visibly unavailable until a round can be funded.
- Already-signed pending transactions resume with identical bytes. HOUND saves its intended replay before paying an entry and resumes an active flight after restart before considering a new entry.

The live service is the sole HOUND worker. The local environment remains disabled. The live database, replay journal and budget history were preserved, with a protected rollback backup before deployment. No new contract deployment, mainnet transaction, AI charge, or staking action was performed.

## Why NEAR AI was off at this checkpoint

**Superseded later November 14:** [bounded Cloud-to-contract updates are now live](near-ai-live-focus.md). The following describes the gap before that release.

The separately tested NEAR AI Cloud adapter currently updates the local-demo economy only. In on-chain mode, the heartbeat runs `ChainEconomy.tick()` and returns before the Cloud decision path. A live model decision still needs validated, journaled operator-authorized contract configuration, budget/retry handling and evidence of the resulting state change. Merely enabling the API key would not implement that path.

The public NPC Reactor now states this limitation. The prior successful Cloud inference test is retained as integration evidence, not presented as live autonomous contract reasoning.
