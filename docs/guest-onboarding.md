# Local gateway and guest identity

Updated November 14, 2026. This document covers the local social identity and development service. The public recoverable account flow is [device-wallet.md](device-wallet.md); the deployed economy is [economy.md](economy.md).

## Start without secrets

Use Node 24 (tested 24.11.1) and pnpm 10.33.0. From a clone, run `pnpm install --frozen-lockfile`, then these in separate terminals at the repository root:

```sh
pnpm dev
```

```sh
pnpm guest:serve
```

Open **http://localhost:3000**. The service binds `127.0.0.1:8788`; Vite proxies `/api/guest`. The exact browser origin matters for authentication. Port 3000 is strict; free it rather than changing the browser URL without updating `APP_ORIGIN`.

No `.env` file is required. Defaults disable provisioning, NEAR Auth, embedded chain account creation and paid compute. The Workshop uses a separate Local Demo ledger. Optional server configuration is in [apps/relayer/.env.example](../apps/relayer/.env.example). SQLite state lives in ignored `apps/relayer/.local/guests.sqlite`; protect the database and its WAL files if hosting it.

Check `curl --fail http://localhost:3000/api/guest/health`; expected `{"ok":true}`. Core flights remain playable without the gateway, but social/economy requests require it. Complete one story flight to unlock Workshop/Rivals; later features follow the [player journey](player-journey.md).

## Guest identity versus a recoverable account

The browser's local guest proof uses a non-exportable Ed25519 CryptoKey and a server-issued, one-use origin-bound challenge. The service establishes a limited HTTP session; this alone grants no NEAR spending authority. A username/social profile is not a chain account.

The public device-account path separately creates an owner key, encrypts its recovery file, verifies ownership and sponsors an owner-signed NEP-366 join/session action. The contract checks the game-session epoch, nonce and deadline for subsequent economic actions. Only the encrypted backup persists for the owner key. A restored account preserves on-chain assets, while local medals and best flights remain device-local.

The older `BOOTSTRAP_ENABLED` guest-provisioning adapter is retained for earlier Crown-only work. It is not the current v3 public onboarding path and should not be enabled merely to run the local demo.

## Hosted operation

Hosting requires an exact HTTPS origin, persistent SQLite storage, protected server keys, funded testnet sponsor accounts and explicit spending caps. The live pilot caps new device accounts at four per UTC day and uses a bounded transaction relay. The example environment intentionally contains no credentials. Never place operator, verifier or provider secrets in `VITE_` variables or commit them.

The current deployment and unresolved provider callback are described in [development-status.md](development-status.md). The relay and device recovery are implemented and have live receipts; earlier statements that no delegation or deployment exists are obsolete.
