---
name: motion-production
description: Direct, build, revise and verify branded motion videos, game trailers and product films using code-based rendering. Use for finished video work with pacing, music, sound and export requirements; not ordinary website animation.
---

# Motion Production

Turn the brief into an editable film, with evidence from the encoded output. Tools support art direction; adding render engines does not supply it.

## Establish the direction

Inspect the existing edit, source, brand assets and user references before rewriting. For a rejected video, name specific failures with timestamps: unreadable action, repeated layouts, mismatched cuts, frozen footage, clipped labels, harsh sounds. Separate confirmed defects from hypotheses.

Identify the viewer, emotional promise, CTA, duration, aspect ratio, narration choice and audio budget. Infer these from the conversation when possible. Ask only for choices that materially change the film. Continue independent inspection while awaiting answers.

Write a compact campaign brief with:
- Palette, typography, visual reference and explicit patterns to avoid.
- Shot frame ranges, one focal action per shot, readable holds and handoffs.
- Source assets and verified product claims. Distinguish real footage, reenactments and diagrams.
- Music source, license, edit points, effects and narration slots.
- Render dimensions, fps, exact frame count and delivery formats.

For games, show the action clearly before explaining systems. Do not bury combat under headline cards or show invented UI as captured product footage. Keep the game's established character silhouettes and drawing language.

## Select a small toolchain

Read [references/tool-selection.md](references/tool-selection.md) when choosing engines. Prefer the existing renderer. Remotion fits a multi-shot React edit; Three.js or Blender earns its place when the story actually requires 3D. A list of repositories is not an instruction to install them all.

Keep campaign data separate from animation code. Pin render dependencies and record the source revision. Freeze assets used by the film when the application is being edited concurrently.

## Build a film, not a slideshow

Choose music early enough to choreograph around its actual phrase structure. Compute each beat from its absolute time; adding rounded frame intervals causes drift. A declared BPM does not establish the first downbeat—inspect the track.

Use a hierarchy of motion: hero action first, supporting motion later and smaller. Plan anticipation, acceleration, contact and settle. Hold text still while it is read. Keep cuts simple unless a transition tells the story or carries an object into the next scene. Do not add constant camera shake, flashes, chromatic aberration or particles to conceal weak composition.

Render a short representative passage before an expensive full export. Inspect it and revise obvious failures. Show it to the user when creative direction is uncertain or the prior version was rejected. This is a creative checkpoint, not an automatic permission requirement for already-authorized work.

## Deterministic rendering contract

- Every frame is a function of the requested frame/time, including particles, noise and camera movement.
- No wall-clock animation, uncontrolled random values or reliance on frames arriving in order.
- Wait for fonts, images, video frames and canvas work before capture.
- A simulation may be precomputed, but each snapshot must have its own correct event history. Do not pass a mutable future event list into an earlier snapshot.
- Reset canvas state before drawing. Check rendering the same frame after forward and backward seeks.
- Bake stable gameplay clips when shared simulation/React capture makes the final edit fragile. Use actual simulation inputs; never invent a victory or a transaction.
- Render frames 0 through N−1. For loops, inspect the seam; for films, leave a deliberate final hold and audio tail.

## Audio production

Read [references/audio-and-qa.md](references/audio-and-qa.md). Use supplied or properly licensed music, or generation within an explicitly authorized budget. Never treat an available API key as spending approval. Keep keys in ignored local environment files and never expose them in media, logs or committed code.

Keep music, voice and effects separate until the mix. Fewer meaningful effects usually work better than a sound on every move. Effects must match contact/cut timing. Preserve transient headroom; avoid a limiter or repeated normalization as a substitute for balancing stems.

Do not call oscillator sketches finished music simply because they meet a loudness target. If listening is unavailable, state that limitation and provide a playable review sample. Measurements establish technical behavior, not musical taste.

## Inspect the delivery, not just the code

Run `scripts/inspect_video.py FILE --out DIR --max-seconds 60 --cuts 3.75,7.5` as a technical starting point. The script reports streams, full decode failures, loudness, possible black/frozen stretches, a contact sheet and frames on both sides of each cut. Add `--require-audio` when the deliverable must contain sound. Flags require interpretation; intentional holds are not automatically defects.

Review rendered stills at phone size and sequential frames at transitions. Check text overlap, cropping, object continuity, gameplay visibility and truthful claims. A regular contact sheet alone cannot detect single-frame glitches. Compare repeated renders of difficult frames when state or caching is involved.

Inspect the entire encoded timeline and listen to the final mix when the environment supports it. Report precisely which checks happened and what remains unreviewed. Do not say “glitch-free” or “sounds great” based only on ffprobe or still images.

Deliver the playable MP4, editable source, credits, campaign brief and concise QA notes. Label previews as previews. Keep full-resolution exports, temporary frames and previous revisions distinct. Commit only owned changes in a shared repository.
