# RivalGhost — funded AI pilot preparation

November 13, 2026

The creator confirms at least $1 of usable NEAR AI Cloud credits. The API key is saved in the ignored, owner-only `apps/relayer/.env`; it was not printed or committed. Paid inference remains **disabled**. Reading the model catalog does not prove an authenticated, paid inference request will succeed.

## Selected model and live metadata

`Qwen/Qwen3-VL-30B-A3B-Instruct` is the selected pilot model. The live `/v1/models` response reports `owned_by: nearai`, readiness, structured output support, no reasoning feature, a 16,384-token context and support for `max_tokens`. Its current input/output rates are **$0.15 / $0.55 per million tokens**, with no request surcharge. This is an economical fit for MOTH's two-choice recovery/courier decision. No model quality or latency claim has been validated through paid inference yet. [Provider catalog](https://cloud-api.near.ai/v1/models), [official metadata and privacy-tier explanation](https://docs.near.ai/cloud/models).

NEAR hosting is provider-reported. RivalGhost still reports `attestationVerified: false`; it has not independently verified an enclave attestation.

## Spending controls implemented

- The private configuration sets `NEAR_AI_TOTAL_BUDGET_USD=1`, within the creator's $5 overall pilot ceiling. Raising it later requires an explicit decision; there is no automatic top-up.
- The same durable SQLite database records a **$0.003 reservation per attempt**, atomically with the daily counter and six-hour interval. Reservations survive service restarts and UTC day changes. Failed, rejected and uncertain attempts retain their reservation; even a failed catalog check consumes the attempt.
- At most **four attempts per UTC day**, at least six hours apart. A $1 reservation allowance permits at most 333 attempts. Multiple service instances using the same database cannot reserve the same available allowance concurrently.
- Before every inference request, re-read the model catalog. Block if the model/hosting/readiness changes, prices exceed the reviewed ceilings, a request surcharge appears, the context exceeds 16,384, reasoning is introduced, or the output-token cap is unsupported. Pricing failure uses the local policy, without a paid POST.
- Request at most **64 output tokens**, without streaming or automatic retries. At the reviewed ceilings, even a full 16,384-token input plus 64 output tokens costs $0.0024928, below the $0.003 reservation. Actual prompts are much smaller. Only bounded aggregate stock/restoration data is sent.
- The model can choose only recovery or courier focus; it cannot set prices, mint credits, transfer funds, change rewards or execute tools. Gameplay continues with the local fallback on failure.

This is a conservative **application reservation limit**, not a provider balance or invoice meter. It relies on the provider honoring published prices and token limits. It cannot cap separate clients using the same key/account or spending after an operator deletes/replaces the database. Keep the dedicated key private, preserve the database/backups and retain provider-side prepaid/no-top-up controls. Actual charged usage must be checked after the first live request.

## Read-only configuration check

Run `pnpm compute:check` from the repository. It validates the private configuration and live catalog, using an isolated in-memory database. It prints only non-secret readiness/model/budget fields and never calls the completion endpoint. The live check passed with inference disabled, a $1 allowance and a $0.003 reservation.

The production server still requires `NEAR_AI_ENABLED=true` for paid decisions. Do not enable it merely to check whether the key is present. The first live test should be one MOTH decision with one $0.003 reservation, followed by inspection of the returned choice, latency and provider usage. No funded NEAR wallet transaction or staking is involved in inference.

## Verification

`pnpm check`: **103 tests**, typechecking and production builds pass. Nine compute tests include durable budget exhaustion after a real database close/reopen and next-day rollover, changed pricing/capabilities preventing inference, failed-request reservations, parallel service instances, constrained payloads and exact dollar parsing. Provider inference is mocked in these tests. `pnpm compute:check` also passed against the real model catalog, with **no paid inference request**.
