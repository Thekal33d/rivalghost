use near_sdk::store::LookupMap;
use near_sdk::{env, near, require, AccountId, BorshStorageKey, PanicOnDefault};

const GUEST_GRANT_CREDITS: u64 = 100;
const CHALLENGE_ENTRY_CREDITS: u64 = 10;
const FAILED_CHALLENGE_TO_BOUNTY_CREDITS: u64 = 8;
const FAILED_CHALLENGE_TO_HOLDER_CREDITS: u64 = 2;
const DEFEND_CREDITS: u64 = 20;
const MINIMUM_BOUNTY_CREDITS: u64 = 20;
const CHALLENGE_EXPIRY_MS: u64 = 120_000;
const ROUND_EXPIRY_MS: u64 = 1_800_000;
const CERTIFICATE_VERSION: u8 = 1;
const FIXED_LOADOUT_HASH: &str = "0000000000000000000000000000000000000000000000000000000000000000";

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
    pub seed: u32,
    pub loadout_hash: String,
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

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct SettlementCertificate {
    pub certificate_version: u8,
    pub challenge_id: u64,
    pub crown_id: u64,
    pub player_id: AccountId,
    pub rules_version: u8,
    pub seed: u32,
    pub loadout_hash: String,
    pub replay_hash: String,
    pub final_state_hash: String,
    pub score: u64,
    pub issued_at_ms: u64,
    pub expires_at_ms: u64,
    pub verifier_key_version: u8,
    pub signature: Vec<u8>,
}

