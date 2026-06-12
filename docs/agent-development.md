# Agent Development Notes

Future agents should treat this folder as the product source of truth.

## Before Adding A Feature

1. Read `game-design.md`.
2. Read the doc closest to the change area.
3. Check whether `src/lib/game/` already models the concept.
4. Keep the fixed timeline invariant unless the user explicitly asks to change the premise.

## When Adding A New Feature

- Add or update the design note first.
- Keep data shapes typed in `src/lib/game/types.ts`.
- Keep generated content behind schemas in `src/lib/game/schemas.ts`.
- If a feature needs memory, add it to SQLite through `src/lib/server/db.ts`.
- If a feature needs visuals, add local assets and update `asset-catalog.md`.

## Commit Hygiene

Small commits are preferred:

- one feature or one vertical slice per commit
- docs updated with code
- verification command included in commit message body when useful
