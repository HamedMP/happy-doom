# Handover Context

## Branch

- Branch: `andi/pixel-story-ui`
- Base: `origin/main`
- Purpose: turn the Happy Doom prototype into a scene-led, visual-novel-style game UI with selectable characters.

## What Changed

- Added three selectable player characters:
  - `Mara Chen`
  - `Lena Ortiz`
  - `Noah Park`
- Updated `POST /api/life` so the frontend can pass `characterId`; the server persists that selected character instead of always rolling randomly.
- Added five local scene backgrounds and a scene registry in `src/lib/game/scenes.ts`.
- Mapped the fixed timeline beats onto the scene set so every provided scene appears in gameplay.
- Reworked the main gameplay UI toward a visual novel interaction model:
  - framed scene viewport
  - centered character sprite
  - bottom dialogue box
  - right-side action buttons for choices
  - left-side subject/state and scene rail
- Kept the existing game loop intact: start life, stream event narration, choose response, update state, store feedback, epilogue/replay.

## Key Files

- `src/components/game-client.tsx` - main UI and client interaction flow.
- `src/lib/game/characters.ts` - deterministic selectable character roster.
- `src/lib/game/scenes.ts` - scene metadata and beat-to-scene mapping.
- `src/lib/game/schemas.ts` - start-life schema now accepts optional `characterId`.
- `src/lib/server/db.ts` - `createLife` accepts the selected character.
- `public/assets/characters/` - character sprites.
- `public/assets/scene/` - scene backgrounds.
- `docs/asset-catalog.md` - updated asset inventory.

## Verification

- `npm run lint`
- `npm run build`

Known build note: Next.js reports a workspace-root warning because another `package-lock.json` exists higher up at `/Users/andipatrylo/package-lock.json`. The app still builds successfully.

## Follow-Ups

- Add automated visual regression screenshots for setup and gameplay.
- Tune mobile layout after hands-on device testing.
- Consider including selected character in shareable run seeds if seeded runs are added later.
