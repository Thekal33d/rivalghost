# Tool selection

Use the smallest set that covers the film. Check current installation instructions and licenses at the primary source before adding a dependency.

| Need | Candidate | Decision |
|---|---|---|
| React multi-shot edit, captions, data-driven variations | [Remotion](https://github.com/remotion-dev/remotion), [official skills](https://github.com/remotion-dev/skills) | Preferred when already present. Its license is not blanket permission for every commercial service. |
| HTML/GSAP composition with a render CLI | [HyperFrames](https://github.com/heygen-com/hyperframes) | Alternative to Remotion, not a required second renderer. |
| Frame-driven browser 3D | [Three.js](https://github.com/mrdoob/three.js) | Use for actual camera/material needs. Freeze time; wait for GPU assets. |
| Modeled/rigged assets and offline lighting | [Blender](https://github.com/blender/blender) | Prefer for substantial 3D asset work; an MCP bridge is optional. |
| SVG/DOM choreography | [GSAP](https://github.com/greensock/GSAP), [Anime.js](https://github.com/juliangarnier/anime) | Seek an explicitly paused timeline. No wall-clock loop inside Remotion. |
| Export, sound mixing, decode and frame QA | [FFmpeg](https://github.com/FFmpeg/FFmpeg) | Use alongside the renderer; preserve frame rate, sample rate and color metadata. |
| Brand/design critique | [Impeccable](https://github.com/pbakaus/impeccable), [Hallmark](https://github.com/Nutlope/hallmark) | Apply relevant composition guidance. These do not render video or replace audio review. |
| Captions from recorded speech | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Useful when timings are missing. Check names and numbers manually. |
| Local speech experiments | [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) | Check model license, hardware and voice consent. A free repository may require expensive compute. |

Fluid solvers, Gaussian splats, multiple 3D engines, frame interpolation and generative node systems are specialist tools. Introduce them for a concrete shot requirement. Fix broken motion at its source before trying interpolation.

Do not copy unverified model-release claims, performance numbers or blanket licensing assertions from promotional reference articles into production documentation.
