//! RivalGhost v3: a finite, bounded testnet game economy. No NEAR custody.
mod abi;
mod storage;
use near_sdk::{env, near, require, AccountId, PanicOnDefault};
use storage::StorageMap;

const DAY: u64 = 86_400_000;
const FLIGHT: u64 = 120_000;
const SESSION: u64 = 43_200_000;
const SUPPLY: u64 = 100_100;

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Run {
    pub id: u64,
    pub kind: u8, // 0 Crown; 1 recovery; 2 courier; 3 commission
    pub slot: u8,
    pub chapter: u8,
    pub seed: u32,
    pub stage: u8,
    pub bonus: bool,
    pub day: u64,
    pub started: u64,
    pub expires: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Pilot {
    pub cr: u64,
    pub salvage: u16,
    pub items: [u8; 3],
    pub equipped: u8, // 3 = none
    pub day: u64,
    pub claims: u8,
    pub nonce: u64,
    pub session_key: [u8; 32],
    pub session_until: u64,
    pub session_epoch: u64,
    pub run: Option<Run>,
    pub last_run: u64,
    pub last_won: bool,
    pub last_hash: [u8; 32],
}
impl Pilot {
    fn new(cr: u64) -> Self {
        Self {
            cr,
            salvage: 0,
            items: [0; 3],
            equipped: 3,
            day: 0,
            claims: 0,
            nonce: 0,
            session_key: [0; 32],
            session_until: 0,
            session_epoch: 0,
            run: None,
            last_run: 0,
            last_won: false,
            last_hash: [0; 32],
        }
    }
    fn inventory(&self) -> u16 {
        self.items.iter().map(|n| *n as u16).sum()
    }
    fn debit(&mut self, n: u64) {
        require!(self.cr >= n, "Insufficient CR");
        self.cr -= n;
    }
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Crown {
    #[borsh(deserialize_with = "read_account")]
    pub holder: AccountId,
    pub score: u64,
    pub bounty: u64,
    pub chapter: u8,
    pub seed: u32,
    pub replay_hash: [u8; 32],
    pub expires: u64,
    #[borsh(deserialize_with = "read_optional_account")]
    pub lock: Option<AccountId>,
    pub defended: bool,
}
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Listing {
    pub id: u64,
    #[borsh(deserialize_with = "read_account")]
    pub seller: AccountId,
    pub item: u8,
    pub price: u64,
}

/// All economic intents use the same small schema. Unused parameters must be zero.
#[near(serializers = [json])]
#[serde(deny_unknown_fields)]
pub struct Intent {
    pub actor: AccountId,
    pub nonce: u64,
    pub epoch: u64,
    pub deadline: u64,
    pub op: u8,
    pub a: u64,
    pub b: u64,
    pub signature: Vec<u8>,
}
#[near(serializers = [borsh])]
pub struct Certificate {
    #[borsh(deserialize_with = "read_account")]
    pub actor: AccountId,
    pub run_id: u64,
    pub kind: u8,
    pub slot: u8,
    pub chapter: u8,
    pub seed: u32,
    pub stage: u8,
    pub bonus: bool,
    pub day: u64,
    pub score: u64,
    pub kills: u32,
    pub rescues: u32,
    pub pulses: u32,
    pub replay_hash: [u8; 32],
    pub final_hash: [u8; 32],
    pub issued: u64,
    pub expires: u64,
    pub key_version: u32,
    pub signature: Vec<u8>,
}

#[near(serializers = [json])]
pub struct World {
    pub version: u8,
    pub total_cr: u64,
    pub reserve: u64,
    pub player_count: u16,
    pub operator: AccountId,
    pub hound: AccountId,
    pub moth: AccountId,
    pub verifier: [u8; 32],
    pub key_version: u32,
    pub paused: bool,
    pub districts: [u8; 10],
    pub focus: u8,
    pub stock: u8,
    pub moth_spent: u64,
    pub hound_spent: u64,
    pub commission_spent: u64,
    pub crowns: Vec<Option<Crown>>,
    pub listings: Vec<Listing>,
}
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Economy {
    #[borsh(deserialize_with = "read_account")]
    operator: AccountId,
    #[borsh(deserialize_with = "read_account")]
    hound: AccountId,
    #[borsh(deserialize_with = "read_account")]
    moth: AccountId,
    verifier: [u8; 32],
    key_version: u32,
    paused: bool,
    reserve: u64,
    player_count: u16,
    next_id: u64,
    pilots: StorageMap<AccountId, Pilot>,
    crowns: Vec<Option<Crown>>,
    listings: Vec<Listing>,
    districts: [u8; 10],
    focus: u8,
    stock: u8,
    day: u64,
    moth_spent: u64,
    hound_spent: u64,
    commission_spent: u64,
    last_attack: u64,
}
fn now() -> u64 {
    env::block_timestamp_ms()
}
fn key(bytes: &[u8]) -> [u8; 32] {
    bytes
        .try_into()
        .unwrap_or_else(|_| env::panic_str("Invalid key"))
}
fn verify(public: &[u8; 32], message: &[u8], signature: &[u8]) {
    let sig: [u8; 64] = signature
        .try_into()
        .unwrap_or_else(|_| env::panic_str("Invalid signature"));
    require!(
        env::ed25519_verify(&sig, message, public),
        "Invalid signature"
    );
}
fn number(out: &mut String, mut n: u64) {
    let mut buf = [0u8; 20];
    let mut at = 20;
    loop {
        at -= 1;
        buf[at] = b'0' + (n % 10) as u8;
        n /= 10;
        if n == 0 {
            break;
        }
    }
    for &b in &buf[at..] {
        out.push(b as char);
    }
}
fn field(out: &mut String, n: u64) {
    out.push('|');
    number(out, n);
}
fn hex(out: &mut String, bytes: &[u8]) {
    const H: &[u8] = b"0123456789abcdef";
    out.push('|');
    for b in bytes {
        out.push(H[(b >> 4) as usize] as char);
        out.push(H[(b & 15) as usize] as char);
    }
}
fn domain(kind: &str, actor: &AccountId) -> String {
    let mut s = String::from(kind);
    s.push_str("|near:testnet|");
    s.push_str(env::current_account_id().as_str());
    s.push('|');
    s.push_str(actor.as_str());
    s
}
impl Intent {
    pub fn message(&self) -> String {
        let mut s = domain("RIVALGHOST-ACTION-v3", &self.actor);
        for n in [
            self.nonce,
            self.epoch,
            self.deadline,
            self.op as u64,
            self.a,
            self.b,
        ] {
            field(&mut s, n);
        }
        s
    }
}
impl Certificate {
    pub fn message(&self) -> String {
        let mut s = domain("RIVALGHOST-RESULT-v3", &self.actor);
        for n in [
            self.run_id,
            self.kind as u64,
            self.slot as u64,
            self.chapter as u64,
            self.seed as u64,
            self.stage as u64,
            self.bonus as u64,
            self.day,
            self.score,
            self.kills as u64,
            self.rescues as u64,
            self.pulses as u64,
        ] {
            field(&mut s, n);
        }
        hex(&mut s, &self.replay_hash);
        hex(&mut s, &self.final_hash);
        for n in [self.issued, self.expires, self.key_version as u64] {
            field(&mut s, n);
        }
        s
    }
}
impl Economy {
    pub fn new(operator: AccountId, hound: AccountId, moth: AccountId, verifier: Vec<u8>) -> Self {
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "Private initialization"
        );
        require!(
            operator != hound && operator != moth && hound != moth,
            "Separate NPC accounts required"
        );
        require!(
            env::current_account_id().as_str().ends_with(".testnet"),
            "Testnet only"
        );
        let mut pilots = StorageMap::new(b"p".to_vec());
        pilots.insert(hound.clone(), Pilot::new(100));
        pilots.insert(moth.clone(), Pilot::new(600));
        Self {
            operator,
            hound,
            moth,
            verifier: key(&verifier),
            key_version: 1,
            paused: false,
            reserve: 99400,
            player_count: 0,
            next_id: 1,
            pilots,
            crowns: vec![None; 3],
            listings: vec![],
            districts: [0; 10],
            focus: 1,
            stock: 0,
            day: now() / DAY,
            moth_spent: 0,
            hound_spent: 0,
            commission_spent: 0,
            last_attack: 0,
        }
    }
    fn admin(&self) {
        require!(
            env::predecessor_account_id() == self.operator,
            "Operator only"
        );
    }
    fn active(&self) {
        require!(!self.paused, "Economy paused");
    }
    fn daily(&mut self) {
        if self.day != now() / DAY {
            self.day = now() / DAY;
            self.moth_spent = 0;
            self.hound_spent = 0;
            self.commission_spent = 0;
        }
    }
    fn pilot(&self, actor: &AccountId) -> Pilot {
        self.pilots
            .get(actor)
            .unwrap_or_else(|| env::panic_str("Claim starter allocation first"))
    }
    fn credit(&mut self, actor: &AccountId, amount: u64) {
        let mut p = self.pilot(actor);
        p.cr += amount;
        self.pilots.insert(actor.clone(), p);
    }
    fn id(&mut self) -> u64 {
        let id = self.next_id;
        self.next_id += 1;
        id
    }
    pub fn get_pilot(&self, actor: AccountId) -> Option<Pilot> {
        self.pilots.get(&actor)
    }
    pub fn get_world(&self) -> World {
        let current = self.day == now() / DAY;
        World {
            version: 3,
            total_cr: SUPPLY,
            reserve: self.reserve,
            player_count: self.player_count,
            operator: self.operator.clone(),
            hound: self.hound.clone(),
            moth: self.moth.clone(),
            verifier: self.verifier,
            key_version: self.key_version,
            paused: self.paused,
            districts: self.districts,
            focus: self.focus,
            stock: self.stock,
            moth_spent: if current { self.moth_spent } else { 0 },
            hound_spent: if current { self.hound_spent } else { 0 },
            commission_spent: if current { self.commission_spent } else { 0 },
            crowns: self.crowns.clone(),
            listings: self.listings.clone(),
        }
    }
    /// Native NEAR transaction authorizes a device session. Empty key revokes it.
    /// Sign-in alone never authorizes a game action or grants a session.
    pub fn set_session(&mut self, public_key: Vec<u8>, until: u64) -> Pilot {
        let actor = env::predecessor_account_id();
        let mut p = self.pilot(&actor);
        require!(
            until == 0 || (until > now() && until <= now() + SESSION),
            "Session expiry invalid"
        );
        p.session_key = if until == 0 {
            [0; 32]
        } else {
            key(&public_key)
        };
        p.session_until = until;
        p.session_epoch += 1;
        self.pilots.insert(actor, p.clone());
        p
    }
    pub fn join(&mut self) -> Pilot {
        self.active();
        let actor = env::predecessor_account_id();
        if let Some(p) = self.pilots.get(&actor) {
            return p;
        }
        require!(
            self.player_count < 1000 && self.reserve >= 100,
            "Starter reserve exhausted"
        );
        self.reserve -= 100;
        self.player_count += 1;
        let p = Pilot::new(100);
        self.pilots.insert(actor, p.clone());
        p
    }
    /// Governor may pause entries, rotate verifier (in-flight certificates reissued), or set bounded NPC focus.
    pub fn configure(&mut self, paused: bool, verifier: Vec<u8>, focus: u8) {
        self.admin();
        require!((1..=2).contains(&focus), "Invalid focus");
        let k = key(&verifier);
        if k != self.verifier {
            self.verifier = k;
            self.key_version += 1;
        }
        self.paused = paused;
        self.focus = focus;
    }
    /// MOTH may feature one free job. No pause, verifier, price or balance authority.
    pub fn set_focus(&mut self, slot: u8) -> u8 {
        self.active();
        require!(env::predecessor_account_id() == self.moth, "MOTH only");
        require!((1..=2).contains(&slot), "Invalid focus");
        self.focus = slot;
        self.focus
    }
    pub fn execute(&mut self, intent: Intent) -> Pilot {
        // Cancellation and unequipping remain available while entries are paused.
        if intent.op != 5 && intent.op != 7 && intent.op != 12 {
            self.active();
        }
        self.daily();
        let actor = &intent.actor;
        require!(
            actor != &self.moth && (actor != &self.hound || intent.op == 10 || intent.op == 11),
            "NPC action restricted"
        );
        let mut p = self.pilot(actor);
        require!(
            intent.deadline >= now() && intent.deadline <= now() + 300_000,
            "Intent expired"
        );
        require!(
            intent.nonce == p.nonce + 1 && intent.epoch == p.session_epoch,
            "Stale intent"
        );
        if env::predecessor_account_id() != *actor {
            require!(p.session_until > now(), "Session expired");
            verify(
                &p.session_key,
                intent.message().as_bytes(),
                &intent.signature,
            );
        }
        if p.day != self.day {
            p.day = self.day;
            p.claims = 0;
        }
        let (a, b) = (intent.a, intent.b);
        match intent.op {
            1 => {
                // start daily job; a=kind, b=chapter
                require!(
                    (1..=3).contains(&a) && b < 10 && actor != &self.hound && actor != &self.moth,
                    "Invalid job"
                );
                require!(
                    p.run.is_none() && p.claims & (1 << a) == 0,
                    "Job unavailable"
                );
                if a == 3 {
                    let mut h = self.pilot(&self.hound);
                    require!(
                        h.cr >= 28 && self.commission_spent + 8 <= 24,
                        "Commission budget exhausted"
                    );
                    h.debit(8);
                    self.pilots.insert(self.hound.clone(), h);
                    self.commission_spent += 8;
                }
                let id = self.id();
                let seed = key(&env::sha256(&id.to_le_bytes()));
                p.run = Some(Run {
                    id,
                    kind: a as u8,
                    slot: 0,
                    chapter: b as u8,
                    seed: u32::from_le_bytes(seed[..4].try_into().unwrap()),
                    stage: stage(self.districts[b as usize]),
                    bonus: a as u8 == self.focus,
                    day: self.day,
                    started: now(),
                    expires: now() + 900_000,
                });
            }
            2 => {
                // sell one salvage to MOTH
                require!(
                    a == self.price()
                        && b == 0
                        && p.salvage > 0
                        && self.stock < 40
                        && actor != &self.moth,
                    "Trade unavailable"
                );
                let price = self.price();
                let mut m = self.pilot(&self.moth);
                require!(
                    m.cr >= price + 40 && self.moth_spent + price <= 80,
                    "MOTH reserve protected"
                );
                p.salvage -= 1;
                p.cr += price;
                self.stock += 1;
                self.moth_spent += price;
                m.debit(price);
                self.pilots.insert(self.moth.clone(), m);
            }
            3 => {
                // buy one salvage from MOTH
                require!(
                    a == self.price() + 2
                        && b == 0
                        && self.stock > 0
                        && p.salvage < 4096
                        && actor != &self.moth,
                    "Trade unavailable"
                );
                let price = self.price() + 2;
                p.debit(price);
                p.salvage += 1;
                self.stock -= 1;
                self.credit(&self.moth.clone(), price);
            }
            4 => {
                // craft
                require!(
                    a < 3 && b == 0 && p.inventory() < 50,
                    "Invalid recipe or inventory full"
                );
                let material = [4, 9, 12][a as usize];
                let fee = [4, 6, 8][a as usize];
                require!(p.salvage >= material, "Insufficient salvage");
                p.salvage -= material;
                p.debit(fee);
                self.reserve += fee;
                p.items[a as usize] += 1;
            }
            5 => {
                // equip, a=3 unequips
                require!(
                    a <= 3 && b == 0 && (a == 3 || p.items[a as usize] > 0),
                    "Item not owned"
                );
                p.equipped = a as u8;
            }
            6 => {
                // list item into escrow
                require!(
                    a < 3 && (1..=200).contains(&b) && p.items[a as usize] > 0,
                    "Invalid listing"
                );
                require!(
                    self.listings.len() < 200
                        && self.listings.iter().filter(|l| &l.seller == actor).count() < 5,
                    "Market capacity reached"
                );
                p.items[a as usize] -= 1;
                if p.items[a as usize] == 0 && p.equipped == a as u8 {
                    p.equipped = 3;
                }
                let id = self.id();
                self.listings.push(Listing {
                    id,
                    seller: actor.clone(),
                    item: a as u8,
                    price: b,
                });
            }
            7 | 8 => {
                // cancel or purchase listing
                require!(b == 0 && p.inventory() < 50, "Inventory full");
                let index = self
                    .listings
                    .iter()
                    .position(|l| l.id == a)
                    .unwrap_or_else(|| env::panic_str("Listing unavailable"));
                let l = self.listings[index].clone();
                if intent.op == 7 {
                    require!(&l.seller == actor, "Seller only");
                } else {
                    require!(&l.seller != actor, "Cannot buy own listing");
                    p.debit(l.price);
                    let fee = (l.price / 20).max(1);
                    self.reserve += fee;
                    self.credit(&l.seller, l.price - fee);
                }
                p.items[l.item as usize] += 1;
                self.listings.swap_remove(index);
            }
            9 => {
                // district repair burn
                require!(
                    a < 10 && b == 0 && p.salvage > 0 && self.districts[a as usize] < 60,
                    "Repair unavailable"
                );
                p.salvage -= 1;
                self.districts[a as usize] += 1;
            }
            10 => {
                // Crown entry
                require!(a < 3 && b == 0 && p.run.is_none(), "Invalid flight");
                let c = self.crowns[a as usize]
                    .as_ref()
                    .unwrap_or_else(|| env::panic_str("Crown unavailable"));
                require!(
                    c.lock.is_none()
                        && c.holder != *actor
                        && c.bounty >= 20
                        && now() + FLIGHT <= c.expires,
                    "Crown unavailable"
                );
                if actor == &self.hound {
                    require!(
                        p.cr >= 30
                            && self.hound_spent + 10 <= 60
                            && (self.last_attack == 0 || now() >= self.last_attack + FLIGHT),
                        "HOUND reserve or cooldown"
                    );
                    self.hound_spent += 10;
                    self.last_attack = now();
                }
                let (chapter, seed) = (c.chapter, c.seed);
                p.debit(10);
                let id = self.id();
                p.run = Some(Run {
                    id,
                    kind: 0,
                    slot: a as u8,
                    chapter,
                    seed,
                    stage: 0,
                    bonus: false,
                    day: self.day,
                    started: now(),
                    expires: now() + FLIGHT,
                });
                self.crowns[a as usize].as_mut().unwrap().lock = Some(actor.clone());
            }
            11 => {
                // one defense per round
                require!(a < 3 && b == 0, "Invalid Crown");
                let c = self.crowns[a as usize]
                    .as_mut()
                    .unwrap_or_else(|| env::panic_str("Crown unavailable"));
                require!(
                    c.holder == *actor
                        && c.lock.is_none()
                        && c.bounty == 0
                        && !c.defended
                        && now() + FLIGHT <= c.expires,
                    "Defense unavailable"
                );
                if actor == &self.hound {
                    require!(p.cr >= 40, "HOUND reserve protected");
                }
                p.debit(20);
                c.bounty = 20;
                c.defended = true;
            }
            12 => {
                let r = p
                    .run
                    .clone()
                    .unwrap_or_else(|| env::panic_str("No active job"));
                require!(
                    r.kind > 0 && a == r.id && b == 0,
                    "Only jobs can be cancelled"
                );
                if r.kind == 3 {
                    self.release_commission(r.day);
                }
                p.run = None;
            }
            _ => env::panic_str("Unknown action"),
        }
        p.nonce = intent.nonce;
        self.pilots.insert(actor.clone(), p.clone());
        p
    }
    fn price(&self) -> u64 {
        (5u64).saturating_sub(self.stock as u64 / 8).max(1)
    }
    /// HOUND funds seeds from its own balance; every seed ghost is verifier-attested.
    pub fn seed_crown(&mut self, certificate: Certificate) {
        self.active();
        let c = certificate;
        require!(
            env::predecessor_account_id() == self.hound
                && c.actor == self.hound
                && c.kind == 4
                && c.slot < 3
                && c.chapter < 10,
            "HOUND seed only"
        );
        require!(
            self.crowns[c.slot as usize].is_none()
                && c.run_id == self.next_id
                && c.stage == 0
                && !c.bonus
                && c.day == now() / DAY,
            "Stale seed"
        );
        self.check_certificate(&c);
        require!(c.expires <= now() + 300_000, "Seed expiry invalid");
        let mut h = self.pilot(&self.hound);
        require!(h.cr >= 40, "HOUND reserve protected");
        h.debit(20);
        self.pilots.insert(self.hound.clone(), h);
        self.id();
        self.crowns[c.slot as usize] = Some(Crown {
            holder: self.hound.clone(),
            score: c.score,
            bounty: 20,
            chapter: c.chapter,
            seed: c.seed,
            replay_hash: c.replay_hash,
            expires: now() + 1_800_000,
            lock: None,
            defended: false,
        });
    }
    pub fn next_sequence(&self) -> u64 {
        self.next_id
    }
    fn check_certificate(&self, c: &Certificate) {
        require!(
            c.key_version == self.key_version
                && c.issued <= now()
                && c.expires > now()
                && c.issued <= c.expires,
            "Certificate expired or wrong key"
        );
        require!(
            c.score <= 100_000_000
                && c.kills <= 100_000
                && c.rescues <= 100_000
                && c.pulses <= 3600,
            "Invalid result"
        );
        verify(&self.verifier, c.message().as_bytes(), &c.signature);
    }
    pub fn settle(&mut self, certificate: Certificate) -> Pilot {
        let c = certificate;
        self.check_certificate(&c);
        self.daily();
        let mut p = self.pilot(&c.actor);
        let r = p
            .run
            .clone()
            .unwrap_or_else(|| env::panic_str("No active run"));
        require!(
            r.expires > now() && c.issued >= r.started && c.expires == r.expires,
            "Flight expired"
        );
        require!(
            c.run_id == r.id
                && c.kind == r.kind
                && c.slot == r.slot
                && c.chapter == r.chapter
                && c.seed == r.seed
                && c.stage == r.stage
                && c.bonus == r.bonus
                && c.day == r.day,
            "Mission mismatch"
        );
        let won;
        if r.kind == 0 {
            let crown = self.crowns[r.slot as usize].as_ref().unwrap();
            require!(crown.lock.as_ref() == Some(&c.actor), "Crown lock mismatch");
            won = c.score > crown.score;
            if won {
                let crown = self.crowns[r.slot as usize].as_mut().unwrap();
                p.cr += 10 + crown.bounty;
                crown.bounty = 0;
                crown.holder = c.actor.clone();
                crown.score = c.score;
                crown.replay_hash = c.replay_hash;
            } else {
                let holder = crown.holder.clone();
                self.credit(&holder, 2);
                self.crowns[r.slot as usize].as_mut().unwrap().bounty += 8;
            }
            self.crowns[r.slot as usize].as_mut().unwrap().lock = None;
        } else {
            // Midnight invalidates outstanding jobs; housekeeping refunds commission escrow.
            require!(r.day == self.day, "Job day ended");
            require!(
                p.day == r.day && p.claims & (1 << r.kind) == 0,
                "Reward already claimed"
            );
            won = match r.kind {
                1 => c.kills >= 12,
                2 => c.rescues >= 2,
                3 => c.score >= 12000 && c.pulses == 0,
                _ => false,
            };
            if won {
                let reward = [0, 4, 6, 2][r.kind as usize] + if r.bonus { 1 } else { 0 };
                require!(p.salvage + reward <= 4096, "Salvage capacity reached");
                p.salvage += reward;
                p.claims |= 1 << r.kind;
                if r.kind == 3 {
                    p.cr += 8;
                }
            } else if r.kind == 3 {
                self.release_commission(r.day);
            }
        }
        p.run = None;
        p.last_run = r.id;
        p.last_won = won;
        p.last_hash = c.replay_hash;
        self.pilots.insert(c.actor, p.clone());
        p
    }
    fn release_commission(&mut self, day: u64) {
        self.credit(&self.hound.clone(), 8);
        if day == self.day {
            self.commission_spent -= 8;
        }
    }
    pub fn expire(&mut self, actor: AccountId) -> Pilot {
        self.daily();
        let mut p = self.pilot(&actor);
        let r = p
            .run
            .clone()
            .unwrap_or_else(|| env::panic_str("No active run"));
        require!(
            now() >= r.expires || (r.kind != 0 && r.day != self.day),
            "Flight still active"
        );
        if r.kind == 0 {
            let c = self.crowns[r.slot as usize].as_ref().unwrap();
            require!(c.lock.as_ref() == Some(&actor), "Crown lock mismatch");
            let holder = c.holder.clone();
            self.credit(&holder, 2);
            let c = self.crowns[r.slot as usize].as_mut().unwrap();
            c.bounty += 8;
            c.lock = None;
        } else if r.kind == 3 {
            self.release_commission(r.day);
        }
        p.run = None;
        p.last_run = r.id;
        p.last_won = false;
        p.last_hash = [0; 32];
        self.pilots.insert(actor, p.clone());
        p
    }
    pub fn close_crown(&mut self, slot: u8) {
        require!(slot < 3, "Invalid Crown");
        let c = self.crowns[slot as usize]
            .clone()
            .unwrap_or_else(|| env::panic_str("Crown unavailable"));
        require!(now() >= c.expires && c.lock.is_none(), "Crown still active");
        self.credit(&c.holder, c.bounty);
        self.crowns[slot as usize] = None;
    }
}
fn stage(n: u8) -> u8 {
    if n >= 60 {
        3
    } else if n >= 30 {
        2
    } else if n >= 10 {
        1
    } else {
        0
    }
}

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
fn read_optional_account<R: near_sdk::borsh::io::Read>(
    reader: &mut R,
) -> Result<Option<AccountId>, near_sdk::borsh::io::Error> {
    use near_sdk::borsh::{
        io::{Error, ErrorKind},
        BorshDeserialize,
    };
    match u8::deserialize_reader(reader)? {
        0 => Ok(None),
        1 => read_account(reader).map(Some),
        _ => Err(Error::new(ErrorKind::InvalidData, "Invalid option")),
    }
}
