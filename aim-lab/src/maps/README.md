# Map / site organization

Each playable map owns its site folder:

```
maps/
  index.js                 # Stable map IDs and scene registry
  garden/sites/b/          # Lotus B training interpretation (active garden ID)
  garden/sites/main/       # Previous Temple Garden scene, retained in source
  piazza/sites/main/       # Piazza Court
  atrium/sites/main/       # Sunken Atrium
  foundry/sites/main/      # Relay Foundry
  shared/                 # Reusable architecture rendering
```

Each `sites/main/layout.js` owns the map name, palette, cover dimensions and spawn points in meters. Each `scene.js` is the site-specific rendering entry point. Additional sites should use their own named folder alongside `main`, rather than mixing geometry into an existing site.

`site-layout.js` provides common collision/spawn functions. `site-world.js` provides the floor, lighting and cover renderer. Shared decorative objects sit above aiming height or along the perimeter; any new obstacle inside the playable area must be added to the site's `cover` data so rendering and collision agree.

Stable IDs (`garden`, `piazza`, `atrium`, `foundry`) are retained for saved session compatibility. The architecture is original and simplified, not an official Valorant asset export.
