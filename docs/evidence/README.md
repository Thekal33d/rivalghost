# Evidence index

This directory separates **current read-only observations**, **historical real transactions**, and **local tests**. A receipt proves that a particular operation occurred; it does not prove that an NPC worker is still enabled or that the system has been independently audited.

## Current public snapshot — November 14, 2026

[public-runtime-2026-11-14.json](public-runtime-2026-11-14.json) records HTTPS API responses and finalized NEAR reads:

- Health: `ok: true`; chain mode: `onchain`; device sign-in enabled.
- Contract: `game.rivalghost-ops-thekal33d.testnet`, version 3, not paused at observation time.
- `get_world` at block **277659654**: total CR **100,100**. The six registered accounts are test accounts, not a traction metric. The stored Crown may be expired; a record is not evidence of an available challenge.
- Bytecode at block **277660187**: **98,677 bytes**; SHA-256 `f80add454965b8c1edef65ce9ce45f1ba6c1d1ffa4654be0be43e940d986a090`.
- Account storage was **101,038 bytes**, a separate quantity from bytecode size. Storage changes as people use the game.

Reproduce current observations from the repository root:

```sh
node tools/read-public-status.mjs
```

No key, account creation, deposit or transaction is involved. The script calls the public game and finalized NEAR JSON-RPC queries `view_account`, `view_code` and `get_world`. It hashes the actual returned code bytes. Timestamps/state can change after the checked-in snapshot.

## Real testnet economy execution — November 13

[economy-v3-testnet.json](economy-v3-testnet.json) contains transaction hashes, measured gas and checks from two test players. Representative explorer links:

| Operation | Receipt |
| --- | --- |
| Delegated join/session | [GWmcmh…](https://testnet.nearblocks.io/txns/GWmcmhJN9UAfjtPCq56k4KFSxTd5ihgusLxkNzQpGJSd) |
| Replay-checked salvage reward | [D39zHB…](https://testnet.nearblocks.io/txns/D39zHBgkkHTRq5ToCZzpVVUXodktSepaAZenEFn66RRD) |
| Craft cosmetic | [DkkSvj…](https://testnet.nearblocks.io/txns/DkkSvjWow679o2jkzxNDXNn5UNsCoqA8vUKgAHt7HeHh) |
| Second-player market purchase | [9KtAdm…](https://testnet.nearblocks.io/txns/9KtAdmq57iUEHsf5LVSdAc9v3VngE27sWdT9D3Kjp62V) |
| District contribution | [5JP5VU…](https://testnet.nearblocks.io/txns/5JP5VU9cMx9s9Ub54MawbrzFxa3W3RxxroNfg8z1UHXS) |
| Crown settlement | [H14yHJ…](https://testnet.nearblocks.io/txns/H14yHJ8oaFZsLnawzRL1AaZx8BSiP1YGVKsyM23N4NTa) |
| Final v3 bytecode upgrade | [AUVVnr…](https://testnet.nearblocks.io/txns/AUVVnrnz3CHgPThrBkCbw7nL6J949v2pPEppWUxHQrpj) |

The JSON's `npcWorkerEnabled` and pending Auth0 statements describe that earlier session. The public deployment currently keeps recurring HOUND/AI off and uses device-account sign-in. Testnet explorer retention and availability are external dependencies.

## Real public device-account recovery — November 14

[device-wallet.md](../device-wallet.md#live-verification--14-november-2026) records a separate public-browser test:

1. Create/sign in and authorize a game session: [receipt](https://testnet.nearblocks.io/txns/HMvHzaSVr6aLMnFrbQdRKAWvLb5D11Qx154QjbfDuiKw).
2. Buy one salvage for 7 CR: [receipt](https://testnet.nearblocks.io/txns/4vzQtA4cqpgbU1PHzaDZRAnz1R1tAJ5wzh3PeNamPTND).
3. Restore the encrypted file in a second browser and authorize epoch 2: [receipt](https://testnet.nearblocks.io/txns/4pCRiQmJtZNaorVre4vfq5ienUrZwQGHWuffAk6hMQPU).
4. Finalized state retained **93 CR and one salvage**; no second starter grant.

Browser tests with mocked transports are documented separately from those real transactions. Recovery secrets are never committed.

## Compute evidence — one live inference

[near-ai-first-decision.json](near-ai-first-decision.json) records one successful NEAR AI Cloud call on November 13: provider HTTP 200, **419 ms**, 82 input + 7 output tokens, restricted recovery-focus result. Its estimated cost is not a billing receipt. Recurring inference remains off. This is not evidence of staking, TEE verification or an autonomous on-chain economy.

## Reproducible local validation

Follow the prerequisites and serial commands in the [root README](../../README.md#verify-the-code-and-contract):

```sh
pnpm install --frozen-lockfile
pnpm check
rustup target add wasm32-unknown-unknown
rustup component add rustfmt
pnpm economy:check
```

The economy Wasm harness tests conservation, invalid signatures/nonces/domains, sessions, pause behavior, jobs, crafting, market transfers, repairs, Crown outcomes and repeated-job storage retention against both raw and optimized artifacts. These are targeted checks, not an independent security audit or a load test.

[economy-v3-local.json](economy-v3-local.json) is the original recorded artifact measurement. Its test count is historical. The [independent fresh-clone rehearsal](fresh-clone-audit.md) records the actual command outcomes, environment limitations and documentation mismatches: 167 JavaScript tests in 33 files and 20 native Rust tests passed on the completed serial run. The initial timeout failures and their retry are retained in the report. The [second clean clone of the revised README](revised-readme-audit.md) also passed frozen installation, startup/health, all 167 tests, types/builds and economy checks, then independently reproduced the deployed hash via [public status output](revised-readme-public-status.json). Package caches and reused Rust dependencies are disclosed; the first run performed the full fresh Rust compile.

## Visual evidence

[Actual screenshots and capture provenance](../images/README.md) show the public release without fabricated activity, account balances or progress. The screenshot capture did not send economic transactions.

## Historical documents

`public-preview.json`, `testnet-setup.json`, `near-auth-live-testnet.json` and `near-auth-callback-diagnostic.json` preserve earlier checkpoints. They may describe a local provider callback, a disabled preview or a different release. Use [current status](../development-status.md) for the present public configuration.

## Rehearsal findings resolved

The initial report is preserved rather than rewritten after fixes. The revised README corrects the startup origin, prerequisites, free-play ordering, progression gates, public device-account path, current contract status and live-versus-disabled claims. Historical Workshop/immersive-flight notes now have explicit banners. Following the second review, social instructions use **Customize**, document the auto-post opt-out, and the root README explains the observed dependency-script warnings. These final edits change documentation only; the tested gameplay/contract source is unchanged.

One runtime copy issue remains outside this documentation change: a result card can show **AUTO-POSTED TO RIVALS** before a username exists. A confirmed shared-flight link/server response is the evidence of publication, not that heading.

The independent reports retain exact audited revisions and outcomes. Their named verbose logs were retained in the local audit workspace, not published here; the reports and public JSON are the checked-in evidence. Local filesystem prefixes in the published reports are normalized to `<audit-workspace>`.
