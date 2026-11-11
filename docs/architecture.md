# RivalGhost Architecture Decisions

This page indexes decisions that are locked for the hackathon vertical slice. New work should follow them unless an ADR supersedes them.

| Decision | Choice | Why it matters |
| --- | --- | --- |
| Simulation | 60 Hz, integer-only, pure TypeScript package | Ghost playback and verifier results stay reproducible across browser and server. |
| Arena | 360 × 640 portrait logical playfield | Phone play is primary; desktop frames the same arena rather than becoming a different game. |
| Renderer | Phaser for combat, React for product screens | Fast iteration without leaking UI state into deterministic combat. |
| Input | Direction per fixed tick, auto-fire | Mouse, keyboard, and drag reduce to one replayable protocol. |
| Art | Original 2D pixel-art sprite sheets and procedural effects | Strong arcade identity without an asset pipeline or licensing burden that endangers the deadline. |
| Network | Testnet-only game contract with off-chain verifier and relayer | Makes a funded replay loop viable without putting 60 seconds of combat on-chain. |

See `docs/adr/` for the detailed rationale and consequences.
