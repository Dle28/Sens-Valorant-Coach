# CS / Valorant asset shortlist — 2026-09-10

These are candidates, not assets already embedded in the source tree. The Sketchfab session for `dle28` was authenticated on 2026-09-10; Vandal and SAS GLB download actions were requested.

| Candidate | Author / source credit | Format / geometry reported | Intended integration |
|---|---|---|---|
| [Vandal Valorant](https://sketchfab.com/3d-models/vandal-valorant-4083375a4f184561bdbc57a7511abaf7) | hakbux265 | 5.2k triangles | Weapon appearance; inspect, equip and recoil |
| [SAS CS2 Blue](https://sketchfab.com/3d-models/sas-cs2-agent-model-blue-7f18aaccd0ee4694a36646101a12339e) | gettan; credits Valve | GLB, rigged, 16.5k triangles | Enemy presentation; align head/feet and animation to existing hit regions |
| [CTM SAS CS2](https://sketchfab.com/3d-models/ctm-sas-cs2-agent-model-b143861dd5a64ab3a9930c057a0fcef9) | Alex / alyax | DAE, FBX, Blender; rigged; 18.5k triangles | Alternative agent |
| [Jett Valorant](https://sketchfab.com/3d-models/jett-valorant-f6cc2de8bb9e4881a8af4d481044074d) | ILilMitch | Candidate found; not downloaded | Alternative Valorant silhouette |
| [CS2 Workshop resources](https://www.counter-strike.net/workshop/workshopresources) | Valve | Official CS2 weapon geometry ZIP, 26.5 MB | Reference/source candidate; workshop availability is not a redistribution license |

The Vandal and SAS pages display CC Attribution. SAS credits the original game owner Valve; an uploader's license label does not independently verify rights to original game assets. Preserve full attribution and source terms with any downloaded asset.

## Next steps after authenticated download
1. Save the GLBs at the fixed application paths documented in `IMPORTED_3D_ASSETS.md`.
2. Run `node scripts/inspect-model.mjs <path.glb>` to check completeness, dependencies, skeleton, mesh bounds and animation channels.
3. Fit weapon orientation and hand grip; retarget agent only after inspecting its actual skeleton. Keep visual mesh separate from gameplay hit regions.
4. Verify textures, animation transitions and target visibility in game before enabling the candidate.

No CS/Valorant asset has been substituted with a blaster or represented as already integrated by this investigation.
