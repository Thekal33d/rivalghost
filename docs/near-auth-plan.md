# RivalGhost — NEAR Auth integration checkpoint

November 13, 2026

The funded testnet integration now separates **OIDC identity login** from **signed game-session authorization**. Use **http://localhost:3000** exactly. Personal login and subsequent MPC delegate approval now completed successfully on testnet. The pilot has 100 starter CR and session epoch 1, confirmed at finalized block 277563686.

## Player steps

1. Open `http://localhost:3000`. Choose Save Pilot → Sign in to a NEAR pilot, or link a saved local pilot.
2. Complete NEAR Auth login on its page. The shared testnet application is named **Example**. This identity step grants no spending and requests no signing audience.
3. After returning, choose **Authorize game session**. Review the game contract and the `join` and `set_session` delegated calls with zero attached NEAR. This permits the current device to use internal CR/items for at most 12 hours; it cannot transfer native NEAR.
4. The sponsor submits authorization, creating/funding the implicit account if needed. The contract grants 100 test CR once from its finite reserve. Open Workshop, reserve a free job, fly and confirm the reward receipt.

No operator wallet, seed phrase or AI key belongs in the player UI. Hosting requires an allowlisted HTTPS origin/callback. Mainnet is a separate milestone.

## Why the login protocol changed

The user received `access_denied` with `Signing audience requested without transaction payload`. Our previous request used `nep413`, matching upstream commit `bef019afd049c6637dd21be6629050762b943c18`. That revision recognizes message, transaction and delegate-action payloads, and uses the different error wording “without signing payload”. The observed live response is consistent with an older transaction-only deployment. We cannot establish its exact deployed revision or repair the shared provider tenant.

The runtime login now uses standard authorization-code OIDC with PKCE and `openid` scope, without a signing audience or `nep413` parameter. The initial password-signup error alone did not identify this mismatch; the later callback supplied the actionable evidence. Reusing the old provider URL or callback cannot test the correction: start a fresh login from the game.

[Official upstream provider](https://github.com/Peersyst/fast-auth/blob/bef019afd049c6637dd21be6629050762b943c18/packages/providers/javascript/src/provider.ts) · [Official authorization action](https://github.com/Peersyst/fast-auth/blob/bef019afd049c6637dd21be6629050762b943c18/packages/auth0/src/actions/authorize-app.action.js)

## Identity security boundary

The server creates a random state, nonce and S256 PKCE challenge. The verifier stays server-side in the bounded, expiring login flow; the browser receives only the authorization URL and flow ID. HTTP completion requires the exact origin, HttpOnly flow-binding cookie, state, unconsumed flow and original local session for account linking. A code is exchanged at the fixed provider endpoint only once. Raw identity tokens are never sent to the browser or persisted by RivalGhost.

The backend verifies RS256 signature, exact issuer/client audience, expiry, token age, authorized party and nonce. It derives the mapped MPC public key from the verified subject and confirms account-key ownership, failing closed on RPC errors. This is a provider-authenticated identity session, **not a completed MPC ownership signature**. Login makes no sponsorship transaction. The legacy NEP-413 verifier remains tested internally but is not exposed through the active HTTP login path.

Only separate delegate-action approval supplies the MPC signature for `join`/`set_session`. Its signing token is retrieved from the exact approved audience/scope cache, with no silent replacement-token request. Account, session, device key, game contract, expiry, payload and signature are checked before broadcast. Browser economic actions then carry their own device signature and on-chain nonce/epoch; identity login alone cannot spend.

## Callback and recovery

The shared testnet client accepted the exact localhost root callback; it rejected port 5173 and `/auth/callback` at localhost. Hosted origins use `/auth/callback` after allowlisting. Campaign saves at 5173 remain in that origin's storage and do not automatically move.

Authorization controls stay disabled until login succeeds. Callback errors remain visible after reload, and fresh attempts reset the previous failed callback promise. Optional profile refresh cannot turn verified login into reported authentication failure.

Game relays persist signed bytes/hash before broadcast and reconcile the same transaction on retries. Finalized receipts are required. An unavailable chain never falls back to local economic writes. Failed/unknown signing sponsorship reservations remain conservatively charged against the configured limit.

## Validation status

`pnpm check`: **130 tests**, typechecks and production builds pass. Coverage includes real RS256 identity-token verification, PKCE generation/exchange binding, nonce/state/cookie mismatch, expiry/cancellation, duplicate callbacks, identity linking conflicts, delegated-session checks and relay recovery. Browser inspection confirms that a fresh request reaches the real provider login form and that authorization is disabled before login.

The personal OIDC login and provider MPC delegate approval both completed. The finalized authorization receipt is `zsMkjS9bQHuBsQcTVnTVKRzuAP3S4orztEW1GrDhtJi`. A direct finalized `get_pilot` query confirmed 100 CR, session epoch 1 and expiry `2026-11-14T09:07:29.493Z`. See `docs/evidence/near-auth-live-testnet.json`. Human browser job/claim, second-device recovery and hosted callback validation remain open. Contract Wasm is unchanged at **98,677 bytes**.

The follow-up UI shows active session, balance and local expiry only when the on-chain session key matches this browser and has not expired. It refreshes on window focus and after authorization; unavailable status requests a recheck rather than another authorization. The identity banner no longer asks an already-authorized user to authorize. Frontend typecheck/build pass; the active-state visual update still needs confirmation in the user’s signed-in browser.
