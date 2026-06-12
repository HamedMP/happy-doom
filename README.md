# Happy Doom

Hackathon prototype for **Happy Doom**, a short replayable life simulator set against a fixed 2025-2027 AGI timeline.

## Development

```bash
npm run dev
```

The game runs without external services by using a deterministic local narrator fallback. When Vercel AI Gateway credentials are available, the narrator uses the Vercel AI SDK agent path with structured output.

## Deployment

```bash
npx vercel deploy
```

## Project Map

- `src/app/` - Next.js App Router UI and API routes.
- `src/lib/game/` - timeline, lens, schemas, and character data.
- `src/lib/server/` - local SQLite memory store.
- `src/lib/ai/` - narrator agent and local fallback.
- `public/assets/` - preloaded local visual assets.
- `docs/` - game design, feature specs, asset catalog, prompt notes, and future-agent guidance.
- `.codex/` - future repo-local skills and plugins.
- `agents/` - future runnable agents or automation experiments.
