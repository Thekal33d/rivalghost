# Contract build and size gate

The candidate is `target/near/rivalghost_contract.wasm`, produced by `pnpm contract:build`. Run **`pnpm contract:check`** for formatting, native tests, strict size enforcement and actual raw/optimized Wasm execution.

The verified November 13 build is **99,448 bytes**, down from 171,363. The raw Cargo output is 123,175 bytes; do not deploy it. The unchanged gate requires **less than 100,000 bytes**, leaving 552 bytes of headroom.

SHA-256: `6815039240bff8213dc860f35939d8cb78c63d16cc0f78ab77d014803bbf858b`.

Measured with rustc 1.98.1, near-sdk 5.29.0, serde-json-wasm 1.0.1 and pinned Binaryen 132.0.0. Cargo retains overflow checks, LTO, one codegen unit, aborting panics and `--cfg near`. Shared integer JSON glue, immediate-write SDK maps and control-flow optimization remove size overhead while preserving signature checks and storage layout.

Nineteen native tests and the Wasm host-double exercise pass. Both artifacts reject 62 invalid calls, settle signed fixtures and retain the same storage size over ten repeated challenge cycles. The host double is not the NEAR VM and does not measure gas. Read [the full review](contract-review.md) for input tightening, initialization, retention behavior, approved expiry forfeiture, remaining legacy/supply issues and deployment gates. No deployment has occurred.
