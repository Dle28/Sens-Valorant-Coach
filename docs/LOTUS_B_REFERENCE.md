# Lotus B training sector

Reviewed 2026-09-13. `garden` remains the persisted site ID. The registry now selects `garden/sites/b`; the previous `main` scene remains available in source. No Riot models, textures, or reference images are shipped by this change.

## References and limits

- [Riot Maps gallery — Lotus](https://playvalorant.com/en-us/maps/#lotus): official labelled overview inspected for B Main, A Link, B Upper and C Link relationships. The gallery overview is schematic and does not provide surveyed dimensions.
- [Riot Lotus environment development](https://playvalorant.com/en-us/news/dev/lotus-unearthing-valorant-s-lost-city/): B-site paintover inspected for the circular recessed stairwell, central cover, carved stone, oculus, purple rim, cyan panels and overhead foliage. This is concept art, not proof of current collision geometry.
- [Riot patch 8.0](https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-8-0/): B-site AFTER screenshot inspected; additional space and boxes near the entry inform the asymmetric front pocket. A Link's breakable-door area was widened. No B orb is placed.

This is an original approximation for aim/entry/retake practice, not a 1:1 replica or a verified latest game build. Current public sources were checked, but dimensions, exact door offsets, pit depth, stair count and connector lengths are authored training values. The local coordinate system faces from Main into site; it is not geographic north. Link routes end within this sector. A Link is represented in its already-open state. Destructible walls, rotating doors elsewhere on Lotus, utility and full-map rotations are outside this sector.

## Implementation

The dedicated layout owns collision cover, room footprint, plant area, objective anchor, spawns and a six-tread recessed pit. Rendering and terrain height consume the same pit radius/depth/steps. Site expansion scales its horizontal measurements with the existing 1.35 factor. Runtime AABBs use actual center + half-height, including the central plinth rooted below floor level. Authored-site bot nodes use local terrain height, including the pit and 0.9 m B Upper landing. Three entry routes and B Upper connect to the objective; the large generic side platforms and repeated entry barriers are not added to this authored site. Attack begins in B Main; retake begins facing inward from C Link. Both replace the generic objective-mode spawn which would intersect this sector's boundary.

Visual details above player reach include the perforated ceiling, oculus rim, reliefs and foliage. The scene uses existing procedural mineral materials and original mesh geometry. Reference JPEGs used during review are temporary QA inputs under ignored output, never bundled assets.

## Validation and delivery

Integrated into the user's saved checkout on 2026-09-13 after reviewing the per-file differences against the current checkout. Only the Lotus B implementation and integration files were copied; pre-existing unrelated work was retained. A before-copy backup and SHA-256 manifest are in the task worktree's ignored `aim-lab/output/lotus-integration-before` and `lotus-integration.json`.

- `npm test`: 144/144 passing in the saved checkout.
- `npm run build`: passing in the saved checkout.
- `electron scripts/lotus-b-smoke.cjs`: passing for retake, attack, site defense and movement reading in the saved checkout. Checks simulated movement, jumping, firing, crouching, equipment switching and saved telemetry; it does not measure real mouse input or prove a complete successful plant/defuse round.
- `electron scripts/lotus-b-preview.cjs`: three 1600×900 local render views visually inspected. Updated the garden menu thumbnails; final overview renders 38,004 triangles / 143 calls in this capture harness. These are render counters, not a hardware performance benchmark.

The scene is still a simplified procedural reconstruction: architectural reliefs and materials are much less detailed than Riot's shipped art, and exact competitive sightlines and utility lineups are not certified. Existing portable executables were not rebuilt or released; launch the updated project to use this version.
