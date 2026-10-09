# Map imagery and rendering refresh

All active menu backgrounds and map previews now use screenshots of the application's Three.js scenes. These are captures of the local training maps, not official VALORANT screenshots or a claim of exact map recreation. Existing generated artwork remains in source history/assets but is excluded from the new Windows package file list.

## Interface

- Four selectable map cards and three capture angles per site; selecting a card updates the actual training configuration.
- Fourteen local images: twelve site captures plus the two aim ranges. `scripts/capture-maps.cjs` rebuilds these from real scene geometry; camera poses and geometry statistics are recorded in `src/assets/maps/capture-manifest.json`.
- Unified slate, muted green and coral colors across navigation, cards and actions.
- Removed fake architecture overlays and nonfunctional free-camera controls from static previews. Removed the generated-concept option from the legacy tactical viewer.

## Renderer

- Separate exposure, sunlight and fog profiles for each site; more neutral interior fill light and paving.
- Range architecture now casts/receives shadows and uses surface maps with less metallic/emissive stone.
- Static architecture is merged by material and spatial bucket. Moving objective parts and animated geometry remain separate. Unit tests verify geometry bounds and dynamic-object preservation.
- Performance / Balanced / High settings control pixel-ratio caps (1 / 1.5 / 2) and shadow-map size (1024 / 2048 / 4096); preference is saved locally.
- Added supports to previously floating interior lamps.

## Verification

- 135 unit tests passed.
- Production UI checks: 11 routes at 390, 800 and 1440 pixels; map and angle selection, image decoding, render preference persistence, menu keyboard behavior, themes, fonts and zoom reflow.
- Four-site simulated gameplay smoke passed. Median frame interval was about 16.7 ms in the short local run; this is not a hardware-wide FPS guarantee.
- Desktop protocol smoke checks WebGL, interface CSS, font loading and decoding all 14 map images.

Portable Windows build: `aim-lab/release/map-refresh/V-AIM-COACH-Map-Refresh-Windows-x64.exe`.
