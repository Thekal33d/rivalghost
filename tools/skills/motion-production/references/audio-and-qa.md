# Audio and encoded-output review

## Source and edit

Record title, creator, source URL, license URL, required credit, changes made and download hash. Document rights before distribution. Include credit inside the film when the license or distribution context calls for it, plus a copy-paste credit in delivery notes.

Find the actual phrase and first downbeat. Pin visual cuts and effects to a shared cue sheet using seconds or sample positions. Keep a short fade at audio edits to avoid discontinuities, except a deliberately designed contact transient. Leave room for voice; do not make a generic drum loop compete with every game sound.

Use separate stems. Check mono compatibility, low-frequency dominance and small-speaker playback. A true-peak measurement does not diagnose harshness, wrong genre, a boring groove or too many effects.

## Mastering

A reasonable web starting point is roughly −16 to −14 LUFS integrated, with encoded true peak at or below −1 dBTP. These are working targets, not platform rules or artistic guarantees. Adjust for the content and requested outlet.

Measure the unmastered mix first. Prefer gain adjustment when it meets the target without excessive peaks. If using FFmpeg loudnorm, use its two-pass measured values and inspect whether it selected linear or dynamic processing. Do not repeatedly normalize already-mastered audio. Measure decoded AAC; encoding can raise peaks.

Reference: [FFmpeg loudnorm](https://ffmpeg.org/ffmpeg-filters.html#loudnorm).

## Visual QA

Inspect each shot plus frames at cut−1, cut and cut+1; add nearby frames for moving handoffs. Check reading time at viewing size. Inspect sequential frames across motion extrema and any reported glitch. Repeated rendering after random seeks detects hidden state; hashes compare determinism, not aesthetics.

Look for unintended freezes, font fallbacks, off-screen labels, one-frame blanks, inconsistent positions, wrong environments and overlays concealing the subject. Black/freeze detection flags need interpretation: end cards and deliberate pauses are legitimate.

For simulations, record seed, rig, rules version and inputs/controller. State whether capture is a bot replay, player session or illustration. Keep diagrams visually distinct from transaction receipts.

## Delivery notes

Record renderer version, source revision, duration, frame count/rate, resolution, audio format, measured loudness/peak, shots inspected and limitations. Do not claim a listening pass when only waveform analysis was available. Label previews without turning routine revisions into permission gates.
