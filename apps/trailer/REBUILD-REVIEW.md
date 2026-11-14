# NEAR AI cut review — 14 November 2026

Current export: `rivalghost-near-ai-58s.mp4`, composition revision `ae9ce44`. The 43.13–48.77 second scene now visualizes the confirmed NEAR AI → MOTH Recovery focus decision. It replaces the final extra gameplay/environment shot; duration remains 58.005 seconds including AAC padding (1,740 video frames at 30 fps, 1920 × 1080).

- Reviewed the encoded 169-frame scene preview before the full export.
- Full-file audio/video decoding passed. No black intervals detected at the configured threshold.
- Inspected the full-timeline contact sheet and all 24 cut-adjacent frames around eight major cuts. Freeze flags are text/diagram holds, including the new AI card; none occur in the gameplay excerpt.
- Encoded audio measured −16.02 LUFS, −3.67 dBTP and 3.90 LU loudness range. Existing licensed soundtrack and end-card attribution are unchanged; no paid generation or narration.
- Trailer TypeScript check passed. The source receipt is frozen in `src/ai-decision.json`. HOUND remains explicitly rule-based; the AI decision is shown as a visualization, not live UI capture.

Sampled frame review and technical measurements do not establish a full perceptual listening pass or guarantee absence of every visual issue. The prior review below documents the original rebuild, not additional checks repeated on this cut.

---

# Rebuild review — 14 November 2026

Final export: RivalGhost revised arcade cut, 58.005 seconds including AAC padding, 1,740 video frames, 30 fps, 1920 × 1080, H.264 yuv420p limited-range BT.709, stereo AAC at 48 kHz.

## Confirmed checks

- Full-file video/audio decode completed without errors.
- Encoded audio: −16.02 LUFS integrated; −3.67 dBTP; 3.90 LU loudness range. These are measurements of the delivered file, not the hypothetical normalized output in FFmpeg's measurement log.
- Black detection found no black intervals at the configured 30 ms duration / 2% pixel threshold.
- Freeze flags correspond to deliberate text, diagram and end-card holds. No freeze flags occurred during the gameplay excerpts.
- Four captured replay clips passed identical-pixel checks after forward/backward seeking.
- Inspected scene stills, a full-timeline contact sheet, and 48 frames immediately before/on/after 16 cuts, including the corrected title wipe and Crown branch reset.
- Trailer TypeScript check and Git whitespace check passed.
- The skill validator passed. Its inspection script was exercised on the old cut, short preview, middle section and full export. A JSON parsing defect exposed by trailing FFmpeg log messages was corrected and regression-checked on the preview.

## Corrections made

Removed the backwards jump between overlapping graze/surge ranges. Used continuous baked gameplay clips. Added capture gutters for native labels. Replaced repeated dark layouts with the game's ivory/coral/mint illustrated style. Corrected economy art/label overlap, MOTH text/coin overlap, HOUND's obscured caption, a blank title frame, the Crown branch's one-frame token reset, and long gameplay-caption sizing. Economy steps use explicit beat-aligned frame boundaries.

The parallel encoder stopped during one export; the delivered file was rendered and encoded separately and completed successfully. No incomplete export is being delivered.

## Boundaries

The soundtrack is a licensed excerpt of “Exit the Premises” by Kevin MacLeod, with level/fade edits and attribution in the end card. No paid generation or narration. The previous synthesized score/effects are not used.

This is a review cut, not user-approved creative. Technical analysis cannot establish musical taste. No human-equivalent full listening pass is claimed. Frame inspection is sampled; full decode checks do not prove the absence of every possible visual defect.

Gameplay is captured from the actual simulation and game renderer using the existing NPC input controller, fan rig and rules version 3. Economy/Crown graphics are labeled illustrations. All credits are NEAR testnet game credits with no cash value. Rewards use a trusted replay verifier. Cosmetic purchases do not improve combat stats.

Source composition revision: 2b5d467. The subsequent QA commit updates review documentation and the reusable inspection helper only.
