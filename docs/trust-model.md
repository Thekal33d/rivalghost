# RivalGhost Trust Model

**Status:** v1 testnet model. RivalGhost is deliberately auditable, but it is not marketed as trustless. This document names the trusted parties and limits their power in code where possible.

## Assets worth protecting

- Player internal CR balance and one-time guest grant.
- Crown Bounty, holder, Ghost hash, and score to beat.
- Challenge entry and exactly-once settlement.
- Replay integrity and the certificate binding it to a Challenge.
- Relayer funds and private signing key.
- HOUND’s separately held CR budget.

## Component responsibilities

| Component | Trusted for | Must not be trusted for |
| --- | --- | --- |
| Browser | Rendering, input capture, local replay upload | Final score, CR movement, Challenge fields, certificate creation. |
| Shared simulator | Reproducing v1 rules exactly | Network reads, secrets, or economic authority. |
| Verifier | Running the simulator and issuing an eligible signed certificate | Holding CR or directly changing contract state. |
| Relayer | Paying approved delegated-action gas and enforcing rate limits | Deciding a score or bypassing contract validation. |
| NEAR contract | CR ledger, Challenge lifecycle, certificate binding, exactly-once payout | Rendering, replay storage, or free-form AI decisions. |
| Operator | Verifier-key rotation and narrowly defined outage cancellation | Arbitrary player loss or normal settlement replacement. |
| HOUND service | Choosing among policy-legal game actions and short narration | Minting CR, altering rules, or bypassing the verifier. |

## Boundaries enforced by design

### Browser and replay

The browser is adversarial. It can alter local UI, create arbitrary input bytes, and call public views. The contract therefore accepts no client-provided score, seed, loadout, or replay hash as authoritative settlement data.

The verifier reads the stored Challenge, rejects input that fails fixed size/tick/encoding rules, runs the pure simulator, stores the replay by content hash, and signs a certificate that includes the Challenge ID, Crown ID, player, seed, rules version, loadout hash, replay hash, final state hash, score, issue/expiry times, and verifier key version.

The contract verifies that this certificate is current and bound to the unresolved stored Challenge, then marks it consumed before moving CR. A reused, expired, mismatched, or already-settled certificate fails.

### Relayer and guest keys

The relayer private key is server-only. Delegated actions have one receiver (the RivalGhost contract), an allowlisted method set, zero attached deposit, explicit gas, expiry, nonce, and one account identity. The contract treats `predecessor_account_id` as the user for relayed game calls, consistent with NEP-366 semantics. [NEP-366](https://docs.near.org/protocol/transactions/meta-tx)

The relayer can refuse to sponsor or submit an otherwise valid action; this is an availability risk, not settlement authority. It cannot make the contract accept an invalid certificate. Rate limits reduce sponsor draining but do not substitute for contract-side validation.

Guest recovery is explicitly out of scope for the hackathon build. Clearing browser storage may lose guest access; that limitation must be stated during onboarding rather than hidden.

### Operator powers

The operator is trusted to deploy the tested contract, configure an initial verifier public key, and invoke `cancel_for_service_failure` only for documented unresolved verifier outages. That method must be restricted, emit an auditable reason code, return only the original entry, and never assign a win/loss or take a Bounty.

Verifier key rotation must retain a key version so valid in-flight certificates can be either honored until their short expiry or explicitly invalidated via a visible operational incident. The operator cannot alter a settled Challenge or forge a valid verifier signature without the verifier key.

### HOUND

HOUND’s policy service is trusted only to pick from contract-valid options. Code enforces its reserve, per-round commitment cap, one-active-Challenge rule, self-challenge prohibition, cooldown, and same-settlement-path requirement. A model may write flavor text after a deterministic action is selected; it never supplies an economic amount or authority.

## Threats and responses

| Threat | Response |
| --- | --- |
| Modified browser claims a higher score | Ignore browser score; replay is independently simulated and certificate-bound. |
| Certificate replay or duplicate submit | Challenge status and certificate-consumed marker make settlement exactly once. |
| Oversized replay or storage griefing | Fixed tick count, input size limit, hash-only contract storage, and relay preflight reject it. |
| Guest sponsors unlimited calls | One unresolved Challenge, method allowlist, per-account/IP limits, gas cap, and daily pause. |
| Relayer key leak | Keep key server-only; rotate/revoke service credentials and pause relay. It still cannot settle invalid results without a verifier certificate. |
| Verifier unavailable | Stop issuing starts if needed; let Challenge expiry or restricted cancellation return the entry. Never mark a player as losing. |
| Verifier compromised | It could issue bad certificates until key rotation. This is the primary trusted-service risk and is disclosed in the Proof drawer. |
| Operator misuse | Audit restricted calls and keep the operator scope narrow. This remains a trusted-admin risk for the testnet MVP. |
| HOUND model prompt injection | Give the model structured legal options only; validate selection and narration separately; fall back to templates. |

## Security gates before public testnet

- Unit-test every settlement branch, duplicate certificate, expired certificate, wrong player, wrong Crown, wrong seed, wrong rules version, and storage cleanup path.
- Add a bounded-state/property test to the contract before any public testnet account is funded.
- Review all relayer method/receiver/gas/deposit constraints against generated delegated actions.
- Put real secrets only in deployment environment variables; confirm `.env` is ignored before any key is created.
- Test outage and expiry paths with a disposable test account before inviting external players.
- Do not represent testnet CR as money, yield, an investment, or a redeemable prize.
