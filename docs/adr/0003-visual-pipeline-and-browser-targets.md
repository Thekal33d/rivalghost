# ADR 0003: Use original pixel art with a conservative browser target

**Status:** accepted

## Decision

RivalGhost uses original 2D pixel art: 32 px base sprites for the Sentinel, HOUND Ghost, Skitter, Lance, Bulwark, and Warden; 16 px projectile/effect tiles; and a restricted neon navy, violet, cyan, magenta, and gold palette. Sprite sheets are lossless PNGs, rendered with nearest-neighbor scaling. Background glows, motion trails, hit flashes, and stars are procedurally drawn and can be reduced without changing state.

Source artwork stays under version control with its license/author record. Rendered runtime art uses hashed Vite assets and no third-party runtime CDN. Each asset must be original, licensed for the repository, and below its documented byte budget before inclusion.

The supported hackathon matrix is current Chrome and Edge on desktop, Firefox desktop, Safari 17+ on macOS/iOS, and Chrome on Android 12+. The performance target is 60 fps on a 2019-or-newer mainstream laptop and a mid-range Android device; rendering may fall to 30 fps while simulation continues at 60 Hz. A visible reduced-effects control disables trails, additive glows, and screen shake. `prefers-reduced-motion` starts with these effects off.

## Consequences

- The live title and combat can look deliberate and ad-worthy without relying on network-loaded artwork.
- Pixel-scale sizes keep texture memory and first-load time low on phones.
- Visual quality is measured by a playable scene capture on the declared devices, not by mockup fidelity alone.
- New 3D, shader-heavy, or licensed art requires a new review because it risks both performance and submission rights.
