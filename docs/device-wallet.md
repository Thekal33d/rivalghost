# Device wallet release

Implemented on main, 14 November 2026. This is an additional NEAR testnet identity path; existing NEAR Auth accounts and balances remain separate.

## Player flow

Open Customize → Device Wallet. Choose and confirm a recovery password of at least 12 characters, create the wallet, download the encrypted JSON recovery file, and acknowledge saving it. Connect the wallet, then authorize a 12-hour game session. The server sponsors account creation and relays the owner-signed join/set_session transaction. Gameplay spends CR through the existing signed, nonce-protected economy intents.

After reloading, the owner key is locked. An already-authorized game session can keep using its separate non-exportable device key. Unlock the owner wallet only to renew or replace the game session. To restore, select the encrypted file, enter its original password in the separate Backup password field, and click Restore Wallet. Restoring in another browser recovers the same identity; authorizing the new browser replaces the previous game session. Local campaign saves are not synced.

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

## Live verification — 14 November 2026

Release f3d102c is deployed at https://rivalghost.xyz with embedded wallets enabled. The previous release and a consistent live-database/config backup were retained. Existing AI and HOUND switches remain disabled.

One isolated test wallet was used: `1d36e8b3c18ae4fbab439bf32c1c3944e8dd5644f49523bbe71ed3f627b7081b`.

- Owner-signature login, sponsored implicit-account creation and initial game authorization completed: [session receipt](https://testnet.nearblocks.io/txns/HMvHzaSVr6aLMnFrbQdRKAWvLb5D11Qx154QjbfDuiKw).
- The Workshop bought one salvage for 7 CR: [purchase receipt](https://testnet.nearblocks.io/txns/4vzQtA4cqpgbU1PHzaDZRAnz1R1tAJ5wzh3PeNamPTND). The initial 100 CR became 93 CR.
- The encrypted recovery file restored the same account in a separate browser profile at a 390px mobile viewport. Authorizing its new device key incremented the session epoch to 2 and preserved 93 CR plus one salvage: [restored-session receipt](https://testnet.nearblocks.io/txns/4pCRiQmJtZNaorVre4vfq5ienUrZwQGHWuffAk6hMQPU).
- A direct finalized NEAR RPC query independently confirmed CR 93, salvage 1 and session epoch 2. No extra starter credits were issued.
- The live journal contained 57 finalized transactions, no pending/failed entries, and one embedded-wallet funding reservation after these checks.
- The economy WASM remains 98,677 bytes; this release did not modify or redeploy it.

Recovery files, passwords, browser profiles and server credentials are deliberately excluded from source control.


### Recovery form correction — 14 November 2026

File selection previously attempted decryption immediately with the shared password field, which could already be cleared or hidden after wallet creation. That could incorrectly show a wrong-password/damaged-file message for a valid backup. Recovery now retains the selected file and requires a separate original-backup password plus an explicit Restore Wallet action. An empty password is reported separately from failed decryption. Wrong-password retries retain the file; cancelled restoration leaves the existing vault intact.

Validated with TypeScript/build checks, encrypted-vault regression tests, and Chromium scenarios covering selection without a password, wrong-password retry without re-upload, re-upload while unlocked, and restoration in another browser. No encryption format, stored wallet or on-chain behavior changes.

## Mobile file selection and signup hardening — November 14

An iPhone Chrome report showed “Unsupported or damaged testnet recovery file” after selecting a file, while an account was already stored on the device. The screenshot's 445-byte download size matches a normal backup. Fresh 445-byte files also passed the previous parser in Chromium and WebKit; the exact rejected file was not inspected, so its cause is not established.

The revised flow separates signup from restore. After creating an account, save the downloaded file, confirm it is saved, and sign in using the encrypted account already on the device. There is no mandatory upload. Restore is a separate, collapsed option with an explicit password step. A rejected selection never replaces or deletes the saved account.

File handling now reads the selected bytes before clearing the picker, accepts a UTF-8 BOM around otherwise-valid JSON, checks actual byte limits and UTF-8 decoding, and keeps the download URL alive for 60 seconds with an attached download anchor. Errors identify invalid format/version/encryption settings or the damaged field without exposing any field values. Encryption parameters, authenticated metadata, account-key matching and the backup format remain unchanged. No arbitrary key sizes or KDF parameters are accepted.

Validation: 4 vault tests; web typecheck/build; mobile economic-action layout checks; real browser encryption/download/recovery/signature checks in Chromium and WebKit at 390 × 844. The browser check covers rejection followed by saved-device sign-in, recovery in a fresh browser context, wrong-password retry without selecting the file again, and restoring a Chromium-created backup in WebKit. API responses are isolated fixtures; signatures are cryptographically verified. This does not reproduce the iPhone Files provider or establish that every physical-phone issue is resolved.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright CHECK_URL=http://127.0.0.1:4192 node tools/check-device-recovery.cjs
```

For an existing account, reload the page without clearing site data. Finish saving the recovery download in Files/Downloads, check “I saved my recovery file and password,” enter the original password if prompted, and select **Sign in**. Never ask users to share their password or backup to diagnose a format error; the revised non-secret error text identifies the validation stage.
