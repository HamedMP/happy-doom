---
name: launch-app
description: Launch the Happy Doom Next.js app for runtime validation and testing.
---

# Launch App

Use this skill when a change touches app behavior, UI, routing, API routes, or runtime integration.

## Start

From the repository root:

```bash
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3000
```

If port `3000` is already in use, run the same command with the next available port and record the chosen URL in the Linear workpad.

## Verify

Confirm the app responds:

```bash
curl -I http://127.0.0.1:3000
```

For UI-touching changes, open `http://127.0.0.1:3000`, exercise the changed flow, and capture screenshots or a short recording for the Linear workpad.
