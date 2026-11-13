# RivalGhost — NEAR Auth integration checkpoint

November 13, 2026

The sponsor is configured and funded. The actual game now opens the provider login form at the supported local address **http://localhost:3000**. Personal login, approval and MPC signature return remain to be completed; reaching the form alone is not proof of account ownership.

## Player steps

1. Open `http://localhost:3000` exactly. Choose Save Pilot → Sign in to a NEAR pilot (or link an already saved pilot at this origin).
2. Use the provider's email, Google or passkey login. Its shared testnet application is named **Example**. Approve only the displayed RivalGhost identity message; this first message grants no spending.
3. After returning, choose **Authorize game session**. Review the exact game contract and the two delegated calls, `join` and `set_session`, with zero attached NEAR. This permits the current device to use internal CR/items for at most 12 hours. It cannot transfer native NEAR.
4. The sponsor submits the authorization, creating/funding the implicit account if needed. The contract grants 100 test CR once from its finite reserve. Open Workshop, reserve a free job, fly and confirm the reward receipt.

No operator wallet, seed phrase or AI key belongs in the player UI. Hosting will use an explicitly allowlisted HTTPS origin/callback. Mainnet is a separate approval/configuration milestone.

## Callback correction

The shared testnet client rejected `http://localhost:5173/auth/callback` and `http://localhost:5173`. Its official sample uses `http://localhost:3000`; the actual browser now reaches login with this exact root callback. The frontend recognizes both root OAuth returns and hosted `/auth/callback` returns; state/PKCE, origin cookies and signed challenge binding remain enforced. Default Vite port and APP_ORIGIN now match 3000.

Old local campaign saves at port 5173 are retained but do not automatically move between browser origins. Server social records remain in the same SQLite database. No demo economy migration is performed.

## Authorization and recovery

NEP-413 proof checks JWT issuer/audience/age, exact payload, browser flow cookie, account derivation, ownership and MPC Ed25519 signature before issuing an HTTP session. Delegated game sessions bind actor, current login session, device key, configured game contract and expiry. Browser economic actions carry their own device signature and on-chain nonce/epoch. A web session alone cannot spend assets.

Game relays persist signed bytes/hash before broadcast and reconcile that same transaction on retries. Finalized receipts are required. A failed or unavailable chain never falls back to local economic writes. The identity signing service conservatively retains failed/unknown sponsorship reservations and does not automatically repeat an unknown MPC call; a new login may be required.

## Package compatibility decision

The docs describe Browser SDK `requestMessageSignature`, but published `@fast-auth-near/browser-sdk` 1.4.2 and JavaScript provider 1.4.1 did not expose it when inspected. Instead, the small lazy-loaded adapter uses pinned Auth0 SPA 2.11.3 and the upstream NEP-413/provider protocol at commit `bef019afd049c6637dd21be6629050762b943c18`. The backend uses JOSE 6.1.3 and near-api-js 7.5.3. This is a compatibility bridge, not a claim that the missing published SDK API was exercised. [Official upstream provider](https://github.com/Peersyst/fast-auth/blob/bef019afd049c6637dd21be6629050762b943c18/packages/providers/javascript/src/provider.ts), [message-signing docs](https://docs.auth.near.org/home/guides/sign-messages).

Testnet uses the published shared client, `fast-auth.testnet` and `v1.signer-prod.testnet`. No new Auth0 tenant is needed for this testnet setup; callback/origin acceptance still requires a real test. Mainnet is a separate configuration and approval milestone. [Official testnet resources](https://docs.auth.near.org/resources/testnet)

## Validation status

119 application tests pass, including JWT cryptography, ownership/payload/cookie binding, delegated-session rejection/recovery and relay idempotency. Actual testnet delegated sessions were signed by isolated test keys; this validates the contract/relay path, not Auth0/MPC end to end. The real browser login form is reachable; the personal login step is currently blocked by a provider signup error. Cross-device recovery and hosted callback validation are still open.

## Login troubleshooting checkpoint

The shared NEAR Auth provider's password-signup page displayed “Something went wrong, please try again later” before returning to RivalGhost. At this checkpoint the local database contained no completed NEAR identities or authentication signing attempts. This observation does not establish a provider-wide outage or a contract failure. A fresh Google login in Chrome remains to be tested; start from the game at `http://localhost:3000`, rather than reusing an old provider signup URL.

The game now disables session authorization until NEAR identity login completes and checks the same prerequisite before creating an authorization flow. Callback errors persist across reloads with the pilot panel open. A new login clears the previous failed callback promise. The callback uses only the cached token for the approved signing audience/scope; it never silently obtains a replacement token. Optional profile refresh cannot turn successful authentication into a reported login failure.

Five new browser-client regression tests cover these boundaries, and the HTTP test checks that anonymous session authorization is rejected with an explicit sign-in instruction. All 119 application tests, typechecks and production builds pass. Browser inspection confirms the pre-login authorization controls are disabled. Real Google login, MPC return and the human browser game-session approval remain unverified.
