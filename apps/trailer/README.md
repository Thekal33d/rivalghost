# RivalGhost — revised arcade cut

58 seconds · 1920 × 1080 · 30 fps · 1,740 frames.

`RivalGhost` is the revised composition. `RivalGhost-OldCut` preserves the rejected version for comparison. The new edit uses warm ivory, coral, mint, the game's actual HOUND/MOTH/ship drawings, continuous replay footage and a licensed composed soundtrack. It does not call ElevenLabs or any paid API.

## Reproduce

From the repository root, with workspace dependencies installed and game-data/sim built:

```sh
pnpm --filter @rivalghost/trailer audio:recut
PLAYWRIGHT_MODULE=/absolute/path/to/playwright CHROME_PATH=/absolute/path/to/chrome pnpm --filter @rivalghost/trailer capture
pnpm --filter @rivalghost/trailer typecheck
pnpm --filter @rivalghost/trailer studio
pnpm --filter @rivalghost/trailer render
```

FFmpeg must be on PATH. The render command separates frame rendering from encoding, following an interrupted parallel-encoding export during review. Capture uses the workspace's pinned esbuild 0.28.1 and a local Playwright installation. Supply `--browser-executable=/absolute/path/to/chrome` to the Remotion CLI if its browser is not installed.

The capture command renders four game clips, checks identical pixels after forward/backward seeks, and records their parameters in `public/footage/capture-manifest.json`. These generated media files are ignored by Git. It uses the unchanged simulation, the existing `ace` controller, fan rig and rules version 3. The capture framing adds gutters so native game labels remain visible. It does not alter health, hits, score or rewards.

The audio command downloads the composer's source track, checks its recorded SHA-256 and prepares the excerpt with a fixed gain and fades. Read [MUSIC-CREDITS.md](MUSIC-CREDITS.md) before publishing. Credit is included in the full film's end card. The earlier procedural score/effects are not used in the new composition.

## Edit structure

| Time | Shot |
|---|---|
| 0–3.73 | Ship and ghost chase; flight recorded |
| 3.73–7.50 | HOUND reveal; take his Crown |
| 7.50–9.37 | Color wipe and wordmark |
| 9.37–20.63 | Continuous graze/surge, rescue and boss replay excerpts |
| 20.63–31.87 | Moving salvage → MOTH → craft → market → city illustration |
| 31.87–43.13 | Crown entry, win and loss branches with moving CR token |
| 43.13–48.77 | Live NEAR AI decision visualized: MOTH features Recovery; new matching jobs earn +1 salvage |
| 48.77–52.50 | Finite supply, verification and cosmetic-only purchase proof |
| 52.50–58.00 | Play link, legal line and music attribution |

Major cuts follow the 128 BPM track's measured approximately 30 ms onset phase, with per-cut frame rounding. No narration is included. `src/script.json` belongs to the old timing and must be re-timed before future voice work; the new cut never auto-enables voice files.

## Claim boundaries

- CR are testnet game credits with no cash value. Current supply: 100,100 CR; no mint method.
- Crown entry: 10 CR. A win returns entry plus existing bounty. A loss, tie or expiry allocates 8 CR to the bounty and 2 CR to the holder.
- Recovery job pays 4 salvage before bonuses. MOTH's illustrative 5 CR price changes with stock. The 20 CR marketplace listing is an example, not a completed sale.
- City illustration depicts the existing 30-salvage Streets Relit milestone.
- HOUND is rule based. The separate MOTH segment shows NEAR AI Cloud selecting a job focus that the bounded server validates and settles on NEAR. The frozen source receipt is in `src/ai-decision.json`; this is an illustration of a real confirmed decision, not a live dashboard. The developer-funded worker allows four decisions/day under the existing $1 pilot ceiling. It does not demonstrate player staking or unrestricted AI transactions.
- Reward verification uses a trusted server; no trustless claim.
- Purchases shown are cosmetic. Campaign rig unlocks remain earned through play.
- Economy and Crown scenes are illustrations, not captured settlement receipts.

## Review

Use the local `$motion-production` skill, also versioned at `tools/skills/motion-production`:

```sh
python3 tools/skills/motion-production/scripts/inspect_video.py trailer.mp4 --out /tmp/rivalghost-review --max-seconds 60 --cuts 3.733333,7.5,9.366667,20.633333,31.866667,43.133333,48.766667,52.5
```

Read the detected events; intentional text/end-card holds can trigger freeze flags. Review cut-adjacent frames and sequential gameplay frames, not only the contact sheet. Loudness measurements do not replace listening. See `REBUILD-REVIEW.md` for the current render's checks and limitations.

## Keys and budget

Credentials belong only in ignored `apps/trailer/.env.local`, never in `public/`, source or VITE variables. Paid narration/music remains disabled. A saved key is not permission to spend. Future voice generation needs an authorized budget and new timings for this edit.
