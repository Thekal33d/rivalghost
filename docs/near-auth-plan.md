# RivalGhost — NEAR Auth integration checkpoint

November 14, 2026

**Current implementation:** the official Browser SDK and JavaScript provider now handle browser login and delegated signing. Server-held PKCE still verifies the API identity. The November 13 live receipts below validate the previous flow; a fresh human end-to-end test of the SDK flow remains required. Public sign-in and on-chain economy were enabled after the explicitly approved November 14 cutover. The provider callback rejection still prevents a successful hosted login; activation is not proof of provider acceptance.

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

## November 14 hosted callback diagnosis

The tutorial at https://docs.near.org/web3-apps/tutorials/near-auth points to the same NEAR Auth provider already configured here. Its React/JavaScript SDK wrapper differs from our custom OIDC identity flow, but the provider domain, testnet client ID and signing audience match the official testnet resources.

The official JavascriptProvider uses popup login by default and redirect login when redirectUri is supplied. Its popup delegates to Auth0 SPA; the installed Auth0 SPA source sends response_mode=web_message with window.location.origin as the default redirect URI. A popup therefore still supplies a callback URL for the provider to validate.

Unauthenticated control probes on November 14 compared six configurations. Both localhost:3000 requests (query redirect and SDK-style web_message popup) returned 302 to the login identifier page. The configured https://rivalghost.xyz/auth/callback, apex origin, apex with trailing slash, and SDK-style apex popup each returned 403 with Callback URL mismatch. No user credentials, signing payload, token exchange or on-chain transaction was involved. Full sanitized results: docs/evidence/near-auth-callback-diagnostic.json. This is a configuration preflight, not an end-to-end SDK browser login test.

Auth0 documents this error as a redirect_uri not matching the selected application's Allowed Callback URLs. We cannot read the provider's private application settings; the error and control comparison establish that the tested public URLs are rejected while localhost is accepted. DNS, Caddy routing, the economy contract and sponsorship balance do not explain this provider-side callback rejection. Changing only the SDK, callback path or popup mode does not solve the observed issue.

The administrator of the shared testnet Auth0 application must add https://rivalghost.xyz/auth/callback to Allowed Callback URLs and configure https://rivalghost.xyz as an Allowed Web Origin. Add the apex origin as a callback too if switching to the SDK's default popup. Alternatively, obtain a dedicated client on the same NEAR Auth testnet provider with those settings. Preserve the provider/identity mapping so existing pilots keep their accounts. Creating an unrelated Auth0 tenant is not a drop-in replacement for the deployed NEAR Auth guard.

The docs advertise no approval for testnet, but the pages reviewed do not provide a self-service registration path for arbitrary hosted testnet callbacks. The documented production-access form concerns mainnet, so it should not be presented as an established testnet fix. Contact the NEAR Auth provider/application administrator; this does not specifically require a hackathon organizer.

References:
- https://docs.auth.near.org/resources/testnet
- https://docs.auth.near.org/sdks/javascript-provider
- https://docs.auth.near.org/home/apply
- https://github.com/Peersyst/fast-auth/blob/main/packages/providers/javascript/src/provider.ts
- https://support.auth0.com/center/s/article/Callback-URL-Mismatch-Error-Is-Not-in-the-List-of-Allowed-Callback-URLs

## Official SDK migration — November 14

This follows the tutorial's JavaScript/Browser SDK integration: `@fast-auth-near/browser-sdk` 1.4.2 with `@fast-auth-near/javascript-provider` 1.4.1. The existing React UI calls the Browser SDK directly; this is not a conversion to the React SDK's context/hooks.

- `FastAuthClient.login()` starts the provider's default popup. The SDK derives the pilot's MPC public key.
- A subsequent server-held PKCE redirect establishes the HttpOnly API session. Its verified identity must derive the same public key as the SDK login. The browser's claim alone cannot establish identity. Provider SSO may avoid another credential prompt, but this remains a separate handshake.
- The server returns a bounded delegate descriptor. The browser reconstructs it with the SDK's transaction encoder, checks the account, contract, device key and expiry, and requires byte-for-byte equality with the server payload.
- `requestDelegateActionSignature()` starts the official signing redirect. The callback obtains the SDK signature request; server verification and sponsored broadcast remain authoritative. Identity login alone still grants no spending.

Compatibility fixes are intentionally scoped. The Browser SDK's NEAR 2.x dependencies are pinned to 2.0.2; a resolver selects those packages' CommonJS entry points because their published ESM barrels export erased types. The relayer retains its independent NEAR 7.x dependencies. Buffer/global shims load only with the SDK. Auth code is lazy-loaded so free play does not require the SDK download.

A tracked pnpm patch makes the provider's signing-token lookup cache-only with the exact `transaction:sign` scope. It fails when the approved token is absent instead of silently requesting a replacement token. Keep this patch until an upstream version provides equivalent behavior. Tests exercise the installed patched method.

Validation: all 145 tests across 28 files pass with `pnpm exec vitest run --maxWorkers=4`; full workspace typechecking/build passed before the final browser shim, and the web build/typecheck passed after it. The initial unrestricted test run exceeded the five-second limit in one campaign simulation test; reduced concurrency passed without changing the test or gameplay. Coverage includes SDK/server account mismatch, changed delegate payload, wrong issuer, missing approval token and the real SDK/server encoders agreeing. Contract code is unchanged.

The hosted prerequisite remains: allow `https://rivalghost.xyz` and `https://rivalghost.xyz/auth/callback` as callbacks, and `https://rivalghost.xyz` as a web origin in the shared testnet provider application. The SDK does not bypass this provider setting. Public auth and on-chain spending remain disabled until that check passes and the live environment is configured.

Official references: https://docs.near.org/web3-apps/tutorials/near-auth and https://docs.auth.near.org/sdks/browser-sdk.

Production-browser verification: an isolated Chromium run served the compiled web bundle at localhost:3000, clicked the real sign-in control, and reached `https://login.testnet.fast-auth.com/u/login/identifier` (Log in | Example) with no page errors. No credentials were entered and no authorization or transaction was submitted. Complete SDK login and session approval still require a fresh human test after provider configuration.

Deployment: release `13c1da5` is installed at https://rivalghost.xyz. API health and HTTPS return successfully, with public auth/on-chain economy disabled as expected. The existing preview database was backed up and retained; no live keys were migrated. The local API was restarted with its existing configuration to expose the new descriptor/account-binding checks.

Latest deployment status: the approved live-state cutover supersedes the disabled-preview checkpoint above. Public auth/on-chain economy are enabled, the local signer is stopped, and AI/HOUND remain disabled. Public UI/configuration and unsigned-write rejection checks pass. See `docs/hetzner-deployment.md` for validation and the outstanding provider callback requirement.
