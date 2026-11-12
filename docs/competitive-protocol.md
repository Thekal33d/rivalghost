# Competitive expedition protocol

The current ten-chapter simulator can now participate in a separate rules-v2 competition. The legacy Crown-v1 path and its certificate bytes remain supported.

A competition mission is `{revision:1, chapter:0..9, rig:"needle"|"fan"|"guard"}`. Its fingerprint is SHA-256 of the UTF-8 string `RIVALGHOST-MISSION-v2|1|3600|seed|chapter|rig`. Revision 1 freezes the current physics/catalog; changing competitive physics requires a new revision with explicit verifier support. Every flight starts with the same base rig: local medals and campaign progress are never inputs.

The operator seeds a Crown using `seed_expedition_crown(seed, mission)` after verifying its opening replay. The contract computes the fingerprint itself. Starting a challenge copies the mission, seed, rules version and fingerprint from that Crown. Both the player and Crown are locked until settlement or expiry. Defense is blocked during a flight so the target and bounty cannot change underneath a player.

The verifier re-simulates the submitted inputs, rejects mismatched mission/rig/seed/revision/rules, and computes replay and final-result hashes. A v2 certificate signs `RIVALGHOST-CERT-v2|near:testnet|contract_id|` followed by the existing positional certificate fields. It cannot settle a different testnet deployment. The contract independently checks the bound fields, expiry, key version, signature and live lock before changing balances.

The certificate format version and game rules version are separate fields. Legacy v1 certificates retain their original domain and are not retroactively deployment-bound. New expedition competitions must use certificate version 2.

## Deployment boundary

This changes the Borsh layout of Crown/Challenge records. It targets a **fresh testnet deployment**, not an in-place upgrade of existing state. No deployment currently exists in this project; no migration or deployment has been performed.

The mission uses compact numeric fields and a rig enum, and reuses the certificate's existing loadout-hash slot. Crown metadata and its lock add state; actual Wasm size and storage/gas measurements remain required. Campaign play continues to make no contract calls.

## Trust and next gates

A replay proves the deterministic outcome of supplied inputs, not that a human played them live. A trusted verifier remains an explicit trust assumption. Opening Crown records remain operator-authorized. Guest authentication, rate-limited sponsored transactions, replay persistence and deployed end-to-end checks must exist before exposing funded competitive play publicly.
