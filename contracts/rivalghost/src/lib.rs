use near_sdk::store::LookupMap;
use near_sdk::{env, near, require, AccountId, BorshStorageKey, PanicOnDefault};

const GUEST_GRANT_CREDITS: u64 = 100;
const CHALLENGE_ENTRY_CREDITS: u64 = 10;
const MINIMUM_BOUNTY_CREDITS: u64 = 20;
const CHALLENGE_EXPIRY_MS: u64 = 120_000;
const ROUND_EXPIRY_MS: u64 = 1_800_000;

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum StorageKey {
    Balances,
    GuestGrants,
    Crowns,
    Challenges,
    ActiveChallengeByPlayer,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Crown {
    pub id: u64,
    pub holder: AccountId,
    pub score_to_beat: u64,
    pub bounty_credits: u64,
    pub seed: u32,
    pub ghost_hash: String,
    pub rules_version: u8,
    pub opened_at_ms: u64,
    pub expires_at_ms: u64,
    pub active: bool,
    pub defense_used: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Challenge {
    pub id: u64,
    pub crown_id: u64,
    pub challenger: AccountId,
    pub entry_credits: u64,
    pub started_at_ms: u64,
    pub expires_at_ms: u64,
    pub rules_version: u8,
    pub settled: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct CrownSeed {
    pub holder: AccountId,
    pub score_to_beat: u64,
    pub bounty_credits: u64,
    pub seed: u32,
    pub ghost_hash: String,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct RivalGhost {
    rules_version: u8,
    operator: AccountId,
    next_crown_id: u64,
    next_challenge_id: u64,
    balances: LookupMap<AccountId, u64>,
    guest_grants: LookupMap<AccountId, bool>,
    crowns: LookupMap<u64, Crown>,
    challenges: LookupMap<u64, Challenge>,
    active_challenge_by_player: LookupMap<AccountId, u64>,
}

#[near]
impl RivalGhost {
    #[init]
    pub fn new(operator: AccountId) -> Self {
        Self {
            rules_version: 1,
            operator,
            next_crown_id: 0,
            next_challenge_id: 0,
            balances: LookupMap::new(StorageKey::Balances),
            guest_grants: LookupMap::new(StorageKey::GuestGrants),
            crowns: LookupMap::new(StorageKey::Crowns),
            challenges: LookupMap::new(StorageKey::Challenges),
            active_challenge_by_player: LookupMap::new(StorageKey::ActiveChallengeByPlayer),
        }
    }

    pub fn rules_version(&self) -> u8 {
        self.rules_version
    }

    pub fn operator(&self) -> AccountId {
        self.operator.clone()
    }

    pub fn get_balance(&self, account_id: AccountId) -> u64 {
        self.balances.get(&account_id).copied().unwrap_or(0)
    }

    pub fn get_crown(&self, crown_id: u64) -> Option<Crown> {
        self.crowns.get(&crown_id).cloned()
    }

    pub fn get_challenge(&self, challenge_id: u64) -> Option<Challenge> {
        self.challenges.get(&challenge_id).cloned()
    }

    pub fn get_active_challenge(&self, account_id: AccountId) -> Option<Challenge> {
        self.active_challenge_by_player
            .get(&account_id)
            .and_then(|challenge_id| self.challenges.get(&challenge_id).cloned())
    }

    /// This remains operator-only until the authenticated bootstrap path is added.
    pub fn create_guest(&mut self, account_id: AccountId) -> u64 {
        self.assert_operator();
        require!(self.guest_grants.get(&account_id).is_none(), "Guest grant already claimed");
        self.guest_grants.insert(account_id.clone(), true);
        self.balances.insert(account_id, GUEST_GRANT_CREDITS);
        GUEST_GRANT_CREDITS
    }

    /// Seeds a bounded Crown record. Opening replay validation is added with verifier certificates.
    pub fn seed_crown(&mut self, seed: CrownSeed) -> Crown {
        self.assert_operator();
        require!(seed.bounty_credits >= MINIMUM_BOUNTY_CREDITS, "Bounty is below the minimum");
        require!(seed.ghost_hash.len() == 64, "Ghost hash must be a SHA-256 hex string");
        require!(self.get_balance(seed.holder.clone()) >= seed.bounty_credits, "Holder lacks credits");

        let balance = self.get_balance(seed.holder.clone()) - seed.bounty_credits;
        self.balances.insert(seed.holder.clone(), balance);
        let opened_at_ms = now_ms();
        let crown = Crown {
            id: self.next_crown_id,
            holder: seed.holder,
            score_to_beat: seed.score_to_beat,
            bounty_credits: seed.bounty_credits,
            seed: seed.seed,
            ghost_hash: seed.ghost_hash,
            rules_version: self.rules_version,
            opened_at_ms,
            expires_at_ms: opened_at_ms + ROUND_EXPIRY_MS,
            active: true,
            defense_used: false,
        };
        self.crowns.insert(crown.id, crown.clone());
        self.next_crown_id += 1;
        crown
    }

    pub fn start_challenge(&mut self, crown_id: u64) -> Challenge {
        let challenger = env::predecessor_account_id();
        require!(self.active_challenge_by_player.get(&challenger).is_none(), "Player already has a live challenge");
        let crown = self.crowns.get(&crown_id).cloned().expect("Crown not found");
        require!(crown.active && now_ms() < crown.expires_at_ms, "Crown is not open");
        require!(crown.holder != challenger, "Cannot challenge your own Crown");
        let balance = self.get_balance(challenger.clone());
        require!(balance >= CHALLENGE_ENTRY_CREDITS, "Insufficient CR");

        self.balances.insert(challenger.clone(), balance - CHALLENGE_ENTRY_CREDITS);
        let started_at_ms = now_ms();
        let challenge = Challenge {
            id: self.next_challenge_id,
            crown_id,
            challenger: challenger.clone(),
            entry_credits: CHALLENGE_ENTRY_CREDITS,
            started_at_ms,
            expires_at_ms: started_at_ms + CHALLENGE_EXPIRY_MS,
            rules_version: crown.rules_version,
            settled: false,
        };
        self.challenges.insert(challenge.id, challenge.clone());
        self.active_challenge_by_player.insert(challenger, challenge.id);
        self.next_challenge_id += 1;
        challenge
    }

    fn assert_operator(&self) {
        require!(env::predecessor_account_id() == self.operator, "Operator only");
    }
}

fn now_ms() -> u64 {
    env::block_timestamp() / 1_000_000
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn account(value: &str) -> AccountId {
        value.parse().unwrap()
    }

    fn context(predecessor: &str, timestamp_ms: u64) {
        let mut builder = VMContextBuilder::new();
        builder.predecessor_account_id(account(predecessor));
        builder.block_timestamp(timestamp_ms * 1_000_000);
        testing_env!(builder.build());
    }

    #[test]
    fn grants_once_and_locks_one_challenge() {
        context("operator.testnet", 1_000);
        let mut contract = RivalGhost::new(account("operator.testnet"));
        contract.create_guest(account("hound.testnet"));
        contract.create_guest(account("player.testnet"));
        let crown = contract.seed_crown(CrownSeed {
            holder: account("hound.testnet"),
            score_to_beat: 14_000,
            bounty_credits: 40,
            seed: 3,
            ghost_hash: "a".repeat(64),
        });
        assert_eq!(contract.get_balance(account("hound.testnet")), 60);

        context("player.testnet", 1_001);
        let challenge = contract.start_challenge(crown.id);
        assert_eq!(challenge.entry_credits, 10);
        assert_eq!(contract.get_balance(account("player.testnet")), 90);
        assert_eq!(contract.get_active_challenge(account("player.testnet")).unwrap().id, challenge.id);
    }
}