#[near(serializers = [json])]
pub struct Settlement {
    pub challenge_id: u64,
    pub challenger_won: bool,
    pub challenger_credits: u64,
    pub holder_credits: u64,
    pub crown_bounty_credits: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct RivalGhost {
    rules_version: u8,
    operator: AccountId,
    verifier_public_key: Vec<u8>,
    verifier_key_version: u8,
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
    pub fn new(operator: AccountId, verifier_public_key: Vec<u8>) -> Self {
        require!(
            verifier_public_key.len() == 32,
            "Verifier key must be 32 Ed25519 bytes"
        );
        Self {
            rules_version: 1,
            operator,
            verifier_public_key,
            verifier_key_version: 1,
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

    pub fn verifier_key_version(&self) -> u8 {
        self.verifier_key_version
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
        require!(
            self.guest_grants.get(&account_id).is_none(),
            "Guest grant already claimed"
        );
        self.guest_grants.insert(account_id.clone(), true);
        self.balances.insert(account_id, GUEST_GRANT_CREDITS);
        GUEST_GRANT_CREDITS
    }

    /// Seeds a bounded Crown record after off-chain opening replay validation.
    pub fn seed_crown(&mut self, seed: CrownSeed) -> Crown {
        self.assert_operator();
        require!(
            seed.bounty_credits >= MINIMUM_BOUNTY_CREDITS,
            "Bounty is below the minimum"
        );
        require!(
            seed.ghost_hash.len() == 64,
            "Ghost hash must be a SHA-256 hex string"
        );
        require!(
            self.get_balance(seed.holder.clone()) >= seed.bounty_credits,
            "Holder lacks credits"
        );

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
        require!(
            self.active_challenge_by_player.get(&challenger).is_none(),
            "Player already has a live challenge"
        );
        let crown = self
            .crowns
            .get(&crown_id)
            .cloned()
            .expect("Crown not found");
        require!(
            crown.active && now_ms() + CHALLENGE_EXPIRY_MS <= crown.expires_at_ms,
            "Crown is not open for a full Challenge"
        );
        require!(
            crown.holder != challenger,
            "Cannot challenge your own Crown"
        );
        let balance = self.get_balance(challenger.clone());
        require!(balance >= CHALLENGE_ENTRY_CREDITS, "Insufficient CR");

        self.balances
            .insert(challenger.clone(), balance - CHALLENGE_ENTRY_CREDITS);
        let started_at_ms = now_ms();
        let challenge = Challenge {
            id: self.next_challenge_id,
            crown_id,
            challenger: challenger.clone(),
            entry_credits: CHALLENGE_ENTRY_CREDITS,
            started_at_ms,
            expires_at_ms: started_at_ms + CHALLENGE_EXPIRY_MS,
            rules_version: crown.rules_version,
            seed: crown.seed,
            loadout_hash: FIXED_LOADOUT_HASH.to_string(),
            settled: false,
        };
        self.challenges.insert(challenge.id, challenge.clone());
        self.active_challenge_by_player
            .insert(challenger, challenge.id);
        self.next_challenge_id += 1;
        challenge
    }

    /// Anyone may relay a valid certificate; payouts always go to its bound accounts.
    pub fn settle_challenge(&mut self, certificate: SettlementCertificate) -> Settlement {
        let now = now_ms();
        let mut challenge = self
            .challenges
            .get(&certificate.challenge_id)
            .cloned()
            .expect("Challenge not found");
        require!(!challenge.settled, "Challenge already settled");
        require!(now < challenge.expires_at_ms, "Challenge has expired");

        let mut crown = self
            .crowns
            .get(&challenge.crown_id)
            .cloned()
            .expect("Crown not found");
        self.assert_valid_certificate(&certificate, &challenge, &crown, now);

        challenge.settled = true;
        self.challenges.insert(challenge.id, challenge.clone());
        self.active_challenge_by_player
            .remove(&challenge.challenger);

        let challenger_won = certificate.score > crown.score_to_beat;
        if challenger_won {
            self.credit(
                challenge.challenger.clone(),
                challenge.entry_credits + crown.bounty_credits,
            );
            crown.holder = challenge.challenger.clone();
            crown.score_to_beat = certificate.score;
            crown.ghost_hash = certificate.replay_hash;
            crown.bounty_credits = 0;
        } else {
            crown.bounty_credits += FAILED_CHALLENGE_TO_BOUNTY_CREDITS;
            self.credit(crown.holder.clone(), FAILED_CHALLENGE_TO_HOLDER_CREDITS);
        }
        self.crowns.insert(crown.id, crown.clone());

        Settlement {
            challenge_id: challenge.id,
            challenger_won,
            challenger_credits: self.get_balance(challenge.challenger),
            holder_credits: self.get_balance(crown.holder),
            crown_bounty_credits: crown.bounty_credits,
        }
    }

    pub fn expire_challenge(&mut self, challenge_id: u64) -> u64 {
        let mut challenge = self
            .challenges
            .get(&challenge_id)
            .cloned()
            .expect("Challenge not found");
        require!(!challenge.settled, "Challenge already settled");
        require!(
            now_ms() >= challenge.expires_at_ms,
            "Challenge is still live"
        );

        challenge.settled = true;
        self.challenges.insert(challenge.id, challenge.clone());
        self.active_challenge_by_player
            .remove(&challenge.challenger);
        self.credit(challenge.challenger, challenge.entry_credits);
        challenge.entry_credits
    }

    pub fn defend_crown(&mut self, crown_id: u64) -> Crown {
        let holder = env::predecessor_account_id();
        let mut crown = self
            .crowns
            .get(&crown_id)
            .cloned()
            .expect("Crown not found");
        require!(
            crown.active && now_ms() < crown.expires_at_ms,
            "Crown is not open"
        );
        require!(crown.holder == holder, "Crown holder only");
        require!(!crown.defense_used, "Defense already used");
        let balance = self.get_balance(holder.clone());
        require!(balance >= DEFEND_CREDITS, "Insufficient CR");

        self.balances.insert(holder, balance - DEFEND_CREDITS);
        crown.bounty_credits += DEFEND_CREDITS;
        crown.defense_used = true;
        self.crowns.insert(crown.id, crown.clone());
        crown
    }

    pub fn close_expired_crown(&mut self, crown_id: u64) -> u64 {
        let mut crown = self
            .crowns
            .get(&crown_id)
            .cloned()
            .expect("Crown not found");
        require!(crown.active, "Crown already closed");
        require!(now_ms() >= crown.expires_at_ms, "Crown is still live");

        let payout = crown.bounty_credits;
        crown.bounty_credits = 0;
        crown.active = false;
        self.crowns.insert(crown.id, crown.clone());
        self.credit(crown.holder, payout);
        payout
    }

    fn assert_operator(&self) {
        require!(
            env::predecessor_account_id() == self.operator,
            "Operator only"
        );
    }

    fn assert_valid_certificate(
        &self,
        certificate: &SettlementCertificate,
        challenge: &Challenge,
        crown: &Crown,
        now: u64,
    ) {
        require!(
            certificate.certificate_version == CERTIFICATE_VERSION,
            "Certificate version is unsupported"
        );
        require!(
            certificate.crown_id == challenge.crown_id,
            "Certificate Crown does not match Challenge"
        );
        require!(
            certificate.player_id == challenge.challenger,
            "Certificate player does not match Challenge"
        );
        require!(
            certificate.rules_version == challenge.rules_version,
            "Certificate rules do not match Challenge"
        );
        require!(
            certificate.seed == challenge.seed && certificate.seed == crown.seed,
            "Certificate seed does not match Challenge"
        );
        require!(
            certificate.loadout_hash == challenge.loadout_hash,
            "Certificate loadout does not match Challenge"
        );
        require!(
            is_sha256_hex(&certificate.replay_hash),
            "Certificate replay hash is invalid"
        );
        require!(
            is_sha256_hex(&certificate.final_state_hash),
            "Certificate state hash is invalid"
        );
        require!(
            certificate.issued_at_ms <= now,
            "Certificate is issued in the future"
        );
        require!(
            certificate.expires_at_ms == challenge.expires_at_ms,
            "Certificate expiry does not match Challenge"
        );
        require!(now < certificate.expires_at_ms, "Certificate has expired");
        require!(
            certificate.verifier_key_version == self.verifier_key_version,
            "Certificate key version is stale"
        );
        require!(
            certificate.signature.len() == 64,
            "Certificate signature must be 64 bytes"
        );

        let signature: [u8; 64] = certificate
            .signature
            .as_slice()
            .try_into()
            .expect("Invalid signature length");
        let public_key: [u8; 32] = self
            .verifier_public_key
            .as_slice()
            .try_into()
            .expect("Invalid verifier key length");
        require!(
            env::ed25519_verify(&signature, certificate.message().as_bytes(), &public_key),
            "Certificate signature is invalid"
        );
    }

    fn credit(&mut self, account_id: AccountId, credits: u64) {
        let current = self.get_balance(account_id.clone());
        self.balances.insert(account_id, current + credits);
    }
}

impl SettlementCertificate {
    fn message(&self) -> String {
        format!(
            "RIVALGHOST-CERT-v1|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}|{}",
            self.challenge_id,
            self.crown_id,
            self.player_id,
            self.rules_version,
            self.seed,
            self.loadout_hash,
            self.replay_hash,
            self.final_state_hash,
            self.score,
            self.issued_at_ms,
            self.expires_at_ms,
            self.verifier_key_version,
        )
    }
}

fn now_ms() -> u64 {
    env::block_timestamp() / 1_000_000
}

fn is_sha256_hex(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};
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

    fn verifier_key() -> SigningKey {
        SigningKey::from_bytes(&[7; 32])
    }

    fn contract(signing_key: &SigningKey) -> RivalGhost {
        RivalGhost::new(
            account("operator.testnet"),
            signing_key.verifying_key().to_bytes().to_vec(),
        )
    }

    fn open_challenge(contract: &mut RivalGhost) -> Challenge {
        contract.create_guest(account("hound.testnet"));
        contract.create_guest(account("player.testnet"));
        let crown = contract.seed_crown(CrownSeed {
            holder: account("hound.testnet"),
            score_to_beat: 14_000,
            bounty_credits: 40,
            seed: 3,
            ghost_hash: "a".repeat(64),
        });
        context("player.testnet", 1_001);
        contract.start_challenge(crown.id)
    }

    fn certificate(
        signing_key: &SigningKey,
        challenge: &Challenge,
        score: u64,
    ) -> SettlementCertificate {
        let mut certificate = SettlementCertificate {
            certificate_version: CERTIFICATE_VERSION,
            challenge_id: challenge.id,
            crown_id: challenge.crown_id,
            player_id: challenge.challenger.clone(),
            rules_version: challenge.rules_version,
            seed: challenge.seed,
            loadout_hash: challenge.loadout_hash.clone(),
            replay_hash: "b".repeat(64),
            final_state_hash: "c".repeat(64),
            score,
            issued_at_ms: 1_002,
            expires_at_ms: challenge.expires_at_ms,
            verifier_key_version: 1,
            signature: Vec::new(),
        };
        certificate.signature = signing_key
            .sign(certificate.message().as_bytes())
            .to_bytes()
            .to_vec();
        certificate
    }

    #[test]
    fn grants_once_and_locks_one_challenge() {
        context("operator.testnet", 1_000);
        let signing_key = verifier_key();
        let mut contract = contract(&signing_key);
        let challenge = open_challenge(&mut contract);
        assert_eq!(contract.get_balance(account("hound.testnet")), 60);
        assert_eq!(challenge.entry_credits, 10);
        assert_eq!(contract.get_balance(account("player.testnet")), 90);
        assert_eq!(
            contract
                .get_active_challenge(account("player.testnet"))
                .unwrap()
                .id,
            challenge.id
        );
    }

    #[test]
    fn settles_a_signed_win_once_and_transfers_the_crown() {
        context("operator.testnet", 1_000);
        let signing_key = verifier_key();
        let mut contract = contract(&signing_key);
        let challenge = open_challenge(&mut contract);
        let certificate = certificate(&signing_key, &challenge, 14_001);
        assert_eq!(
            certificate.message(),
            format!(
                "RIVALGHOST-CERT-v1|0|0|player.testnet|1|3|{}|{}|{}|14001|1002|121001|1",
                FIXED_LOADOUT_HASH,
                "b".repeat(64),
                "c".repeat(64),
            )
        );

        context("relayer.testnet", 1_002);
        let settlement = contract.settle_challenge(certificate.clone());
        assert!(settlement.challenger_won);
        assert_eq!(settlement.challenger_credits, 140);
        assert_eq!(settlement.crown_bounty_credits, 0);
        let crown = contract.get_crown(challenge.crown_id).unwrap();
        assert_eq!(crown.holder, account("player.testnet"));
        assert_eq!(crown.score_to_beat, 14_001);
        assert!(contract
            .get_active_challenge(account("player.testnet"))
            .is_none());

        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            contract.settle_challenge(certificate)
        }))
        .is_err());
    }

    #[test]
    fn settles_a_signed_loss_between_bounty_and_holder() {
        context("operator.testnet", 1_000);
        let signing_key = verifier_key();
        let mut contract = contract(&signing_key);
        let challenge = open_challenge(&mut contract);
        let certificate = certificate(&signing_key, &challenge, 14_000);

        context("relayer.testnet", 1_002);
        let settlement = contract.settle_challenge(certificate);
        assert!(!settlement.challenger_won);
        assert_eq!(settlement.challenger_credits, 90);
        assert_eq!(settlement.holder_credits, 62);
        assert_eq!(settlement.crown_bounty_credits, 48);
    }

    #[test]
    fn returns_the_entry_when_an_unresolved_challenge_expires() {
        context("operator.testnet", 1_000);
        let signing_key = verifier_key();
        let mut contract = contract(&signing_key);
        let challenge = open_challenge(&mut contract);

        context("relayer.testnet", challenge.expires_at_ms);
        assert_eq!(contract.expire_challenge(challenge.id), 10);
        assert_eq!(contract.get_balance(account("player.testnet")), 100);
        assert!(contract
            .get_active_challenge(account("player.testnet"))
            .is_none());
    }
}
