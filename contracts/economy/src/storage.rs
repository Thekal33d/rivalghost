//! Immediate-write SDK maps keep this small ledger free of per-type tree caches.
//! The SDK documents their key layout as compatible with store::LookupMap<_, _, Identity>.
use near_sdk::{
    borsh::{BorshDeserialize, BorshSerialize},
    IntoStorageKey,
};
#[derive(BorshDeserialize, BorshSerialize)]
#[borsh(crate = "near_sdk::borsh")]
pub struct StorageMap<K, V> {
    inner: near_sdk::collections::LookupMap<K, V>,
}
impl<K: BorshSerialize, V: BorshSerialize + BorshDeserialize> StorageMap<K, V> {
    pub fn new<S: IntoStorageKey>(prefix: S) -> Self {
        Self {
            inner: near_sdk::collections::LookupMap::new(prefix),
        }
    }
    pub fn get(&self, key: &K) -> Option<V> {
        self.inner.get(key)
    }
    pub fn insert(&mut self, key: K, value: V) {
        self.inner.insert_raw(&encode(&key), &encode(&value));
    }
    #[cfg(test)]
    pub fn remove(&mut self, key: &K) {
        self.inner.remove_raw(&encode(key));
    }
}

fn encode<T: BorshSerialize>(value: &T) -> Vec<u8> {
    near_sdk::borsh::to_vec(value)
        .unwrap_or_else(|_| near_sdk::env::panic_str("Cannot serialize storage"))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn map_metadata_and_keys_match_the_previous_sdk_store_map() {
        use near_sdk::{env, test_utils::VMContextBuilder, testing_env};
        testing_env!(VMContextBuilder::new().build());
        let prefix = b"compat".to_vec();
        let mut old: near_sdk::store::LookupMap<u64, u64> =
            near_sdk::store::LookupMap::new(prefix.clone());
        let mut new: StorageMap<u64, u64> = StorageMap::new(prefix.clone());
        assert_eq!(encode(&old), encode(&new));
        old.insert(7, 42);
        old.flush();
        assert_eq!(new.get(&7), Some(42));
        new.insert(7, 99);
        let mut raw_key = prefix;
        raw_key.extend_from_slice(&7u64.to_le_bytes());
        assert_eq!(env::storage_read(&raw_key).unwrap(), 99u64.to_le_bytes());
        new.remove(&7);
        assert!(env::storage_read(&raw_key).is_none());
    }
}
