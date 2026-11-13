//! Small, explicitly bounded JSON ABI. Method names and field shapes match the SDK ABI.
//! Integer-only input avoids linking a general floating-point JSON formatter into Wasm.
#![cfg(any(target_arch = "wasm32", test))]
use super::*;
use near_sdk::serde::de::DeserializeOwned;

#[inline(never)]
fn decode<T: DeserializeOwned>(input: &[u8]) -> T {
    validate_input(input);
    serde_json_wasm::from_slice(input).unwrap_or_else(|_| env::panic_str("Invalid JSON arguments"))
}
#[inline(never)]
fn validate_input(input: &[u8]) {
    require!(input.len() <= 8192, "Input too large");
    // Bound nesting before entering the recursive decoder, respecting quoted escapes.
    let (mut depth, mut quoted, mut escaped) = (0u8, false, false);
    for &byte in input {
        if quoted {
            if escaped {
                escaped = false;
            } else if byte == b'\\' {
                escaped = true;
            } else if byte == b'"' {
                quoted = false;
            }
        } else {
            match byte {
                b'"' => quoted = true,
                b'[' | b'{' => {
                    depth += 1;
                    require!(depth <= 8, "JSON nesting too deep");
                }
                b']' | b'}' => {
                    require!(depth > 0, "Invalid JSON");
                    depth -= 1;
                }
                _ => {}
            }
        }
    }
    require!(!quoted && depth == 0, "Invalid JSON");
}

#[cfg(target_arch = "wasm32")]
#[inline(never)]
fn input<T: DeserializeOwned>() -> T {
    require!(
        env::attached_deposit().is_zero(),
        "This method does not accept NEAR"
    );
    decode(&env::input().unwrap_or_else(|| b"{}".to_vec()))
}
#[cfg(target_arch = "wasm32")]
#[inline(never)]
fn output<T: near_sdk::serde::Serialize>(value: &T) {
    let bytes =
        serde_json_wasm::to_vec(value).unwrap_or_else(|_| env::panic_str("Cannot encode result"));
    env::value_return(&bytes);
}

#[cfg(target_arch = "wasm32")]
#[inline(never)]
fn load() -> RivalGhost {
    env::state_read().unwrap_or_else(|| env::panic_str("Contract is not initialized"))
}
#[cfg(target_arch = "wasm32")]
#[inline(never)]
fn save(game: &RivalGhost) {
    env::state_write(game);
}
macro_rules! args {
    ($name:ident $(, $field:ident : $kind:ty)*) => {
        #[cfg(target_arch = "wasm32")]
        #[derive(near_sdk::serde::Deserialize)]
        #[serde(crate = "near_sdk::serde", deny_unknown_fields)]
        struct $name { $($field: $kind),* }
    };
}
args!(EmptyArgs);
args!(AccountArgs, account_id: AccountId);
args!(CrownArgs, crown_id: u64);
args!(ChallengeArgs, challenge_id: u64);
args!(SeedArgs, seed: CrownSeed);
args!(ExpeditionArgs, seed: CrownSeed, mission: CompetitionMission);
args!(CertificateArgs, certificate: SettlementCertificate);
args!(InitArgs, operator: AccountId, verifier_public_key: Vec<u8>);
macro_rules! view {
    ($name:ident, $args:ident $(, $arg:ident)*) => {
        #[cfg(target_arch = "wasm32")]
        #[no_mangle]
        pub extern "C" fn $name() {
            let $args { $($arg),* } = input::<$args>();
            let game = load();
            output(&game.$name($($arg),*));
        }
    };
}
macro_rules! change {
    ($name:ident, $args:ident $(, $arg:ident)*) => {
        #[cfg(target_arch = "wasm32")]
        #[no_mangle]
        pub extern "C" fn $name() {
            let $args { $($arg),* } = input::<$args>();
            let mut game = load();
            let result = game.$name($($arg),*);
            save(&game);
            output(&result);
            // NEAR atomically commits all storage writes or rolls back the receipt.
        }
    };
}
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn new() {
    let args = input::<InitArgs>();
    require!(!env::state_exists(), "Contract is already initialized");
    let game = RivalGhost::new(args.operator, args.verifier_public_key);
    save(&game);
}
view!(rules_version, EmptyArgs);
view!(supported_rules_versions, EmptyArgs);
view!(verifier_public_key, EmptyArgs);
view!(operator, EmptyArgs);
view!(verifier_key_version, EmptyArgs);
view!(has_guest_grant, AccountArgs, account_id);
view!(get_balance, AccountArgs, account_id);
view!(get_crown, CrownArgs, crown_id);
view!(get_challenge, ChallengeArgs, challenge_id);
view!(get_active_challenge, AccountArgs, account_id);
change!(create_guest, AccountArgs, account_id);
change!(seed_crown, SeedArgs, seed);
change!(seed_expedition_crown, ExpeditionArgs, seed, mission);
change!(start_challenge, CrownArgs, crown_id);
change!(settle_challenge, CertificateArgs, certificate);
change!(expire_challenge, ChallengeArgs, challenge_id);
change!(defend_crown, CrownArgs, crown_id);
change!(close_expired_crown, CrownArgs, crown_id);

#[cfg(test)]
mod tests {
    #![cfg(any(target_arch = "wasm32", test))]
    use super::*;
    #[test]
    fn codec_matches_the_existing_typescript_certificate() {
        let fixture: near_sdk::serde_json::Value = near_sdk::serde_json::from_str(include_str!(
            "../../../fixtures/expedition-v2-settlement.json"
        ))
        .unwrap();
        let bytes = near_sdk::serde_json::to_vec(&fixture["contractCertificate"]).unwrap();
        let small: SettlementCertificate = decode(&bytes);
        let encoded = serde_json_wasm::to_vec(&small).unwrap();
        assert_eq!(
            near_sdk::serde_json::from_slice::<near_sdk::serde_json::Value>(&encoded).unwrap(),
            fixture["contractCertificate"]
        );
    }
    #[test]
    fn codec_rejects_overflow_and_non_integer_fields() {
        #[derive(near_sdk::serde::Deserialize)]
        #[serde(crate = "near_sdk::serde", deny_unknown_fields)]
        struct Args {
            crown_id: u64,
        }
        for json in [
            r#"{"crown_id":-1}"#,
            r#"{"crown_id":1.5}"#,
            r#"{"crown_id":18446744073709551616}"#,
            r#"{"crown_id":1,"crown_id":2}"#,
            r#"{"crown_id":1,"extra":0}"#,
        ] {
            assert!(serde_json_wasm::from_str::<Args>(json).is_err(), "{json}");
        }
        assert_eq!(decode::<Args>(br#"{"crown_id":42}"#).crown_id, 42);
    }
}
