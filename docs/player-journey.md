# Player journey and process feedback

New players begin with free Chapter 01 and the Fan rig. A skippable MOTH briefing leads into a real guided flight: steer, use Pulse, then finish the mission. Guidance responds to actual movement and Pulse use, can be hidden without restarting the flight, and can be replayed from Flight Deck → Replay Flight School. Closing a briefing does not award progress.

| Milestone | Unlocks |
| --- | --- |
| Finish the first story flight, even without a clear | Rival ghosts and sharing |
| Clear Chapter 01 | MOTH’s Workshop and Needle rig |
| Clear 2 chapters | Daily signal, Guard rig, crafting and equipment |
| Clear 3 chapters | Pilot market |
| Clear 4 chapters | Crown Pit |
| Clear 5 chapters | City restoration |
| Clear 6 chapters | HOUND commissions |
| Clear 7 chapters | NPC reactor information |
| Clear all 10 | Full campaign; pursue all 30 medals for Original Ace |

Locked entry points explain the requirement and return the player to their next mission. Newly earned unlocks appear on the result screen. Campaign chapters retain their existing sequential unlock rules. Rival, daily, workshop and commission flights do not award campaign clears.

Returning players with existing local flights or an acknowledged device-wallet backup retain feature access. Their medals are not altered. New players creating wallets after onboarding still follow the journey. Campaign progression and the journey remain browser-local, as before; these gates are a presentation layer, not trusted anti-cheat or contract authorization. Wallet recovery restores the wallet, not local campaign medals. Existing contract checks remain authoritative for balances, inventory, sessions, prices and verified rewards. Unlocking the NPC reactor does not enable paid inference or staking.

Wallet setup, recovery, authorization, economy actions and social mutations now expose pending, success and error states. Pending dialogs show actual request stages and elapsed time. Hiding them keeps the operation running and leaves a button to reopen progress. Successful actions use a brief completion notice; confirmed transaction hashes link to the testnet receipt. Errors preserve their message and provide recovery guidance where relevant. There are no automatic economic retries. Duplicate observers of the same pending mutation share one request; distinct concurrent actions are rejected while one is processing.

Dialogs use native modal focus containment, Escape/close controls, focus restoration, responsive scrolling and reduced-motion styling. A quick Space tap is now latched until the next simulation input tick so Pulse is not missed between animation frames. Simulation rules, replay format, contract and live economy configuration are unchanged.

## Validation

- Unit coverage for all unlock thresholds, migration, skip/completion, actual recorded flights, operation state transitions, concurrency and duplicate-request handling.
- Browser coverage for initial briefing, persisted skip, replay, movement/Pulse guidance, hiding guidance without a flight reset, feature gates, returning access, mobile fit, delayed requests, success, errors and prevention of duplicate submission.
- Device-wallet regression coverage for encrypted backup acknowledgement, reload, signed login and delegated authorization, password rejection/retry, lock, fresh-browser restore and re-upload while unlocked.

## Release evidence — 2026-11-14

- Published application revision `a1e78f8` to `https://rivalghost.xyz/` from a clean archive of committed main. Separate unfinished Flight Deck edits remain in the local working tree and were excluded.
- Typecheck, production build and all 163 tests in 33 files passed on the release source.
- The full guided-flight browser test reached a real result, recorded tutorial completion, displayed the first-flight rival unlock and retained onboarding state after reload.
- Browser checks passed against the exact release bundle and the public site. Public checks confirmed initial welcome, locked Workshop explanation, replayable guided flight, persisted onboarding, API health, embedded wallet enabled and on-chain spending enabled, with no browser errors.
- Before deployment, the service had no pending chain transactions; its SQLite database and runtime configuration were backed up. AI and HOUND automation remain disabled. No wallet purchase, staking transaction or paid inference was performed for this release.

## Wallet invitation on opening the game

Signed-out players see a wallet invitation in the hangar on each fresh page load. It explains on-chain CR/items and encrypted wallet recovery, offers **Connect my wallet**, and keeps **Play first — connect later** equally reachable. Close and Escape also dismiss it for the current opening; navigation and focus changes do not nag again. Dismissal is intentionally not persisted across fresh openings, as requested.

The invitation checks `/api/guest/me` and embedded-wallet availability. An actual NEAR/embedded account session suppresses it; a cached callsign, guest account or saved backup alone does not count as a wallet login. Failed or slow checks skip the invitation and release onboarding after a bounded wait. Flights and auth callbacks are never covered by this invitation.

The connect action opens Pilot Identity, focuses and scrolls to the device-wallet section, and does not create a wallet, sign anything or authorize spending automatically. New-player flight school follows the invitation when they return to the hangar or choose to play first. Campaign medals and best flights are explicitly described as device-local. The existing encrypted backup and game-session authorization flows remain unchanged.

Validation: frontend typecheck/build and all 163 tests passed. Production-browser checks cover signed-in suppression (embedded and NEAR), guest-only prompting, single-modal ordering, direct setup focus, no automatic mutations, dismissal/navigation/reload, Escape/free flight, failed/slow checks, disabled wallet service, and phone/landscape fit.

The encrypted-wallet regression also passed through the new invitation, including backup acknowledgement/reload, signed login and delegated game-session authorization, password retry and recovery in a second browser.
