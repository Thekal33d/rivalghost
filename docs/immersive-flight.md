# RivalGhost — immersive flight update

The game now fills the browser during a flight. Desktop play flies left-to-right across a landscape arena; phones fit portrait play to their viewport. Ship proportions and combat geometry remain consistent, with screen-relative movement controls. The pause screen explains the active chapter's twist.

Boss hits now show actual damage numbers, impact sparks and a short armor flash. The HUD shows exact remaining HP, percentage and phase. Damaged armor gains visible cracks; phase two announces faster attacks.

## Ten chapters, ten encounter twists

| Chapter | Environment | Play differently |
| --- | --- | --- |
| Dead Air | Relay buildings and transmission structures | Every fifth patrol kill drops extra power; rescues restore Pulse. |
| Glass Mile | Faceted glass corridor and prism blockade | Paired laser gates alternate between inner and outer lanes. |
| Crownline | Rotating turbines and the ghost archive | Echo interceptors arrive on a previously recorded player position. |
| Black Tide | Flooded docks, open water and tidal basin | Reversing currents push your ship while crossfire narrows the route. |
| Switchyard | Freight tracks and a branching junction | Warned crosswise freight beams demand movement forward or back. |
| Mirror Lake | Reflections, ripples and twin structures | Mirrored escorts join the boss's sweeping fire. |
| Ashfall | Burnt towers and drifting ash fronts | Marked strikes target your position, giving you time to move. |
| Null Choir | Receiver towers and signal rings | Three grazes trigger Surge, which immediately recharges Pulse. |
| Last Light | Crown machinery and outer battlements | Boss edge lanes lock; phase two adds crossing beams. |
| Ghost Dawn | Night sky, memory storm and rising dawn | Tides, freight beams and strikes return in sequence; victory reveals dawn. |

Routes change at 20 and 40 seconds, introducing larger landmarks and a boss district. Colored scenery stays behind the collision objects. Reduced-motion settings retain readable combat cues without moving weather, shake or impact flashing.

The new local rules are v3. Old medals and unlocks remain; old ghosts are retained separately, because changed mechanics make their scores unsuitable for the new leaderboard slots. The NEAR competition protocol remains v2 and cannot accept these local v3 results. No new contract calls or deployment costs were added.

Validation: 59 TypeScript tests pass; production build and type checking pass. All 30 new chapter/rig combinations clear through normal simulated inputs and reproduce through replay. Browser checks covered desktop/phone-sized layouts and the boss health transition. Actual human difficulty, sound and physical-phone performance still need playtesting.
