# Guest pilot onboarding

## What ships locally

The optional **Save pilot** control creates an Ed25519 key in the browser. Its private key is non-exportable and persists as a CryptoKey in IndexedDB. The server sends a one-use, 60-second challenge bound to that public key and the exact application origin. A valid signature establishes a 12-hour HttpOnly, SameSite=Strict session. The database stores the session token's hash, not the token. HTTPS origins also receive Secure cookies.

Saving a pilot does not back up the campaign. Medals, best replays and the key remain in this browser; clearing site data removes access. There is no recovery or cross-device synchronization. A non-exportable key is not protection against malicious same-origin scripts, which can still request signatures. Keep the service and application on one trusted origin.

Free play never waits for authentication or chain confirmation. The current default saves a **local pilot only**; it does not grant on-chain credits, claim a NEAR account, or enable competitive settlement.

## Local startup

Use Node 24 (tested with 24.11.1), pnpm 10.33 and the installed workspace dependencies. The NEAR SDK requires Node 22.22.2 or later; Node's SQLite API currently emits an experimental warning.

From the repository root, run these in separate terminals:

```sh
pnpm dev
pnpm guest:serve
```

The gateway listens only on `127.0.0.1:8788`. Vite proxies `/api/guest` to it. The default browser origin is exactly `http://localhost:5173`; use that hostname, or change APP_ORIGIN to match. If Vite chooses another port, update the origin instead of disabling origin checks.

`pnpm guest:serve` builds the workspace dependencies and starts the service. Optional configuration is read from `apps/relayer/.env`; copy that directory's `.env.example`. Keep `BOOTSTRAP_ENABLED=false` for local work. The SQLite database defaults to `apps/relayer/.local/guests.sqlite`, is excluded from Git, and contains public identities, session hashes and sponsorship reservations. Protect the directory and its WAL files as server data.

## Testnet provisioning, disabled by default

This adapter is implemented and tested with SDK doubles. It has **not** created or funded a real account, run on a NEAR sandbox, or been validated against a deployed contract. The contract-size gate still fails. Do not enable public provisioning yet.

Provisioning requires all of the following explicit configuration:

- `BOOTSTRAP_ENABLED=true`, `NEAR_NETWORK=testnet`, exact `APP_ORIGIN` and a trusted `NEAR_RPC_URL`.
- `GUEST_PARENT_ID`: an existing funded `.testnet` account, also the deployed contract's operator. Its ID must be at most 42 characters to leave room for child IDs.
- `CONTRACT_ID`: the deployed `.testnet` contract, including `has_guest_grant`.
- `OPERATOR_KEY_FILE`: a protected absolute path containing only the encoded `ed25519:...` operator key. Keep it outside the web tree and never use a `VITE_` variable for secrets.
- `GUEST_FUNDING_YOCTO`, `GAS_PRICE_CAP_YOCTO`, `BOOTSTRAP_DAILY_BUDGET_YOCTO`, `BOOTSTRAP_DAILY_ATTEMPTS` (1–100): positive explicit caps. There is no default spending authorization.
- Internal `VERIFIER_URL` and `VERIFIER_SERVICE_TOKEN`. The shared credential remains server-side.

Startup verifies the RPC network is testnet and that the configured parent is the contract operator. It fails closed on missing configuration. Only a user-triggered authenticated setup request can provision; opening the game never creates an account.

Each public key maps to a deterministic child account. One atomic transaction creates it, transfers the configured funding, and adds exactly one function-call key for the game contract. Allowed methods are `start_challenge`, `settle_challenge`, `defend_crown`, and `expire_challenge`; allowance is zero for the intended delegated-action path. It adds no FullAccess key. A retry adopts only an account with exactly those permissions, and checks the persistent grant flag rather than a possibly spent credit balance. The contract's `create_guest` remains operator-only and grants credits once.

The separate NEP-366 signed-action relay is **not implemented yet**. The zero-allowance key and actual delegated calls still need sandbox/testnet validation. An account marked ready means account/key/grant confirmation, not a completed competitive game loop.

## Sponsorship and retries

Before any provisioning RPC call, SQLite durably reserves:

`child funding + 600,000,000,000,000 × gas-price cap`

This conservatively covers two transactions at a 300 Tgas ceiling each; it is a spending reservation, not measured gas usage. Actual grant prepaid gas is 30 Tgas. The service checks current gas price before each transaction. Both daily reserved amount and attempt count must stay within configuration. It allows at most three provisioning attempts per pilot per UTC day. Uncertain attempts are not refunded; every retry reserves again, so a timeout cannot reopen spending capacity.

One service instance serializes provisioning and coalesces simultaneous requests for one guest. RPC broadcasts disable SDK retries; an uncertain account-creation response is recovered through finalized reads, not a second funding transfer. A failed grant leaves setup pending. Do not run multiple provisioning workers against this design; cross-worker nonce coordination and operational recovery remain work before scaling.

The HTTP API permits 120 POST attempts/minute globally and 30/minute per socket IP. New proofs additionally allow 100/minute globally and six/minute per IP. Bodies are limited to 128 KiB; active nonces to 200 and registered pilots to 10,000. Returning pilots can reconnect at registration capacity. The gateway deliberately ignores X-Forwarded-For; a local proxy therefore shares one conservative IP quota. Configure trusted proxy handling before a public launch rather than accepting arbitrary forwarded addresses.

## Authentication and verification boundary

Routes: `GET /api/guest/me`; POST `challenge`, `session`, `logout`, `provision`, `verify`. POST requests require the exact Origin and JSON. Verification requires an authenticated, provisioned account; the server supplies its account ID and ignores a caller-supplied player ID. Only the internal verifier can issue a replay certificate. Successful verification returns `settled: false` and must not be presented as a payout.

Tests cover forged/expired/reused proofs, origin binding, non-exportable browser signing, session rotation and expiry, real local HTTP requests, persistence across restarts, concurrency, uncertain account creation, wrong key permissions, gas caps and budget exhaustion before provider calls. Browser checks cover saving, restoring the same pilot after reload, retained campaign progress and phone-sized panel bounds.

Still required: live account and delegate-action testing, transaction hash recovery, browser challenge controller, measured storage/receipts, public abuse controls and monitoring, recovery design, and service hosting. No accounts have been funded or deployed by this implementation.
