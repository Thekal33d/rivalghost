export const RULES_VERSION = 1;
export const TICKS_PER_SECOND = 60;
export const RUN_DURATION_SECONDS = 60;
export const RUN_TICKS = TICKS_PER_SECOND * RUN_DURATION_SECONDS;

export const DIRECTION_CODES = {
  idle: 0,
  up: 1,
  upRight: 2,
  right: 3,
  downRight: 4,
  down: 5,
  downLeft: 6,
  left: 7,
  upLeft: 8,
} as const;

export const RIVAL_GHOST_RULES_V1 = {
  arena: { width: 360, height: 640 },
  combat: {
    playerHealth: 100,
    playerMoveUnitsPerTick: 3,
    autoFireEveryTicks: 6,
    surgeTicks: 180,
    surgeActivationsPerRun: 1,
    grazesToSurge: 4,
  },
  economy: {
    guestGrantCredits: 100,
    challengeEntryCredits: 10,
    defenseCredits: 20,
    failedChallengeToBountyCredits: 8,
    failedChallengeToHolderCredits: 2,
    challengeExpirySeconds: 120,
    roundExpirySeconds: 1800,
  },
} as const;
