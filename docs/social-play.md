# RivalGhost social play

## The playable loop

1. Open **Customize**. Choose a unique 3–16 character username and customize armor color, helmet and insignia. Four palettes × three helmets × three badges give 36 free cosmetic combinations.
2. Finish a v3 story/daily flight. Eligible results auto-post once a social profile is available and Auto-post my scores is enabled (the default, switchable in Customize); without one, the result asks you to choose a username. Existing best-flight publication and challenge sharing are also available. Jobs and commission practice do not auto-post.
3. The service re-simulates the submitted replay, calculates the score and binds it to the authenticated browser pilot. It ignores client-supplied scores and player IDs.
4. The board shows one best score per pilot for the selected chapter, rig and mode. Ties use earliest submission, then stable run ID. Daily runs share today's UTC seed; older rules and wrong seeds are rejected.
5. Choose **Chase ghost** or open a challenge link. The invitation shows the pilot, avatar, target score and exact setup. The opponent's recorded flight appears in the arena with a live score difference. Results report win/tie/loss against that target and offer a rematch.
6. Choose **Add rival** to include another real pilot in **My rivals + me**. The list persists on the server and updates when you reopen or refresh the board.

Challenges are asynchronous recorded flights, not live multiplayer. A challenge can preview any chapter, but it does not award campaign medals or unlock later chapters. Story progression remains earned in story mode. Cosmetics do not change damage, ship hitboxes, or scoring.

## Identity and persistence

Usernames are case-insensitively unique on this service. They are editable and are not NEAR account names. The profile, its chosen appearance, rival links and posted replays persist in the existing SQLite database. Public responses contain only the social ID, username, appearance, score and replay metadata—not private keys or session tokens. The browser caches its display profile and keeps its existing non-exportable signing key.

Only authenticated, same-origin JSON requests can write profiles, scores or rival relationships. Profile creation reuses the signed guest proof and does not provision a chain account. The account status control refreshes when a username is saved.

## Leaderboard scope and costs

This is a **server-shared, off-chain, replay-checked board**. It is not a NEAR settlement, a reward distribution, or proof that a human played the run. Deterministic replay checking alone cannot stop input bots or replay copying. There are no invented opponents, seeded fake scores, follower counts, chat messages or activity claims.

No contract changes, additional transactions, or gas charges are needed. Server CPU/storage and public hosting remain operational costs. The current local gateway runs at `127.0.0.1:8788` with the Vite proxy at `localhost:3000`. The standard `pnpm dev` + `pnpm guest:serve` workflow now serves these screens and endpoints.

**Localhost links only work against this local service.** Friends on other devices need the web app and persistent gateway hosted together under the configured HTTPS origin. The public game and gateway are hosted at https://rivalghost.xyz. Local links still refer only to your local database; they are not public challenge links.

## Bounds and failure behavior

- Top 20 rows per filtered board; one best flight per pilot. At most 2,000 stored replays, 32 MiB of replay text, and 100 shared flights per pilot.
- Shared flights expire after 30 days; daily challenge links become unavailable at the next UTC day boundary. Old data is cleaned on board/challenge/publication requests.
- Publication is limited to three attempts/minute per pilot and 20/minute globally. Existing HTTP body (128 KiB), POST rate and origin limits also apply. Public social reads have global and socket-IP quotas.
- At most 50 rivals per pilot. Following is one-way; it does not send a message or notification.
- Duplicate publication of the same pilot/mode/day/replay returns the same challenge ID. A retry does not create a second score line.
- Service errors leave local gameplay and progress available. An empty board means no scores were submitted for that filter, not a loading animation pretending to be activity.

## API

GET `/api/guest/social/me`, `/board?mode=story&chapter=0&rig=fan&scope=all`, `/ghost?id=...`.

Authenticated POST `/api/guest/social/profile`, `/publish`, `/rival`.

No v3 settlement certificate is issued by these endpoints. The deployed v3 economy has its own certificate/settlement path in the relayer; social publication is not economic settlement.

## Historical validation and remaining work

The counts below describe the original social milestone. See the [current evidence index](evidence/README.md) for the latest independent checks.

Eight social tests cover name conflicts, cosmetic validation, replay-derived scores and identity, deduplication, one-best-per-pilot ranking, rival filtering, wrong seeds/old rules, daily expiry, persistence, and real local HTTP authentication/public reads. Together with existing regressions, 67 TypeScript tests pass. Production builds/type checking pass. Browser QA covers the avatar controls and responsive workshop/board empty state; it does not establish a real multi-device community test.

Public hosting and device-account recovery now exist. Further work includes multi-device community testing, abuse/moderation tooling and a deliberate anti-bot policy. Notifications and live multiplayer are not implemented.
