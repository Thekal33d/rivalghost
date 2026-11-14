# Flight audio and mobile launch

Sound defaults on and starts from a player gesture. The speaker toggle persists the preference on this device and is available in the mobile flight HUD and pause menu. A shared AudioContext avoids the former second-tap requirement. After the first interaction, a quieter menu loop plays across the hangar, map, pilot, workshop and results. Navigation keeps its position. Starting a flight switches to the combat track; leaving returns to menu music. Browsers require that first interaction before audible playback.

Music uses a 62-second, normalized, faded excerpt of Kevin MacLeod’s “Exit the Premises”, licensed CC BY 4.0. Attribution appears in the Flight Manual and `apps/web/public/audio/CREDITS.txt`. The compressed download is approximately 1 MB, fetched after interaction; music failure leaves the synthesized effects available. No paid generation or inference is used.

Buttons have short tap feedback; navigation, ship/mode selection, close controls and locked choices have distinct cues. Disabled controls and mute controls do not emit misleading confirmation sounds. Menu music and effects stop in the background.

Combat cues cover firing, enemy hits and kills, hull damage, grazes, shield impacts, rescue/upgrade pickups, Pulse, Surge, boss contact and phase changes. Envelopes, event throttling, bounded voices and a master compressor keep rapid events from piling up. Effects observe the simulation; they do not change replay inputs or deterministic rules. Pause/background/exit stop the transport and effects. Resume keeps the music’s offset. Mute silences the mix while flight timing continues.

Phones have a fixed bottom launch bar on both the Flight Deck and Signal Map, with safe-area padding and room at the end of page content. Tutorial/dialog overlays remain above the dock. Desktop placement remains in the loadout panel. On phones the mission leads, HOUND is a compact rival briefing, ships sit side by side, and the HUD fits a single row. Full flight instructions remain in the Flight Manual.

## Verification

Frontend TypeScript, production build and 10 progression tests pass. `tools/check-flight-audio.cjs` uses Playwright/Chromium against a running production preview (default port 4192). Supply `PLAYWRIGHT_MODULE` if Playwright is installed outside the workspace; `CHECK_URL` overrides the preview origin. The script mocks API requests and does not publish scores or sign transactions.

Checks: launch visibility at 320×568, 390×844, 430×932 and touch landscape 844×390; map launch at 320px; real audio samples after Fly without another playfield tap; mute/unmute; pause/resume at the saved music position; background silence; persisted mute; desktop layout; effects with the music request blocked; browser errors. Device emulation does not replace a physical iPhone/Android listening pass.

Menu regression checks also measure audio after the first interaction, selection cue creation, uninterrupted music across navigation, the return to menu music after flight exit, and menu background/resume behavior.
