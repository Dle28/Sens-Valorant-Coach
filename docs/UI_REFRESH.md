# V-AIM interface refresh

The interface now uses one sidebar for navigation, a focused training hero, quieter shortcuts, readable Vietnamese typography, and structured routine cards. The mobile menu has an explicit toggle, Escape dismissal, and focus restoration. History opens from the home summary.

## Implementation

- `aim-lab/src/interface.css` is the application interface layer, loaded after the existing game/HUD stylesheet. Colors, type sizes, form spacing, and responsive layouts live here.
- Be Vietnam Pro 400/600/700/800 is bundled in `src/assets/fonts`, including its SIL Open Font License. The build and Windows package include these fonts; no font network request is required at runtime.
- `app-shell.js` owns the consolidated navigation and home layout. Existing route IDs and training callbacks are retained.
- `playlists.js` presents the existing queues as cards with steps, durations, rests, and start actions. The catalog stays mounted across timer ticks so keyboard focus is preserved.
- Existing generated map artwork is reused for the home hero. It is an illustration, not a new capture of the playable map.

## Validation

- `npm test`: 132 tests passed.
- `scripts/interface-smoke.cjs`: production bundle, 11 routes at 1440/800/390 px; no page horizontal overflow. Checks local font loading, light/dark switching, menu state, Escape focus, history navigation, routine selection, focus across timer ticks, and 150% zoom reflow.
- `scripts/training-expansion-smoke.cjs`: priority order, no-shoot, rest pause, automatic preparation, and saved-queue resume passed. Input/pointer lock is simulated.
- `npm run desktop:smoke`: desktop app loads with WebGL, the interface stylesheet, and bundled fonts through the restricted local protocol.
- Screenshots inspected for desktop/mobile home, map, scenario, and routine views. Generated screenshots are under `aim-lab/output/interface-*.png`.

Run the Electron integration scripts through an environment with `ELECTRON_RUN_AS_NODE` unset. Each test uses an isolated user-data directory and hidden window.

The Windows portable artifact is named `release/ui-final/V-AIM-COACH-UI-Final-Windows-x64.exe`, separate from previous versioned executables.

Final Windows package verification: packaged executable loads WebGL, interface CSS and fonts through gamesen://app. Portable build uses store compression (about 400 MiB).
