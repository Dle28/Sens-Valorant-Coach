# Vandal visual reconstruction

The default Vandal view model now uses locally authored Three.js geometry in `aim-lab/src/models/authored-vandal.js`. Select Vandal with the original Tactical appearance to use it. It also provides the Vandal appearance when an optional Sketchfab GLB is absent.

Visual reference inspected: https://cdn.thespike.gg/JLMIE/Vandal_1690303554719.jpg (via https://www.thespike.gg/valorant/tips/valorant-basics-guide). The reference image is not bundled into the application. This is an approximate visual reconstruction, not the original Riot or Sketchfab mesh.

Features: bevelled receiver, angular stock with inset panel and rubber ribs, curved magazine, trigger guard, separate charging handle, front/rear sights, barrel collars, vent recesses and side fasteners. Uses metal/polymer materials with distinct roughness. Existing equip, walk, recoil and inspection animation applies, plus charging-handle movement on firing.

Validation: models-smoke renders the FPS view and standalone model; checks charging-handle recovery and visibility when switching between Vandal, sidearm and knife. Desktop build and smoke test pass. Preview: `aim-lab/output/vandal-authored-detail.png`.
