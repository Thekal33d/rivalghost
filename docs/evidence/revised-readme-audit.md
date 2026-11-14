# Independent revised README rehearsal

> Independent report for the exact revision below. See the [evidence index](README.md#rehearsal-findings-resolved) for subsequent documentation fixes; original observations remain intact.

Date: 2026-11-14. Repository: https://github.com/Thekal33d/rivalghost.

Audited revision: `68a9d9781730bed940e7b1260d431d3c1705631f`.

Second new clone: `<audit-workspace>/fresh-readme-revised`.

## Scope and independence

This is a second checkout of the remote repository, not an update of the first rehearsal checkout. Source, configuration and database were fresh: neither `apps/relayer/.env` nor `apps/relayer/.local/guests.sqlite` existed before startup. No private key, operator environment, deployment, funding, account creation, or signed economic action was used. The evaluator read the revised README and linked instructions/evidence. Changes made by the primary author after this revision are outside this report.

Caches are disclosed: pnpm used the machine package cache; `target` was symlinked to `../fresh-readme-audit/target` only for compiled Rust dependency/build artifact reuse after the JavaScript check. The first rehearsal already performed a full fresh native build in 7m09s. This rerun is not a clean OS/toolchain test. The in-app browser retained Chapter 01 progress from the first localhost rehearsal; no existing browser data was cleared. First-player onboarding was independently verified with fresh browser state in the first report; the second browser smoke verified loading/interaction against the new checkout but does not claim a new browser profile.

Environment unchanged: Darwin 27.0.0 arm64, Node 24.11.1, npm 11.6.2, pnpm 10.33.0, cargo 1.98.1 (797e8a9bc 2026-08-05), rustc 1.98.1 (48a229cea 2026-09-01).

## Revised quickstart

Commands were run from the second clone. Required sandbox exceptions allowed registry/network access and local HTTP listeners; they do not represent project failures.

| Command | Result |
| --- | --- |
| `git clone https://github.com/Thekal33d/rivalghost fresh-readme-revised` | Fresh remote clone succeeded; exact revision recorded above |
| `pnpm install --frozen-lockfile` | Exit 0; completed in 18.1s using pinned pnpm 10.33.0 |
| `pnpm dev` | Vite started on 127.0.0.1:3000; documented localhost:3000 browser origin rendered the game |
| `pnpm guest:serve` | Built and started gateway at 127.0.0.1:8788 without .env; provisioning, NEAR Auth and NPC Cloud disabled |
| `curl --fail http://localhost:3000/api/guest/health` | Exit 0; exact expected body `{"ok":true}` |
| `pnpm check` | Exit 0; 33/33 test files, 167/167 tests; all typechecks and production builds passed; test phase 3.19s |
| `rustup target add wasm32-unknown-unknown` | Exit 0; already up to date |
| `rustup component add rustfmt` | Exit 0; already up to date |

Both dev processes and the temporary browser tab were stopped before `pnpm check`. JavaScript validation completed before economy validation started. No source files were edited to make commands work.

Installer still warns that browser-tabs-lock, esbuild and secp256k1 build scripts were ignored. Builds still warn about browser-externalized util and ineffective dynamic imports. These are nonblocking observations; no blanket approve-builds action was needed.

## Documentation/link review

All 38 README local link/image targets exist in this revision. The new public URL, image provenance, progression table, finite-economy explanation, trust limits, fast-play path and serial validation instructions make the entry path substantially clearer.

The contradictory 5173 guidance is removed from the linked guest/social instructions. Local demo versus hosted on-chain economy is explicit. Guest onboarding distinguishes local identity from the funded public device-account path. Historical contract review is visibly marked as historical, and the evidence index separates current read-only state from old receipts and test counts. The revised social guide correctly describes auto-posting after a social profile exists.

Remaining minor wording issues at this audited revision:

- `docs/social-play.md` step 1 still says **Your Pilot**, while the observed navigation says **Customize**. The root README already uses the visible label.
- The social guide describes automatic posting but omits the visible setting to turn it off. Documenting that choice would improve consent clarity.
- The install's skipped-build-script warnings remain unexplained; the commands nevertheless work without approving those scripts.
- The game result UI from the first rehearsal displays **AUTO-POSTED TO RIVALS** even when it also asks the player to choose a username. Documentation now describes the correct eligibility, but that runtime status label remains potentially misleading. This documentation-only revision does not repair it.

No new setup blocker was found. All public account creation/recovery/economic transaction statements remain supported by linked historical evidence rather than newly reenacted by this evaluator; this read-only rehearsal deliberately made no sponsored account or transaction.

## Final contract and public-script checks

- `pnpm economy:check`: exit 0. Formatting and 20 native tests passed. The economy crate was recompiled from the second checkout; cached dependencies were reused. Raw Wasm is 120,311 bytes and optimized Wasm is 98,677 bytes. Each artifact rejected 34 calls; ten repeated-job cycles retained 734 key/value bytes without growth. Raw and optimized behavior agrees across ledger conservation, jobs, crafting, market, repairs, NPC wallets, Crown payouts, sessions and pause.
- `node tools/read-public-status.mjs`: exit 0 at `2026-11-14T13:09:41.806Z`, no stderr. Health was true, chain mode onchain, and embedded testnet account flow enabled. Finalized bytecode at block 277661151 was exactly 98,677 bytes with SHA-256 `f80add454965b8c1edef65ce9ce45f1ba6c1d1ffa4654be0be43e940d986a090`, matching README and locally reproduced size. Finalized get_world at block 277661152 returned version 3, total_cr 100100 and paused false. It reported seven registered accounts and current storage 101,268 bytes; those changing state fields naturally differ from the earlier six-account snapshot and do not invalidate dated evidence.
- The script was inspected before execution: three public configuration/health GETs and finalized NEAR query requests for view_account, view_code and get_world, with no private environment reads, signing, funding or transaction submission.
- Full public output is preserved as `revised-readme-public-status.json`; stderr file is empty. Source `git status --short` is clean.

Conclusion: the revised README passes this fresh-source rehearsal. Its commands launch free local play and a fresh demo service without secrets, complete JavaScript/contract checks sequentially, and independently reproduce the deployed public contract size/hash. Minor wording/UI observations above remain, but no blocking documentation or setup failure remains in the tested path.

## Logs

Sibling files: `revised-readme-install.log`, `revised-readme-dev.log`, `revised-readme-guest.log`, `revised-readme-check.log`, `revised-readme-economy-check.log`, and public status output added on completion. The first rehearsal and its resource-sensitive test failure remain preserved separately; no failed attempt was relabeled as passing.
