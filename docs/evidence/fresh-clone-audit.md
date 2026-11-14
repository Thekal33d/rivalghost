# Independent fresh-clone README rehearsal

> Independent report for the exact revision below. See the [evidence index](README.md#rehearsal-findings-resolved) for subsequent documentation fixes; original observations remain intact.

Rehearsal date: 2026-11-14. Public repository: https://github.com/Thekal33d/rivalghost. Revision: `9ea48aca1115756a69243a634bbf85d7f3375565`.

Clone: `<audit-workspace>/fresh-readme-audit`.

This evaluator started with no project implementation context, inspected the clone README and its linked guides, and followed documented commands. It did not inspect another checkout, private environment, credentials, or existing player database. No deployment, chain signing, funding, or external publication was attempted. Package downloads used existing machine caches, so this was a fresh source checkout rather than a pristine operating-system installation.

## Environment

- Darwin 27.0.0 / arm64 (Apple silicon).
- Node `v24.11.1`; npm `11.6.2`; pnpm `10.33.0`.
- cargo `1.98.1 (797e8a9bc 2026-08-05)`; rustc `1.98.1 (48a229cea 2026-09-01)`.
- Already-installed targets: `aarch64-apple-darwin`, `wasm32-unknown-unknown`, `wasm32v1-none`.
- The build script executed by `pnpm economy:check` requires `wasm32-unknown-unknown`. README does not list this prerequisite or `rustup target add wasm32-unknown-unknown`.

## Command log and observations

1. `git clone https://github.com/Thekal33d/rivalghost fresh-readme-audit`: sandbox DNS initially rejected GitHub; same authorized command with network access succeeded. This is an evaluator-environment limitation, not a repository defect.
2. `git rev-parse HEAD`: revision above.
3. `pnpm install`: sandbox DNS initially rejected npm. Network-enabled retry succeeded in 4.3 seconds with 540 packages. Warnings: ignored build scripts for `browser-tabs-lock@1.3.0`, `esbuild@0.28.1`, `secp256k1@5.0.1`. No `approve-builds` was run; documentation did not instruct it.
4. `pnpm check`: initial sandbox execution passed typechecking/build stages but failed six HTTP tests with `listen EPERM 127.0.0.1` and subsequent timeouts. Network/listener-enabled retry passed 165/167 tests; two expedition tests exceeded 5000 ms. This retry overlapped a first Rust compilation, so load is a confounder. Detailed log: `fresh-readme-pnpm-check.log`. The failed tests were `Ghost Signal rules v2 > every chapter can be cleared with every rig through normal inputs` and `local chapter remix v3 > clears every chapter with every rig and reproduces each expanded replay`.
5. `cargo test --workspace`: initial sandbox attempt failed crate-download DNS. Authorized retry compiles the full workspace. Detailed log: `fresh-readme-cargo-test.log`; final result appended below.
6. `pnpm dev`: starts Vite 8.3.8 successfully, printing `http://127.0.0.1:3000/`. Following README's `http://localhost:3000` also works. No `.env` copy required for free play.
7. `pnpm guest:serve`: succeeds without `.env` and prints `RivalGhost guest gateway: 127.0.0.1:8788; provisioning disabled; NEAR Auth disabled; NPC Cloud disabled`. Experimental SQLite warning is present and anticipated in guest guide.
8. `pnpm economy:check`: launches documented formatting/native/Wasm checks; initially waits on the concurrent native build lock. Detailed log: `fresh-readme-economy-check.log`; final result appended below.

Build output warns about browser-externalized `util` in `generate-function` and ineffective dynamic imports for `guest-key.ts`/`chain-client.ts`. These warnings did not prevent free-play startup and are not established runtime defects.

## Browser smoke

Opened exactly `http://localhost:3000` in the available in-app browser. A first-player flight-school dialog appeared. `SHOW ME THE CONTROLS` then `START GUIDED FLIGHT` launched Dead Air. Automatic firing, rising score, hull damage, evolving Fan rig, boss HP and Pulse cooldown were observable. Flight completed at 18,550 points, awarding the clear medal and unlocking Glass Mile, rival ghosts, Workshop and Needle rig.

Workshop opens after that clear and fetches the fresh guest service. It truthfully displays `LOCAL DEMO`, `NO WALLET`, `OPEN MY WORKSHOP`, 0 salvage, and a 100 demo CR claim description. Economic write/claim was not required to verify this startup path. Crown Pit visibly requires four story chapters; HOUND's Workshop commission requires six. No NEAR identity/signature was attempted.

Results display `AUTO-POSTED TO RIVALS` even alongside `CHOOSE A USERNAME TO AUTO-POST`; no username was created and no social post was requested in this rehearsal. At minimum that status label is confusing. The results copy describes automatic posting after a profile is configured, contradicting the linked social guide's explicit-only publication description.

## README and linked-document findings

### High priority: direct contradictions obscure what a judge can actually try

- README introduction says personal NEAR Auth login validation and public hosting remain release gates, while linked development status says personal login verified and public demo live. Linked NEAR Auth plan distinguishes old login receipts, new SDK flow requiring fresh human verification, and hosted callback rejection. README must distinguish historical evidence, current implementation, hosted configuration and verified end-to-end flow.
- Guest onboarding tells readers the exact origin is `http://localhost:5173`; README says exact `http://localhost:3000` and warns 5173 is rejected. Social play, living economy and Workshop walkthrough also prescribe 5173.
- Guest guide states contract size still fails and NEP-366 relay is not implemented. README presents a deployed 98,677-byte v3 economy and durable sponsored relay. It also makes broad no-accounts-funded/no-deployment claims that are stale beside current evidence.
- Living economy and Workshop guides describe Workshop/v3 as local-only/not on-chain, no configured Cloud account and no live inference; README says deployed economy and one successful paid inference. These should be visibly historical snapshots or rewritten around current local-demo versus hosted-on-chain modes.
- Social guide says uploads are always explicit; current UI says finished flights auto-post. Document opt-in/default behavior accurately and ensure status text does not falsely imply a successful post.
- Immersive-flight guide says competition remains v2 and cannot accept v3 results; README says competitive v3 certificates exist.

### High priority: first-run path has undocumented gates

- README directs a new player to Crown Pit/Workshop, but Workshop requires one chapter, Crown Pit four, and the HOUND commission six. List gates and give a short ordered judge walkthrough.
- README says choose Needle, Fan or Guard before a flight without explaining rig unlocks. Fresh player initially uses Fan and earns Needle after Chapter 01.
- README uses `Your Pilot`, `Leaderboard`, and `Save pilot`; the observed navigation emphasizes `ROOKIE ACE CUSTOMIZE`, `RIVALS`, and `OPEN MY WORKSHOP`. Align instructions with visible labels and explain which panel contains authentication.

### Medium priority: setup prerequisites and cost of validation

- Top-level quickstart omits Node/pnpm versions, Rust toolchain and Wasm target prerequisite. Node/pnpm guidance exists only after following the optional guest-service link. State the tested versions before install.
- The quickstart puts all JavaScript checks and a large native Rust compilation before first game launch. Separate a fast play path from optional developer/contract validation. This machine's first Rust build took minutes and substantial resources.
- No `git clone`/`cd rivalghost` command is provided for a judge starting from the repository page.
- `pnpm check` is sensitive to loaded machines at its default worker concurrency and five-second campaign test deadline. The linked NEAR Auth plan already recommends a four-worker successful run, but top-level command remains unrestricted. Report a realistic remedy only after reproducing it.
- No explanation accompanies skipped dependency-build warnings; if safe/expected, say so rather than leaving judges to broadly approve unknown build scripts.

### Links and credibility

All ten relative Markdown links from README resolve to files in the clone. No missing README-local link was found. External links embedded in historical guides were not exhaustively HTTP checked, and this audit does not claim they all work. Test counts vary across linked current-looking guides (59, 67, 88, 114, 130, 133, 145); this clone discovers 167 JavaScript tests. Timestamp and label old checkpoints or centralize the current evidence summary.

## Recommended acceptance bar for revised README

A new checkout can install with declared prerequisites, launch free gameplay without keys or Rust, and reach the documented demo panels through explicitly stated unlocks. Optional verification gives tested commands with the Wasm target setup. The README gives one accurate status matrix for local demo, deployed testnet contract, public host/auth, paid inference and future staking. Linked historical docs cannot override that matrix silently. A judge can find the public URL, contract evidence, core gameplay loop, and honest unresolved blockers without reconciling several development diaries.

## Final verification results

- `cargo test --workspace`: exit 0, 20 tests passed (19 legacy contract tests, one economy storage-compatibility native test). First compile took 7m09s.
- `pnpm economy:check`: exit 0. Raw Wasm 120,311 bytes; optimized Wasm 98,677 bytes. Both artifacts rejected 34 adversarial calls, retained 734 key/value bytes after ten no-growth cycles, and passed raw/optimized parity across finite CR, jobs, crafting, market, repairs, NPC wallets, Crown payouts, sessions and pause.
- Final `pnpm check`: exit 0, all 167 tests passed plus all workspace typechecking/builds. It ran after the expensive initial native/economy compilation; a separate cached legacy contract check overlapped early setup, so this is not a claim of an entirely idle machine. No source or test timeout changes were made. The initial unrestricted failure is resource-sensitive rather than a reproduced functional regression.
- `pnpm contract:check`: exit 0. Legacy optimized Wasm 99,448 bytes, strict 100,000-byte gate passed; SHA-256 `6815039240bff8213dc860f35939d8cb78c63d16cc0f78ab77d014803bbf858b`. Both raw and optimized artifacts rejected 62 calls, retained 798 key/value bytes across ten no-growth cycles, and agreed on ABI/authentication, payouts, rollback and closure.
- Final tracked-source status remained clean; only ignored generated files/local demo state were created. The rehearsal dev/guest servers were stopped and the temporary browser tab closed.

The top-level documented commands are executable on the tested pre-provisioned developer machine. The main shortcomings are absent prerequisites, slow first-play ordering, resource-sensitive default tests, and stale/mutually inconsistent linked instructions—not a failed contract reproduction.
