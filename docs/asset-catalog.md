# Asset Catalog

All game visuals are local, preloaded assets. Runtime image generation is out of scope.

## Lens Assets

- `public/assets/lenses/severance.svg`
- `public/assets/lenses/matrix.svg`
- `public/assets/lenses/westworld.svg`

## Avatar Assets

- `public/assets/avatars/avatar-01.svg`
- `public/assets/avatars/avatar-02.svg`
- `public/assets/avatars/avatar-03.svg`

## Character Assets

- `public/assets/characters/mara-chen.png` - selectable player character sprite.
- `public/assets/characters/lena-ortiz.png` - selectable player character sprite.
- `public/assets/characters/noah-park.png` - selectable player character sprite.

## Timeline Assets

- `public/assets/timeline/beat-2025-agents.svg`
- `public/assets/timeline/beat-2025-work.svg`
- `public/assets/timeline/beat-2026-code.svg`
- `public/assets/timeline/beat-2026-media.svg`
- `public/assets/timeline/beat-2027-labs.svg`
- `public/assets/timeline/beat-2027-takeoff.svg`
- `public/assets/timeline/beat-2027-door.svg`

## Scene Assets

- `public/assets/scene/bedroom-rain.png` - home/bedroom scene used for setup, opening beats, and the final ordinary-day return.
- `public/assets/scene/convenience-store.png` - late convenience store scene used for public errand and agent spillover beats.
- `public/assets/scene/rainy-street.png` - neighborhood street scene used for takeoff pressure outside private life.
- `public/assets/scene/night-train.png` - train interior scene used for synthetic media and public-trust beats.
- `public/assets/scene/office-night.png` - after-hours office scene used for work automation and research/autopilot beats.

## Rules For Future Assets

- Prefer SVG or optimized small raster files.
- Add every new asset here with path, purpose, and owner feature.
- Do not fetch remote images at runtime.
- Keep lens visuals inspectable and distinct.
