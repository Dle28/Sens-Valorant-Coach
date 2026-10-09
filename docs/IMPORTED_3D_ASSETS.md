# Imported 3D assets — 2026-09-10

## Delivered
- Kenney Blaster Kit 2.1: three optional GLB weapon appearances (A, R, N), one supply crate with authored open/close animation.
- Select **Ngoại hình súng** in Combat Sites, or **Ngoại hình 3D** in weapon settings. Original Tactical appearance remains available.
- Weapon presentation follows walking, firing recoil, equipment transitions and V-key inspection. Weapon profile/damage remains independent of cosmetic selection.
- Crates sit on existing cover, not in walkable lanes. Animated with Three.js AnimationMixer. Late asynchronous model loads are discarded after map rebuilds.
- Models and texture data are embedded in source JS and bundled offline. Desktop CSP allows local/blob/data loading only; no remote asset server is required.

## Sources and licensing
- Downloaded: https://kenney.nl/assets/blaster-kit (CC0). Original license included in src/models/LICENSE-Kenney.txt and desktop notices.
- Also researched: https://quaternius.com/packs/ultimategun.html (40 gun models, CC0). Not imported in this pass.
- Sketchfab Vandal Valorant by hakbux265: CC Attribution 4.0, 5.2k triangles. The signed-in Sketchfab page was verified on 2026-09-10 and the GLB download was requested. Runtime support is prepared as `src/assets/models/vandal-valorant.glb`.
- Sketchfab SAS CS2 Agent Model Blue by gettan: CC Attribution 4.0, 16.5k triangles. Runtime support is prepared as `src/assets/models/sas-cs2-blue.glb`. The page credits Valve for the original game asset.

The imported Kenney models have a stylized blaster aesthetic. They are optional appearances, not a realistic Vandal replacement. No ammunition/reload mechanic was added by this visual pass.

## Sketchfab asset installation
- In the Desktop app, use **Nạp Vandal GLB** or **Nạp SAS agent GLB** under the weapon card. It validates the GLB magic bytes and a 100 MiB size limit, then stores a private local copy. The app reloads 3D after a successful import.
- A development build can instead save the downloaded files as `aim-lab/src/assets/models/vandal-valorant.glb` and `aim-lab/src/assets/models/sas-cs2-blue.glb`.
- `npm run build` copies only these fixed filenames into the offline package. The custom Electron protocol permits only those two paths and serves them as `model/gltf-binary`; a locally imported file takes precedence over the bundled copy.
- With both files present, **Vandal · Sketchfab CC BY** becomes a weapon appearance and SAS meshes replace the primitive enemy presentation while preserving the existing hit regions and score logic. A missing file falls back to the built-in presentation.
- Keep the attribution in this document and `desktop/THIRD_PARTY_NOTICES.txt` with every redistributed build. The CC label does not resolve third-party game-IP rights; confirm your intended distribution is permitted.

## Verification
- models-smoke.cjs: all three GLBs and textures load; recoil decays; imported weapons hide for knife and restore on equip; crate lid rotates under its animation clip; screenshots exported.
- graphics-smoke.cjs accepts MODEL_SKIN for a complete combat run with imported appearance.
- npm test and npm run build.
