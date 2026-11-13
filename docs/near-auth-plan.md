# RivalGhost — NEAR Auth integration checkpoint

November 13, 2026 · implementation `7dda7c5`

The testnet sign-in/linking milestone is implemented locally. It is **disabled pending operator setup and a live end-to-end test**. The game remains playable without a wallet. The current game contract is 99,448 bytes; adding authentication did not add JWT parsing to it.

## What was implemented

- Optional pilot linking and returning-player sign-in; a callback at `/auth/callback`; disabled/error states; sign-in kept outside active flight.
- A server-issued, one-use NEP-413 message bound to the exact origin, callback, browser cookie and current pilot session when linking. The message grants no game entry or token transfer permission.
- Local RS256 JWT issuer/audience/freshness verification before sponsoring a signature; exact approved payload comparison; independent Ed25519 proof verification; derived-account/full-access-key checks before session issuance.
- A stable server identity across logins. Linking preserves the existing guest ID and its server records. Accounts are never merged, and signing in itself grants no CR. Linking invalidates old device sessions and recovery through the old browser key. Campaign medals and best flights remain device-local.
- A testnet-only signing relay with a fixed contract/action, explicit gas/deposit limits, durable daily request/budget reservations and no automatic transaction retry. Uncertain sends retain their reservation. Tokens, keys and proofs are not logged.

## Package compatibility decision

The docs describe Browser SDK `requestMessageSignature`, but published `@fast-auth-near/browser-sdk` 1.4.2 and JavaScript provider 1.4.1 did not expose it when inspected. Instead, the small lazy-loaded adapter uses pinned Auth0 SPA 2.11.3 and the upstream NEP-413/provider protocol at commit `bef019afd049c6637dd21be6629050762b943c18`. The backend uses JOSE 6.1.3 and near-api-js 7.5.3. This is a compatibility bridge, not a claim that the missing published SDK API was exercised. [Official upstream provider](https://github.com/Peersyst/fast-auth/blob/bef019afd049c6637dd21be6629050762b943c18/packages/providers/javascript/src/provider.ts), [message-signing docs](https://docs.auth.near.org/home/guides/sign-messages).

Testnet uses the published shared client, `fast-auth.testnet` and `v1.signer-prod.testnet`. No new Auth0 tenant is needed for this testnet setup; callback/origin acceptance still requires a real test. Mainnet is a separate configuration and approval milestone. [Official testnet resources](https://docs.auth.near.org/resources/testnet)

## Evidence and limits

`pnpm check` passes 99 application tests, typechecking and production builds. Eleven new tests cover message encoding, real JWT cryptography, origin/cookie/session binding, replay rejection, linking conflicts, stable profile/balance, stale-session recovery rejection, invalid proof/ownership, concurrency, HTTP sessions, RPC failure and durable sponsor reservation. NEAR calls use test doubles. Browser QA covers local pilot reconnection, disabled sign-in, mobile panel scrolling and the expiry warning. No live NEAR Auth transaction or cross-device sign-in has occurred.

## Next integration steps

1. Operator funding is complete: `rivalghost-ops-thekal33d.testnet` has 10 testnet NEAR (finalized RPC block 277514809). Configure a dedicated protected sponsor key and a concrete testnet request/budget cap.
2. Confirm the local callback and deployed HTTPS callback are accepted by the shared provider. Exercise actual sign-in, cancellation, return, logout, wrong-account linking, expired proof and second-device recovery.
3. Measure real signing receipts and provider latency, then tune the reserved budget. A login proves identity; it does not mean the account is funded or that v3 ranked settlement exists.
4. Retire or bind legacy v1 certificates, align finite supply/storage limits, and promote v3 into the contract/verifier before on-chain competition. Ranked expiry forfeiture is now implemented; an outage remedy is still separate work.
5. Complete hosting and the public demo. Read [operator setup](operator-setup.md) for the creator's next actions and the approved $5 AI pilot.
