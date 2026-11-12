# Contract build and size gate

The production candidate is `target/near/rivalghost_contract.wasm`, produced by `pnpm contract:build`. The build uses the NEAR host configuration (`--cfg near`) and pinned Binaryen 132.0.0 size optimization. It retains the Rust module's supported features instead of enabling experimental encodings.

The initial 220,885-byte measurement included local implementations of hashing/panics because the installed `near-sdk-env` requires explicit NEAR configuration. Correcting the configuration and optimizing reduced that version to 169,809 bytes. With guest-grant lookup and the Crown defense eligibility checks, the current raw artifact is 209,693 bytes and the optimized artifact is **171,363 bytes** (SHA-256 `ecdabd606fda0ea717528b5eff2582c83ce19b60a8712552583a981c4c743b6b`). The economy correction adds 80 optimized bytes and no contract fields. This is a 22.5% reduction from the initial measurement, but still exceeds the unchanged **100,000-byte** ceiling.

`pnpm contract:smoke` executes the actual raw and optimized Wasm using a deterministic host double. It compares mission binding, a TypeScript-generated signed payout, duplicate-certificate rejection and complete resulting storage. This complements the Rust tests; it does not measure NEAR VM gas or replace sandbox/testnet deployment testing.

`pnpm contract:size` intentionally remains failing. Further reduction must preserve the public ABI and settlement checks; the ceiling has not been raised and no chain account has been funded or deployed. Avoid installing an artifact directly from the raw Cargo output.
