# Contract build and size gate

The production candidate is `target/near/rivalghost_contract.wasm`, produced by `pnpm contract:build`. The build uses the NEAR host configuration (`--cfg near`) and pinned Binaryen 132.0.0 size optimization. It retains the Rust module's supported features instead of enabling experimental encodings.

The initial 220,885-byte measurement included local implementations of hashing/panics because the installed `near-sdk-env` requires explicit NEAR configuration. The corrected raw artifact is 207,729 bytes; the optimized artifact is **169,809 bytes** (SHA-256 `86bc636411e6a4d0f11d8006d99f130261f13e977b819ee07601e0ea7b2295ac`). This is a 23.1% reduction from the initial measurement, but still exceeds the unchanged **100,000-byte** ceiling.

`pnpm contract:smoke` executes the actual raw and optimized Wasm using a deterministic host double. It compares mission binding, a TypeScript-generated signed payout, duplicate-certificate rejection and complete resulting storage. This complements the Rust tests; it does not measure NEAR VM gas or replace sandbox/testnet deployment testing.

`pnpm contract:size` intentionally remains failing. Further reduction must preserve the public ABI and settlement checks; the ceiling has not been raised and no chain account has been funded or deployed. Avoid installing an artifact directly from the raw Cargo output.
