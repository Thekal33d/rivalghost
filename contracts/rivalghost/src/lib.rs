mod abi;

mod storage;
use near_sdk::{env, near, require, AccountId, BorshStorageKey, PanicOnDefault};
use storage::StorageMap as LookupMap;

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
#[serde(deny_unknown_fields)]
pub struct CompetitionMission {
    pub revision: u8,
    pub chapter: u8,
    pub rig: Rig,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
#[serde(rename_all = "lowercase")]
pub enum Rig {
    Needle,
    Fan,
    Guard,
}

impl CompetitionMission {
    fn hash(&self, seed: u32) -> String {
        require!(
            self.revision == 1 && self.chapter < 10,
            "Unsupported competitive mission"
        );
        let rig = match self.rig {
            Rig::Needle => "needle",
            Rig::Fan => "fan",
            Rig::Guard => "guard",
        };
        let mut message = String::from("RIVALGHOST-MISSION-v2|");
        decimal(&mut message, self.revision as u64);
        message.push_str("|3600|");
        decimal(&mut message, seed as u64);
        message.push('|');
        decimal(&mut message, self.chapter as u64);
        message.push('|');
        message.push_str(rig);
        let mut hash = String::with_capacity(64);
        const HEX: &[u8; 16] = b"0123456789abcdef";
        for byte in env::sha256(message.as_bytes()) {
            hash.push(HEX[(byte >> 4) as usize] as char);
            hash.push(HEX[(byte & 15) as usize] as char);
        }
        hash
    }
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Crown {
    pub mission: Option<CompetitionMission>,
    pub loadout_hash: String,
    pub active_challenge_id: Option<u64>,
    pub id: u64,
    #[borsh(deserialize_with = "read_account")]
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
    pub mission: Option<CompetitionMission>,
    pub id: u64,
    pub crown_id: u64,
    #[borsh(deserialize_with = "read_account")]
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
#[serde(deny_unknown_fields)]
pub struct CrownSeed {
    #[borsh(deserialize_with = "read_account")]
    pub holder: AccountId,
    pub score_to_beat: u64,
    pub bounty_credits: u64,
    pub seed: u32,
    pub ghost_hash: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
#[serde(deny_unknown_fields)]
pub struct SettlementCertificate {
    #[serde(default)]
    pub contract_id: Option<AccountId>,
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
    #[borsh(deserialize_with = "read_account")]
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

impl RivalGhost {
    pub fn new(operator: AccountId, verifier_public_key: Vec<u8>) -> Self {
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "Contract account must initialize"
        );
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

    pub fn supported_rules_versions(&self) -> Vec<u8> {
        vec![1, 2]
    }

    pub fn verifier_public_key(&self) -> Vec<u8> {
        self.verifier_public_key.clone()
    }

    pub fn operator(&self) -> AccountId {
        self.operator.clone()
    }

    pub fn verifier_key_version(&self) -> u8 {
        self.verifier_key_version
    }

    pub fn has_guest_grant(&self, account_id: AccountId) -> bool {
        self.guest_grants.get(&account_id).unwrap_or(false)
    }

    pub fn get_balance(&self, account_id: AccountId) -> u64 {
        self.balances.get(&account_id).unwrap_or(0)
    }

    pub fn get_crown(&self, crown_id: u64) -> Option<Crown> {
        self.crowns.get(&crown_id)
    }

    pub fn get_challenge(&self, challenge_id: u64) -> Option<Challenge> {
        self.challenges.get(&challenge_id)
    }

    pub fn get_active_challenge(&self, account_id: AccountId) -> Option<Challenge> {
        self.active_challenge_by_player
            .get(&account_id)
            .and_then(|challenge_id| self.challenges.get(&challenge_id))
            .filter(|challenge| !challenge.settled)
    }

    /// The authenticated bootstrap service calls this once after confirming account creation.
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
        self.seed_competition(seed, None)
    }

    pub fn seed_expedition_crown(&mut self, seed: CrownSeed, mission: CompetitionMission) -> Crown {
        self.seed_competition(seed, Some(mission))
    }

    fn seed_competition(&mut self, seed: CrownSeed, mission: Option<CompetitionMission>) -> Crown {
        self.assert_operator();
        let loadout_hash = mission
            .as_ref()
            .map(|m| m.hash(seed.seed))
            .unwrap_or_else(|| FIXED_LOADOUT_HASH.to_string());
        require!(
            seed.bounty_credits >= MINIMUM_BOUNTY_CREDITS,
            "Bounty is below the minimum"
        );
        require!(
            is_sha256_hex(&seed.ghost_hash),
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
            rules_version: if mission.is_some() { 2 } else { 1 },
            mission,
            loadout_hash,
            active_challenge_id: None,
            id: self.next_crown_id,
            holder: seed.holder,
            score_to_beat: seed.score_to_beat,
            bounty_credits: seed.bounty_credits,
            seed: seed.seed,
            ghost_hash: seed.ghost_hash,
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
            self.get_active_challenge(challenger.clone()).is_none(),
            "Player already has a live challenge"
        );
        let mut crown = self
            .crowns
            .get(&crown_id)
            .unwrap_or_else(|| env::panic_str("Crown not found"));
        require!(
            crown.active && now_ms() + CHALLENGE_EXPIRY_MS <= crown.expires_at_ms,
            "Crown is not open for a full Challenge"
        );
        require!(
            crown.holder != challenger,
            "Cannot challenge your own Crown"
        );
        require!(
            crown.active_challenge_id.is_none(),
            "Crown already has a live challenge"
        );
        require!(
            crown.bounty_credits >= MINIMUM_BOUNTY_CREDITS,
            "Winner must fund a defense before challenges reopen"
        );
        let balance = self.get_balance(challenger.clone());
        require!(balance >= CHALLENGE_ENTRY_CREDITS, "Insufficient CR");

        // Keep at most one challenge record per admitted player. Archive receipts off-chain.
        if let Some(previous) = self.active_challenge_by_player.get(&challenger) {
            self.challenges.remove(&previous);
        }
        self.balances
            .insert(challenger.clone(), balance - CHALLENGE_ENTRY_CREDITS);
        let started_at_ms = now_ms();
        let challenge = Challenge {
            mission: crown.mission.clone(),
            id: self.next_challenge_id,
            crown_id,
            challenger: challenger.clone(),
            entry_credits: CHALLENGE_ENTRY_CREDITS,
            started_at_ms,
            expires_at_ms: started_at_ms + CHALLENGE_EXPIRY_MS,
            rules_version: crown.rules_version,
            seed: crown.seed,
            loadout_hash: crown.loadout_hash.clone(),
            settled: false,
        };
        crown.active_challenge_id = Some(challenge.id);
        self.crowns.insert(crown.id, crown);
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
            .unwrap_or_else(|| env::panic_str("Challenge not found"));
        require!(!challenge.settled, "Challenge already settled");
        require!(now < challenge.expires_at_ms, "Challenge has expired");

        let mut crown = self
            .crowns
            .get(&challenge.crown_id)
            .unwrap_or_else(|| env::panic_str("Crown not found"));
        require!(
            crown.active && crown.active_challenge_id == Some(challenge.id),
            "Challenge does not own the Crown lock"
        );
        self.assert_valid_certificate(&certificate, &challenge, &crown, now);
        crown.active_challenge_id = None;

        challenge.settled = true;
        self.challenges.insert(challenge.id, challenge.clone());

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
            .unwrap_or_else(|| env::panic_str("Challenge not found"));
        require!(!challenge.settled, "Challenge already settled");
        require!(
            now_ms() >= challenge.expires_at_ms,
            "Challenge is still live"
        );

        challenge.settled = true;
        self.challenges.insert(challenge.id, challenge.clone());

        let mut crown = self
            .crowns
            .get(&challenge.crown_id)
            .unwrap_or_else(|| env::panic_str("Crown not found"));
        require!(
            crown.active_challenge_id == Some(challenge.id),
            "Challenge does not own the Crown lock"
        );
        crown.active_challenge_id = None;
        self.crowns.insert(crown.id, crown);
        self.credit(challenge.challenger, challenge.entry_credits);
        challenge.entry_credits
    }

    pub fn defend_crown(&mut self, crown_id: u64) -> Crown {
        let holder = env::predecessor_account_id();
        let mut crown = self
            .crowns
            .get(&crown_id)
            .unwrap_or_else(|| env::panic_str("Crown not found"));
        require!(
            crown.active && now_ms() + CHALLENGE_EXPIRY_MS <= crown.expires_at_ms,
            "Crown is not open for a full Challenge"
        );
        require!(crown.holder == holder, "Crown holder only");
        require!(
            crown.active_challenge_id.is_none(),
            "Crown already has a live challenge"
        );
        require!(!crown.defense_used, "Defense already used");
        require!(
            crown.bounty_credits == 0,
            "Only a won Crown can be defended"
        );
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
            .unwrap_or_else(|| env::panic_str("Crown not found"));
        require!(crown.active, "Crown already closed");
        require!(
            crown.active_challenge_id.is_none(),
            "Expire the live challenge first"
        );
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
            certificate.certificate_version
                == if challenge.rules_version == 2 {
                    2
                } else {
                    CERTIFICATE_VERSION
                },
            "Certificate version is unsupported"
        );
        if challenge.rules_version == 2 {
            require!(
                certificate.contract_id.as_ref() == Some(&env::current_account_id()),
                "Certificate deployment does not match"
            );
        } else {
            require!(
                certificate.contract_id.is_none(),
                "Legacy certificate cannot include a deployment"
            );
        }
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
            certificate.loadout_hash == challenge.loadout_hash
                && certificate.loadout_hash == crown.loadout_hash,
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
            certificate.issued_at_ms >= challenge.started_at_ms && certificate.issued_at_ms <= now,
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
            .unwrap_or_else(|_| env::panic_str("Invalid signature length"));
        let public_key: [u8; 32] = self
            .verifier_public_key
            .as_slice()
            .try_into()
            .unwrap_or_else(|_| env::panic_str("Invalid verifier key length"));
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
        let mut message = if self.certificate_version == 2 {
            let mut domain = String::from("RIVALGHOST-CERT-v2|near:testnet|");
            domain.push_str(
                self.contract_id
                    .as_ref()
                    .unwrap_or_else(|| env::panic_str("Missing certificate deployment"))
                    .as_str(),
            );
            domain
        } else {
            String::from("RIVALGHOST-CERT-v1")
        };
        number_field(&mut message, self.challenge_id);
        number_field(&mut message, self.crown_id);
        text_field(&mut message, self.player_id.as_str());
        number_field(&mut message, self.rules_version as u64);
        number_field(&mut message, self.seed as u64);
        text_field(&mut message, &self.loadout_hash);
        text_field(&mut message, &self.replay_hash);
        text_field(&mut message, &self.final_state_hash);
        number_field(&mut message, self.score);
        number_field(&mut message, self.issued_at_ms);
        number_field(&mut message, self.expires_at_ms);
        number_field(&mut message, self.verifier_key_version as u64);
        message
    }
}
fn text_field(output: &mut String, value: &str) {
    output.push('|');
    output.push_str(value);
}
fn number_field(output: &mut String, value: u64) {
    output.push('|');
    decimal(output, value);
}
/// Exact unsigned decimal encoding; covered against Rust formatting and the TS signed fixture.
fn decimal(output: &mut String, mut value: u64) {
    let mut digits = [0u8; 20];
    let mut start = 20;
    loop {
        start -= 1;
        digits[start] = b'0' + (value % 10) as u8;
        value /= 10;
        if value == 0 {
            break;
        }
    }
    for &digit in &digits[start..] {
        output.push(digit as char);
    }
}

// Preserve the SDK's validated string/Borsh layout with a bounded error message.
fn read_account<R: near_sdk::borsh::io::Read>(
    reader: &mut R,
) -> Result<AccountId, near_sdk::borsh::io::Error> {
    use near_sdk::borsh::{
        io::{Error, ErrorKind},
        BorshDeserialize,
    };
    String::deserialize_reader(reader)?
        .parse()
        .map_err(|_| Error::new(ErrorKind::InvalidData, "Invalid stored account"))
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
        builder.current_account_id(account("rivalghost.testnet"));
        builder.block_timestamp(timestamp_ms * 1_000_000);
        testing_env!(builder.build());
    }

    fn verifier_key() -> SigningKey {
        SigningKey::from_bytes(&[7; 32])
    }

    fn contract(signing_key: &SigningKey) -> RivalGhost {
        let predecessor = env::predecessor_account_id();
        let timestamp = now_ms();
        context("rivalghost.testnet", timestamp);
        let game = RivalGhost::new(
            account("operator.testnet"),
            signing_key.verifying_key().to_bytes().to_vec(),
        );
        context(predecessor.as_str(), timestamp);
        game
    }

    #[test]
    fn guest_grant_survives_spent_balance() {
        context("operator.testnet", 1_000);
        let mut game = contract(&verifier_key());
        let player = account("guest.testnet");
        assert!(!game.has_guest_grant(player.clone()));
        game.create_guest(player.clone());
        assert!(game.has_guest_grant(player.clone()));
        game.balances.insert(player.clone(), 0);
        assert!(game.has_guest_grant(player));
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
            certificate_version: if challenge.rules_version == 2 {
                2
            } else {
                CERTIFICATE_VERSION
            },
            contract_id: if challenge.rules_version == 2 {
                Some(env::current_account_id())
            } else {
                None
            },
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
    fn open_expedition(contract: &mut RivalGhost) -> Challenge {
        contract.create_guest(account("hound.testnet"));
        contract.create_guest(account("player.testnet"));
        contract.create_guest(account("other.testnet"));
        let crown = contract.seed_expedition_crown(
            CrownSeed {
                holder: account("hound.testnet"),
                score_to_beat: 14000,
                bounty_credits: 40,
                seed: 313,
                ghost_hash: "a".repeat(64),
            },
            CompetitionMission {
                revision: 1,
                chapter: 0,
                rig: Rig::Fan,
            },
        );
        context("player.testnet", 1001);
        contract.start_challenge(crown.id)
    }

    #[test]
    fn expedition_hash_matches_typescript_and_settles_with_bound_mission() {
        context("operator.testnet", 1000);
        let key = verifier_key();
        let mut game = contract(&key);
        let challenge = open_expedition(&mut game);
        assert_eq!(challenge.rules_version, 2);
        assert_eq!(
            challenge.loadout_hash,
            "24dbd92929fea14445b2481899ddd7ceddd711aef9224024f25093a8ccdfeaad"
        );
        let cert = certificate(&key, &challenge, 14001);
        assert!(cert
            .message()
            .starts_with("RIVALGHOST-CERT-v2|near:testnet|rivalghost.testnet|"));
        context("relayer.testnet", 1002);
        let settled = game.settle_challenge(cert);
        assert!(settled.challenger_won);
        assert_eq!(settled.challenger_credits, 140);
        let crown = game.get_crown(challenge.crown_id).unwrap();
        assert_eq!(crown.mission.unwrap().chapter, 0);
        assert!(crown.active_challenge_id.is_none());
    }

    #[test]
    fn rejects_signed_mismatches_and_modified_certificates_before_mutating_balances() {
        context("operator.testnet", 1000);
        let key = verifier_key();
        let mut game = contract(&key);
        let challenge = open_expedition(&mut game);
        context("relayer.testnet", 1002);
        for case in 0..7 {
            let mut cert = certificate(&key, &challenge, 14001);
            match case {
                0 => cert.loadout_hash = "d".repeat(64),
                1 => cert.seed += 1,
                2 => cert.contract_id = Some(account("another.testnet")),
                3 => cert.player_id = account("other.testnet"),
                4 => cert.rules_version = 1,
                5 => cert.expires_at_ms += 1,
                _ => cert.issued_at_ms = 999,
            }
            cert.signature = key.sign(cert.message().as_bytes()).to_bytes().to_vec();
            assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(
                || game.settle_challenge(cert)
            ))
            .is_err());
            assert_eq!(game.get_balance(account("player.testnet")), 90);
            assert!(!game.get_challenge(challenge.id).unwrap().settled);
        }
        let mut forged = certificate(&key, &challenge, 14001);
        forged.score += 1;
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(
            || game.settle_challenge(forged)
        ))
        .is_err());
        let mut legacy = certificate(&key, &challenge, 14001);
        legacy.certificate_version = 1;
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(
            || game.settle_challenge(legacy)
        ))
        .is_err());
    }

    #[test]
    fn crown_target_and_bounty_remain_locked_during_a_flight() {
        context("operator.testnet", 1000);
        let key = verifier_key();
        let mut game = contract(&key);
        let challenge = open_expedition(&mut game);
        context("other.testnet", 1002);
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(
            || game.start_challenge(challenge.crown_id)
        ))
        .is_err());
        assert_eq!(game.get_balance(account("other.testnet")), 100);
        context("hound.testnet", 1002);
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(
            || game.defend_crown(challenge.crown_id)
        ))
        .is_err());
        context("relayer.testnet", 1002);
        game.settle_challenge(certificate(&key, &challenge, 0));
        context("other.testnet", 1003);
        assert_eq!(
            game.start_challenge(challenge.crown_id).challenger,
            account("other.testnet")
        );
    }

    #[test]
    fn expiry_releases_both_locks_and_late_certificates_cannot_pay() {
        context("operator.testnet", 1000);
        let key = verifier_key();
        let mut game = contract(&key);
        let challenge = open_expedition(&mut game);
        let cert = certificate(&key, &challenge, 14001);
        context("relayer.testnet", challenge.expires_at_ms);
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(
            || game.settle_challenge(cert)
        ))
        .is_err());
        game.expire_challenge(challenge.id);
        assert!(game
            .get_crown(challenge.crown_id)
            .unwrap()
            .active_challenge_id
            .is_none());
        assert!(game
            .get_active_challenge(account("player.testnet"))
            .is_none());
        assert_eq!(game.get_balance(account("player.testnet")), 100);
    }

    #[test]
    fn empty_won_crown_requires_explicit_defense_and_conserves_credits() {
        context("operator.testnet", 1000);
        let key = verifier_key();
        let mut game = contract(&key);
        let challenge = open_expedition(&mut game);
        context("relayer.testnet", 1002);
        game.settle_challenge(certificate(&key, &challenge, 14001));
        context("other.testnet", 1003);
        assert!(
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| game.start_challenge(0)))
                .is_err()
        );
        assert_eq!(game.get_balance(account("other.testnet")), 100);
        context("player.testnet", 1004);
        let defended = game.defend_crown(0);
        assert_eq!(defended.bounty_credits, 20);
        assert_eq!(game.get_balance(account("player.testnet")), 120);
        assert!(
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| game.defend_crown(0)))
                .is_err()
        );
        context("other.testnet", 1005);
        game.start_challenge(0);
        let total = game.get_balance(account("player.testnet"))
            + game.get_balance(account("hound.testnet"))
            + game.get_balance(account("other.testnet"))
            + game.get_crown(0).unwrap().bounty_credits
            + 10;
        assert_eq!(total, 300);
    }

    #[test]
    fn opening_holder_cannot_charge_a_defense_before_a_win() {
        context("operator.testnet", 1000);
        let key = verifier_key();
        let mut game = contract(&key);
        let challenge = open_challenge(&mut game);
        context("relayer.testnet", challenge.expires_at_ms);
        game.expire_challenge(challenge.id);
        context("hound.testnet", challenge.expires_at_ms + 1);
        assert!(
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| game.defend_crown(0)))
                .is_err()
        );
        assert_eq!(game.get_balance(account("hound.testnet")), 60);
    }

    #[test]
    fn settles_the_actual_typescript_verifier_fixture() {
        context("operator.testnet", 1000);
        let key = verifier_key();
        let mut game = contract(&key);
        let challenge = open_expedition(&mut game);
        let fixture: near_sdk::serde_json::Value = near_sdk::serde_json::from_str(include_str!(
            "../../../fixtures/expedition-v2-settlement.json"
        ))
        .unwrap();
        let cert: SettlementCertificate =
            near_sdk::serde_json::from_value(fixture["contractCertificate"].clone()).unwrap();
        let score = fixture["verified"]["score"].as_u64().unwrap();
        assert_eq!(cert.challenge_id, challenge.id);
        context("relayer.testnet", 1002);
        let settlement = game.settle_challenge(cert.clone());
        assert!(settlement.challenger_won);
        assert_eq!(game.get_crown(0).unwrap().score_to_beat, score);
        assert_eq!(settlement.challenger_credits, 140);
        assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(
            || game.settle_challenge(cert)
        ))
        .is_err());
    }

    #[test]
    fn initialization_requires_contract_account() {
        context("attacker.testnet", 1000);
        assert!(std::panic::catch_unwind(|| RivalGhost::new(
            account("attacker.testnet"),
            vec![7; 32]
        ))
        .is_err());
    }

    #[test]
    fn completed_history_is_pruned_when_player_starts_again() {
        context("operator.testnet", 1000);
        let key = verifier_key();
        let mut game = contract(&key);
        let first = open_expedition(&mut game);
        context("relayer.testnet", 1002);
        game.settle_challenge(certificate(&key, &first, 0));
        assert!(game.get_challenge(first.id).unwrap().settled);
        assert!(game
            .get_active_challenge(account("player.testnet"))
            .is_none());
        context("player.testnet", 1003);
        let second = game.start_challenge(first.crown_id);
        assert!(game.get_challenge(first.id).is_none());
        assert_eq!(
            game.get_active_challenge(account("player.testnet"))
                .unwrap()
                .id,
            second.id
        );
        context("relayer.testnet", second.expires_at_ms);
        game.expire_challenge(second.id);
        context("player.testnet", second.expires_at_ms + 1);
        let third = game.start_challenge(first.crown_id);
        assert!(game.get_challenge(second.id).is_none());
        assert!(!game.get_challenge(third.id).unwrap().settled);
    }

    #[test]
    fn defense_requires_time_for_a_complete_flight() {
        context("operator.testnet", 1000);
        let key = verifier_key();
        let mut game = contract(&key);
        let challenge = open_expedition(&mut game);
        context("relayer.testnet", 1002);
        game.settle_challenge(certificate(&key, &challenge, 14001));
        let expires = game.get_crown(0).unwrap().expires_at_ms;
        context("player.testnet", expires - CHALLENGE_EXPIRY_MS + 1);
        assert!(
            std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| game.defend_crown(0)))
                .is_err()
        );
        assert_eq!(game.get_balance(account("player.testnet")), 140);
        context("player.testnet", expires - CHALLENGE_EXPIRY_MS);
        assert_eq!(game.defend_crown(0).bounty_credits, 20);
    }

    #[test]
    fn decimal_encoding_is_exact_at_unsigned_boundaries() {
        for n in [0, 1, 9, 10, 99, 100, 999, 1000, u32::MAX as u64, u64::MAX] {
            let mut encoded = String::new();
            decimal(&mut encoded, n);
            assert_eq!(encoded, n.to_string());
        }
    }
}
