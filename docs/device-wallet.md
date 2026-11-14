# Device wallet release

Implemented on main, 14 November 2026. This is an additional NEAR testnet identity path; existing NEAR Auth accounts and balances remain separate.

## Player flow

Open Customize → Device Wallet. Choose and confirm a recovery password of at least 12 characters, create the wallet, download the encrypted JSON recovery file, and acknowledge saving it. Connect the wallet, then authorize a 12-hour game session. The server sponsors account creation and relays the owner-signed join/set_session transaction. Gameplay spends CR through the existing signed, nonce-protected economy intents.

After reloading, the owner key is locked. An already-authorized game session can keep using its separate non-exportable device key. Unlock the owner wallet only to renew or replace the game session. Restoring the file with its password in another browser recovers the same identity; authorizing the new browser replaces the previous game session. Local campaign saves are not synced.

## Key handling

The browser generates an Ed25519 owner key. Its PKCS8 bytes are encrypted using AES-GCM-256 with a fresh 96-bit IV. A 256-bit wrapping key is derived with PBKDF2-SHA256, 600,000 iterations and a fresh 128-bit salt. Authenticated metadata binds the account, format, network and KDF parameters. Recovery parses bounded JSON, rejects unsupported parameters, authenticates ciphertext and verifies that the decrypted private key matches the account public key.

Only encrypted vault bytes persist in IndexedDB. The unlocked signing key is reimported as non-exportable and retained in memory. The password and private key never go to the server. The encrypted recovery file and its password are both required; there is no password-reset service. Same-origin script compromise could use an unlocked wallet, so this is a testnet pilot rather than a general-purpose asset wallet.

## Server authorization and limits

Login challenges bind origin, account, nonce, testnet and expiry. A valid owner signature and an on-chain full-access ownership check are required. Unknown RPC failures fail closed. A new login rotates the account's previous HTTP sessions and never merges another pilot's identity.

The frontend independently reconstructs and byte-compares the NEP-366 delegate through the NEAR SDK. Only join and set_session on the configured economy contract are allowed, with zero attached NEAR and a maximum 12-hour session. The relayer verifies the owner signature before saving and broadcasting the exact signed delegate. An uncertain broadcast is recovered using the same signed bytes and request ID.

New embedded-account funding is capped at four distinct accounts per UTC day, reserved durably before funding. Each receives 0.005 test NEAR; transaction gas is also charged against the existing daily relay allowance. These caps are a pilot guard, not Sybil-resistant registration. Existing 40-request/day and conservative gas-budget limits still apply. AI and HOUND settings are unchanged.

## Operations

Enable EMBEDDED_WALLET_ENABLED=true only with the existing configured testnet on-chain API. False disables embedded login and embedded chain writes. The original NEAR Auth path remains under Existing NEAR Auth account. No contract changes or redeployment are required.

Deploy the portable release built from committed main; retain the live SQLite database and existing server keys. Back up the database and environment before switching releases, then verify /api/guest/health, /api/guest/embedded/config and /api/guest/chain/config. Roll back the release symlink and environment on startup failure; preserve the database and transaction journal.

## Validation

- Full TypeScript/build checks and 154 automated tests pass, including password/tampering/account-binding rejection, challenge replay/origin/expiry checks, identity conflicts, signed delegate recovery and the funding cap.
- Chromium test of the built interface passes: backup acknowledgement survives reload, encrypted download, login signature, delegate signature, locked reload, wrong password, second-browser restoration, and 390px mobile layout. This test uses a mock chain transport; live evidence is recorded separately after deployment.
- Contract WASM is unchanged by this feature.
