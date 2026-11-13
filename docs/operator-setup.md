# RivalGhost — operator setup walkthrough

November 13, 2026

## Current checkpoint

The project is in [Thekal33d/rivalghost](https://github.com/Thekal33d/rivalghost). Commits use **Thekal33d <jimohkhalid16@gmail.com>**. Local free play, server social features, the Workshop and Crown Pit work. NEAR Auth linking/sign-in code is built, but external signing is disabled. Current v3 gameplay and Workshop assets do not yet settle on NEAR.

The creator approved **$5 total for the AI pilot**, no automatic top-ups, and at most **four shared NPC decisions per UTC day**. This records a budget, not a purchase or activation. Testnet funds, AI credits and hosting bills are separate budgets.

## 1. Testnet operator account — complete

The creator created `rivalghost-ops-thekal33d.testnet` using the official CLI after MyNearWallet's testnet flow failed. A read-only finalized RPC check at block **277514809** confirmed **10 testnet NEAR**, **182 bytes** of account storage, zero validator stake and no deployed contract. The creator's CLI output reports one full-access key. No private key was read and no transaction was sent by this verification.

The operator account creation/funding step is complete. Keep its CLI keychain credentials private. NEAR Social profile setup is unnecessary for the game. The steps below are reference instructions only; do not create another operator account.

### Reference wallet instructions

1. Open [MyNearWallet Testnet](https://testnet.mynearwallet.com/), check that you are on testnet, and follow its create-account flow.
2. Choose an available account name if offered. `rivalghost-ops.testnet` is an example, not a reserved name. Save the recovery phrase privately using the wallet's instructions.
3. Copy the **public account ID** shown by the wallet. This is the value to share here. It is not a seed phrase, private key, password or API key.
4. Open the [NEAR faucet](https://near-faucet.io/), enter the public testnet account ID and request the permitted test funds. Availability and limits can change; verify the resulting wallet balance rather than assuming a fixed grant.
5. Check the account in [Testnet NearBlocks](https://testnet.nearblocks.io/) and send the public ID once funding appears. No real NEAR purchase is needed for this testnet step.

If wallet account creation needs initial funding, the official CLI also supports faucet-sponsored account creation with locally stored keys. We can use that route if the wallet flow is unavailable; the key must remain on your computer. [Official NEAR CLI guide](https://docs.near.org/tools/cli)

The operator is infrastructure for testnet sponsorship/deployment. Players use NEAR Auth; they should not receive or use the operator key. For unattended signing, configure a separate service key/account with restricted access and its own small allowance, rather than exporting the wallet recovery phrase. The public ID is now known. A dedicated service key/account, explicit testnet signing allowance and callback test are the next authentication setup steps; live signing stays disabled.

## 2. Configure NEAR Auth sponsorship

The code uses the official shared testnet provider and a server-funded signing transaction. [Testnet resources](https://docs.auth.near.org/resources/testnet)

Keep `NEAR_AUTH_ENABLED=false` until the testnet sponsor, callback and budget are configured. The server needs `NEAR_AUTH_SPONSOR_ID`, a protected `NEAR_AUTH_KEY_FILE`, `NEAR_AUTH_GAS_PRICE_CAP_YOCTO`, `NEAR_AUTH_DAILY_BUDGET_YOCTO` and `NEAR_AUTH_MAX_DAILY_REQUESTS`. The example environment file deliberately leaves spending values blank.

Each attempt reserves `300 Tgas × configured gas-price cap + 1 yoctoNEAR` before submission. This is a conservative reservation, not measured gas consumption. Unknown transaction outcomes still consume the reserved daily allowance. The $5 AI decision does not set this testnet signing budget.

The callback is `APP_ORIGIN/auth/callback`. The current local origin is `http://localhost:5173`; public use needs the final HTTPS origin. We must confirm provider callback acceptance and a real sign-in before advertising recovery as live. The compatibility adapter and local test evidence are documented in `near-auth-plan.md`.

## 3. Create NEAR AI Cloud access

1. Sign up or sign in at [NEAR AI Cloud](https://cloud.near.ai/).
2. Find **Credits** and inspect the smallest available purchase. The pilot ceiling is $5 total. If the minimum purchase is larger, stop and report it so we can choose another approach; do not silently increase the budget.
3. Keep automatic replenishment disabled. Do not purchase credits yet unless you are ready to make the approved pilot purchase yourself; no purchase has been performed by this implementation.
4. Open **API Keys** and create a dedicated RivalGhost key. Store it privately in server configuration, never in chat, GitHub, browser code or a `VITE_` variable. The API endpoint is `https://cloud-api.near.ai/v1`.

These are the provider's documented setup sections. [NEAR AI quickstart](https://docs.near.ai/cloud/quickstart)

Before activation, choose an available model from the current catalog and record its exact ID, input/output prices and reasoning behavior. For the confidential-compute demo, select an appropriate **Confidential TEE** model; gateway access alone does not make every model's inference confidential. The `/v1/models` metadata exposes pricing and supported features. [Official model catalog guide](https://docs.near.ai/cloud/models)

The current NPC request is small: MOTH receives aggregate salvage/restoration numbers and selects a legal recovery/courier focus. It receives no player wallet credentials. A validated choice is cached and shared across players; it is not one paid request per player or per frame. The server requests at most 64 output tokens, spaces attempts at least six hours apart, and applies the configured four-attempt daily ceiling. Failures use the local policy.

Set these only in private server configuration when ready:

```dotenv
NEAR_AI_ENABLED=false
NEAR_AI_API_KEY=
NEAR_AI_MODEL=Qwen/Qwen3-VL-30B-A3B-Instruct
NEAR_AI_TOTAL_BUDGET_USD=1
NEAR_AI_DAILY_REQUESTS=4
```

The creator has now confirmed at least $1 of available credits and saved the key privately. Model pricing was checked without inference. The creator authorized one live test, which succeeded; keep the flag false because recurring inference is not enabled. Four calls per day alone is not a dollar cap; the new durable $1 reservation allowance now adds $0.003 per attempted decision and survives restarts/day changes. Provider prepaid/no-top-up controls remain separate. See [the AI pilot checkpoint](ai-pilot.md) for the selected model, live price checks and the limits of application accounting.

Planning formula, with prices per million tokens:

`cost = (input tokens × input rate + billable output tokens × output rate) / 1,000,000`

Billable reasoning tokens may matter depending on the model. Record actual usage from the first request; do not assume a token limit means a fixed invoice. Testnet NEAR does not buy AI Cloud credits. Developer-funded stake-to-compute is a later, separately funded step; no real staking is authorized or configured.

## 4. Share the existing Hetzner server if capacity permits

The supplied screenshot identifies the existing server as **CX23, x86, 40 GB disk**. Hetzner lists CX23 as **2 vCPUs and 4 GB RAM**. [Official specifications](https://www.hetzner.com/cloud/cost-optimized/)

The other supplied screenshots show a *new-server order* for CPX02: 1 vCPU, 1 GB RAM and 20 GB disk. That order is not evidence of a second running server. We recommend checking the existing CX23 first, rather than buying that smaller server now.

Sharing is plausible for a small pilot, not a measured capacity guarantee. The arcade graphics run on players' devices and model inference runs at NEAR AI Cloud. The VPS handles API requests, SQLite, replay verification and NPC policies. Replay checks can still consume CPU; actual concurrent capacity needs testing.

Before deployment, identify how Trialoom is run (Docker, Coolify, PM2 or systemd), the existing reverse proxy, current memory/CPU/disk use and backup arrangements. If you can open the server terminal, these read-only checks help:

```sh
nproc
free -h
df -h /
uptime
command -v docker
command -v pm2
systemctl --type=service --state=running --no-pager
```

Do not paste secrets from environment files, container inspection output or process command lines. An existing SSH alias is enough for arranging a read-only inspection; no password or private key belongs in chat.

Proposed layout: a separate RivalGhost service/user or container, persistent SQLite directory and backup, separate credentials and a localhost API port. Add its own hostname route through the existing reverse proxy. Keep the verifier private. Start with explicit resource limits, then tune against observed memory and replay latency. Build releases locally or in CI when practical to reduce CPU/memory spikes on the shared server. One database writer/service instance is the initial deployment model.

The backend uses Node's SQLite/filesystem facilities and a continuing NPC loop; moving it to a stateless edge function would require a separate architecture change. Cloudflare can provide DNS/proxying while the persistent service stays on the VPS. We have not changed Trialoom, installed server software, created a VPS or edited DNS.

## 5. Choose the hostname

Namecheap is the registrar only. No domain has been chosen. Pick a domain or an approved subdomain of one you already own. We can then prepare the exact Cloudflare DNS and reverse-proxy configuration, preserve existing email/Trialoom records, set HTTPS and use the same origin for browser/API requests. Changing nameservers is unnecessary if that domain already uses Cloudflare. Keep authentication/API responses out of public caches.

## Next inputs and implementation order

1. **Completed:** funded operator `rivalghost-ops-thekal33d.testnet`. Signing credentials and a dedicated testnet authentication allowance remain unconfigured.
2. **Prepared:** Cloud credits confirmed, API key saved privately, reviewed model configured, $1 durable reservation ceiling implemented; one authorized paid inference succeeded; recurring inference remains disabled.
3. Trialoom's deployment method or an existing SSH alias for read-only server inspection. The server model is now known; no need to repeat it.
4. Chosen game hostname when ready.

Then validate live NEAR Auth with a concrete testnet allowance, complete the v3/finite-economy contract work within the byte limit, measure the exact artifact in NEAR's runtime, prepare the isolated host deployment and run a fresh-player end-to-end rehearsal. The current optimized artifact is **99,448 bytes**, with **552 bytes** left below the unchanged 100,000-byte ceiling. It has not been deployed.
