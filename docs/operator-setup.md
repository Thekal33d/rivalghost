# RivalGhost — operator setup walkthrough

November 13, 2026

## Current live testnet checkpoint

The project is in [Thekal33d/rivalghost](https://github.com/Thekal33d/rivalghost), committed as **Thekal33d <jimohkhalid16@gmail.com>**. The compact v3 economy is deployed, tested and connected to the local game. The exact sign-in walkthrough is in [NEAR Auth setup](near-auth-plan.md).

## 1. Accounts and deployment — complete

Operator: `rivalghost-ops-thekal33d.testnet`. Within the approved 4-test-NEAR limit, dedicated accounts received 3.3 test NEAR: game 2, auth 0.6, relay 0.6, HOUND 0.05, MOTH 0.05; account-creation fees were approximately 0.035575 additional. Runtime costs come from those accounts. Keys are protected server files and remain ignored by Git. Never export them into chat or frontend variables.

Deployed contract: `game.rivalghost-ops-thekal33d.testnet`, **98,677 bytes**. Actual rewards, a two-player trade, shared repair, HOUND seed and Crown payout passed. See [contract review and measured costs](contract-review.md). No new operator wallet is required.

## 2. Finish personal NEAR Auth login

Use **http://localhost:3000**, choose Save Pilot → Sign in to a NEAR pilot, and complete the provider login. The shared testnet application is named **Example**. Port 5173 and its /auth/callback path were rejected; the supported root callback now reaches the real login form. [Official sample](https://github.com/Peersyst/fast-auth/blob/main/examples/spa/.env.example)

After returning, choose **Authorize game session**. The delegated transaction calls only `join` and `set_session` on the game contract with zero attached NEAR; internal CR/item rights last at most 12 hours. The game relay funds a missing implicit account with 0.005 test NEAR. A first grant transfers 100 CR from the finite reserve, once. Old demo balances are not imported. Local story saves at port 5173 remain there and do not move automatically.

Sponsor configuration is now present privately. Auth allows four attempts per UTC day with conservative 300-Tgas reservations; game relay allows 40 transactions/day; HOUND allows eight. These are pilot caps, not public capacity. Unknown results retain reservations. Public hosting needs an allowlisted HTTPS callback/origin, a single process per sponsor key, protected credentials and persistent database/replay backups. Mainnet credentials are a separate step.

Personal login/MPC signature return and cross-device recovery have not yet been verified. The browser is open at the provider login for the creator to finish privately.

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

## Next inputs

1. Complete the open NEAR Auth login, return to RivalGhost and authorize the game session. Then validate a human browser job and its receipt.
2. Share Trialoom's deployment method or an existing SSH alias for read-only host inspection; the server model is already known.
3. Choose the final game hostname so its HTTPS callback/origin can be registered.

No further AI purchase, staking, mainnet transfer or VPS purchase is required for these local testnet checks. Recurring inference stays disabled.
