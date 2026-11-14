# RivalGhost — Steal Your Ghost Back

**58 seconds · 1920 × 1080 · 30 fps · 92 spoken words**

The promise: a one-minute flight becomes a rivalry, a collection, and a city worth coming back to. Sell the feeling first. Show the economy as the consequence of playing.

| Time | Picture and headline | Voice |
|---|---|---|
| 00:00–00:04.5 | Open in motion. A gold Crown snaps away from your mint ship. Freeze into a violet replay silhouette; HOUND enters on the opposite side. **CROWN TAKEN. GHOST LEFT BEHIND.** This is a stylized rivalry shot, not a new combat mechanic. | “They took your Crown. They left you a ghost.” |
| 00:04.5–00:07.5 | Bass impact. Original wordmark fills the frame. **RIVALGHOST / STEAL YOUR GHOST BACK.** Let the music speak. | — |
| 00:07.5–00:18 | Actual simulation footage: graze into surge, chain, rescue, boss damage and defeat. Match cuts across different chapter environments. Finish on a clean challenge invitation graphic. **60 SECONDS. ONE BETTER RUN.** | “Sixty seconds. Graze danger. Trigger your surge. Break the boss. Dare a friend to beat your ghost.” |
| 00:18–00:32 | Keep gameplay moving. Advance through large, readable actions rather than six tiny tiles. **RECOVER → TRADE → CRAFT → SELL → REBUILD.** Salvage appears as material; only CR uses the gold credit counter. Finish with the district lighting up. | “Every flight fuels the next. Recover salvage. Trade with MOTH. Craft your look. Sell to other pilots. Bring the city back to life.” |
| 00:32–00:42.1 | HOUND portrait interrupts the rhythm. **10 CR ENTRY.** Two clearly labelled outcome diagrams: **WIN: ENTRY BACK + BOUNTY** and **MISS: +8 BOUNTY / +2 HOLDER**. Example amounts never pretend to be transaction receipts. | “Challenge HOUND. Ten credits in. Beat the ghost. Take the bounty. Miss, and the next challenge gets bigger.” |
| 00:42.1–00:44.5 | Punch into HOUND’s mask; gold eyes hold the camera. Brief distorted radio interruption. | HOUND: “I want my Crown back.” |
| 00:44.5–00:53 | Proof lands in three strong beats over footage: **100,100 CR · FIXED SUPPLY**, **REPLAY-VERIFIED REWARDS**, **STYLE, NOT FIREPOWER**. NEAR testnet appears as provenance, not the opening hook. | “A real game economy. Fixed supply. Replay-verified rewards. Your style changes. Your firepower doesn’t.” |
| 00:53–00:58 | Music cuts. Mint ship crosses the ghost’s trail. Logo resolves with a final sonic stamp. Hold the URL long enough to read: **RIVALGHOST.XYZ / PLAY FREE.** | “Your ghost. Their problem. Play RivalGhost.” |

## Sound direction

128 BPM. Minor-key electro/synthwave with punchy drums, a short four-note signature, gritty bass and bright arcade accents. Intro is sparse and tense; title gets the first full impact; combat runs on tight percussion; economy adds syncopated plucks; HOUND drops into heavier half-time; proof resolves upward; music clears at 53 seconds for the final line. No vocals in the backing track. Avoid an unbroken wall of risers.

Distinct sound vocabulary: tape rewind for the ghost, short energy crack for surge, metallic tick for CR moving, warmer material click for salvage, low radio grit for HOUND, one decisive brand hit at the end. Duck the score around voice, keep the voice intelligible, and never let a coin effect imply real-world earnings.

**Current authorization:** no paid generation. The first render uses an original locally synthesized score and effects, with readable titles. ElevenLabs narration is prepared but will not be generated until separately authorized. The cool, confident voice direction is selected.

## Keep the claims honest

- CR has no cash value. Keep **NEAR TESTNET · GAME CREDITS · NO CASH VALUE** readable during economy/proof sections and the end card.
- Recovery jobs award 4 salvage before any focus bonus. MOTH’s price varies with stock. Avoid hardcoding 5 CR as its permanent price.
- Fixed supply is **100,100**, not 100,000. CR fees move to the reserve; do not describe them as burned credits.
- The 60 CR/day policy is HOUND’s **attack** cap. Automatic counterattacks are currently disabled, so the trailer does not depict them as live activity.
- HOUND is rule based; no AI claim. Rewards use a trusted server replay verifier; no “trustless” claim.
- No simulated transaction receipt, fake player population, fabricated market sale or live-success badge.
- Campaign progress stays on-device. Account recovery restores account assets, not campaign medals.

## ElevenLabs setup

Private local file: `/Users/0t41k1/Documents/rivalghost/apps/trailer/.env.local`

```dotenv
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=
```

The file is excluded from Git. Keep the key out of chat, video assets and frontend variables. An optional voice ID can be chosen after account preflight; leaving it blank does not trigger generation. No paid requests have been approved.
