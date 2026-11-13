# RivalGhost — NEAR Auth integration decision

November 13, 2026. The creator selected https://docs.auth.near.org/ as the game's sign-in provider. Status: selected and researched; **not implemented or live yet**. The existing device-key pilot remains the working local path until migration is tested.

## Current position

Playable local alpha: ten story chapters, combat/replays, usernames/avatars/leaderboards, Crown Pit, Workshop crafting/trading/restoration and bounded NPC policies. The NEAR settlement candidate is 99,428 bytes, with 19 Rust and 88 application tests passing. No deployment, public host, Cloud activation or remote repository is configured. Current v3 gameplay and the Workshop economy do not settle on NEAR.

## Chosen sign-in approach

Keep free play accessible. Offer NEAR Auth when saving/linking a pilot and entering online features. Preserve the current pilot's identity and server inventory during linking; do not grant another 100 CR for logging in. Local chapter progress needs a separately defined persistence/merge policy before promising cross-device saves.

Use the Browser SDK and JavaScript provider inside React, behind a small adapter. NEAR Auth documents NEP-413 message signing for the Browser SDK; the React SDK does not currently support it. This is the path for independently establishing a backend session. Message signing still entails a funded NEAR Auth contract call, despite the player's account not sending its own transaction. Server-issued one-use challenges must be bound to the initiating session, with signature and account ownership checked before issuing a game session. [Message-signing guide](https://docs.auth.near.org/home/guides/sign-messages)

Keep signing outside combat. Save pending actions before popup/redirect, recover after return, and distinguish authenticated, account-ready, submitted and finalized states. Integrate the existing method-limited game transport through an explicit adapter: the Auth SDK's transaction shape differs from our Wallet Selector-style interface. [Quickstart](https://docs.auth.near.org/home/quickstart)

The external authentication contracts are separate from RivalGhost's Wasm. No Auth0/JWT parser should be added to the game contract. The 100,000-byte game-contract gate stays enforced. Auth/MPC sponsorship has its own gas, deposit, request and rate-limit budget; test credentials do not mean free unlimited signing.

## Network and configuration

Start on testnet. Published shared testnet credentials mean no new Auth0 tenant or production approval is needed to begin development. Confirm allowed local/deployed callback origins during integration; do not assume every preview URL is accepted. [Testnet resources](https://docs.auth.near.org/resources/testnet)

Mainnet is a later release decision. It needs provider approval and app-specific configuration. Prepare RivalGhost's description, HTTPS logo, expected user bracket, exact callback URL, web origin and a contact email once the hosting URL exists. [Production access](https://docs.auth.near.org/home/apply)

## Implementation milestones — commit each

1. Inspect/pin compatible SDK packages; add a testnet-only adapter, callback handling, disabled/unavailable states and an optional sign-in entry. Validate existing free play and cancellation recovery.
2. Add server challenge/session verification and authenticated pilot linking. Require ownership of the current guest pilot as well as the new identity. Reject linking conflicts and replayed/wrong-session proofs; preserve balances, listings, username and inventories without merging untrusted balances.
3. Wire bounded funded signing/relay and the existing finalized-transaction recovery. Confirm signer/account/key permissions, network, receiver and allowed methods. Measure Auth/MPC costs independently from game execution. Do not fund or broadcast a live test without a configured operator and concrete approved budget.
4. Resolve the contract review's expiry, legacy domain, finite supply and storage-cap issues. Promote current v3 rules through shared verifier/contract fixtures and recheck artifact size.
5. Deploy the testnet slice only after runtime validation and configuration; run fresh-user, returning-user, logout, second-device, timeout, popup-blocked and duplicate-submit checks. Cross-device progress requires its own tested synchronization, not just social login.

## Creator actions and open decisions

- Provide the intended GitHub repository URL; create an empty repository under Thekal33d if none exists.
- Create a NEAR testnet operator wallet, obtain testnet faucet funding and provide only its public account ID. Configure signing credentials privately when the deployment/relay flow is ready.
- Provide the available hosting account/provider and monthly hosting/AI spending ceiling. The persistent server/database needs a durable host; an HTTPS origin is needed for public callbacks. No paid plan has been selected or purchased.
- Create a NEAR AI Cloud organization for live NPC compute; provide its public identifier/setup status, and configure secrets privately later. This is separate from NEAR Auth and does not block building the sign-in adapter.
- Decide ranked expiry: recommendation is forfeiture of the 10-CR entry for a voluntarily unresolved flight, paired with an explicitly designed verifier-outage remedy. Existing refunds remain unchanged pending the creator's decision.

No user action is required to start local adapter/backend work. Live funded signing, deployed callbacks, inference and publication remain distinct setup gates.
