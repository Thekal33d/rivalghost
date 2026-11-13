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
fn load() -> Economy {
    env::state_read().unwrap_or_else(|| env::panic_str("Contract is not initialized"))
}
#[cfg(target_arch = "wasm32")]
#[inline(never)]
fn save(game: &Economy) {
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
args!(ActorArgs, actor: AccountId);
args!(SlotArgs, slot: u8);
args!(IntentArgs, intent: Intent);
args!(CertificateArgs, certificate: Vec<u8>);
args!(InitArgs, operator: AccountId, hound: AccountId, moth: AccountId, verifier: Vec<u8>);
args!(SessionArgs, public_key: Vec<u8>, until: u64);
args!(ConfigArgs, paused: bool, verifier: Vec<u8>, focus: u8);
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
    let game = Economy::new(args.operator, args.hound, args.moth, args.verifier);
    save(&game);
}
view!(get_world, EmptyArgs);
view!(get_pilot, ActorArgs, actor);
view!(next_sequence, EmptyArgs);
change!(join, EmptyArgs);
change!(set_session, SessionArgs, public_key, until);
change!(configure, ConfigArgs, paused, verifier, focus);
change!(execute, IntentArgs, intent);

change!(expire, ActorArgs, actor);
change!(close_crown, SlotArgs, slot);

#[cfg(target_arch = "wasm32")]
fn certificate() -> Certificate {
    let args = input::<CertificateArgs>();
    require!(args.certificate.len() <= 512, "Certificate too large");
    near_sdk::borsh::from_slice(&args.certificate)
        .unwrap_or_else(|_| env::panic_str("Invalid certificate"))
}
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn settle() {
    let c = certificate();
    let mut game = load();
    let result = game.settle(c);
    save(&game);
    output(&result);
}
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn seed_crown() {
    let c = certificate();
    let mut game = load();
    game.seed_crown(c);
    save(&game);
}
