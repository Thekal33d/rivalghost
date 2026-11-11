use near_sdk::{near, PanicOnDefault};

/// Minimal state shell. Economic rules arrive only after the deterministic
/// simulator and replay certificate formats are agreed and tested.
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct RivalGhost {
    rules_version: u8,
}

#[near]
impl RivalGhost {
    #[init]
    pub fn new() -> Self {
        Self { rules_version: 1 }
    }

    pub fn rules_version(&self) -> u8 {
        self.rules_version
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initializes_with_the_first_rules_version() {
        assert_eq!(RivalGhost::new().rules_version(), 1);
    }
}
