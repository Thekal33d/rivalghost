# RivalGhost — Steal Your Ghost Back

58 seconds, 1920 × 1080, 30fps. Editable Remotion composition using the actual game simulation, renderer and brand art. No private account information or credentials enter the video bundle.

## Commands

From the repository root:

```sh
pnpm --filter @rivalghost/trailer audio:score # Python 3 + NumPy; creates original local score/effects
pnpm --filter @rivalghost/trailer studio
pnpm --filter @rivalghost/trailer typecheck
pnpm --filter @rivalghost/trailer render
```

Audio credentials belong only in `apps/trailer/.env.local`. Save `ELEVENLABS_API_KEY=...` there. It is ignored by Git. Never put the key in `public/`, `src/`, a VITE_ variable or a browser form.

`src/script.json` holds the timed voice script. Audio generation is separate from rendering; renders never call paid APIs. Use preflight first, then generate only after an explicit credit budget is agreed. Each segment is cached and measured. An overlong take must be revised rather than extending the 58-second cut.

## Claim boundaries

- Gameplay comes from the unchanged game simulation and canvas renderer. The trailer camera/HUD and economy diagrams are editorial graphics, not invented transaction receipts.
- CR are testnet game credits with no cash value. The 100,100 CR supply and 10/8/2 Crown rules come from `contracts/economy/src/lib.rs`.
- Workshop recovery reward is 4 salvage, plus a possible focus bonus. MOTH prices change with stock; do not present 5 CR as a universal rate.
- HOUND is rule based. Its attack cap is 60 CR per UTC day; that is not a cap on all NPC expenditure. Live automatic counterattacks are currently off, so do not depict them as live activity.
- Replay rewards depend on a trusted server verifier. No “trustless” claim.
- Cosmetic purchases do not increase combat stats. Campaign rig unlocks remain earned through play.
- UI diagrams use example balances and are labelled illustrative. No staged receipt is presented as a real settlement.
- The end card invites free play at rivalghost.xyz. Sign-in language stays plain.

## Assets and provenance

The score and effects are synthesized by `tools/score.py` from oscillators and seeded noise, with no external samples. Audio outputs are ignored by Git and recreated before preview/render. Barlow Condensed and Chakra Petch are bundled with their SIL Open Font Licenses under `public/fonts`. Character paths, ships, scenery and gameplay are imported from the game. The trailer uses the built-in input-only NPC controller to generate valid, reproducible flight states; it never alters health, scores, collisions or rewards.

The currently approved version has music and effects only. ElevenLabs paid generation remains disabled unless a separate explicit credit cap is supplied. A saved API key is not treated as permission to spend.

## Preview validation — 2026-11-14

- Remotion typecheck passed; six representative 1080p frames were visually inspected, including combat, economy, Crown, proof and end card.
- Full render: 1,740 frames at 30fps, exactly 58 seconds. Original score and effects are included; no ElevenLabs calls were made.
- All 163 game tests passed in an isolated copy of committed game source using the updated dependency installation. Concurrent unfinished onboarding edits in the shared workspace were left untouched and excluded from this milestone.
- HOUND’s speech-bubble fix is separately deployed as `fc5c79a`; public browser checks passed from 320px to 1920px. The trailer adds no code to the public game bundle.
