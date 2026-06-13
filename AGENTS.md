<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent tooling setup

This repo expects contributors to have the [Vercel plugin for AI coding agents](https://vercel.com/docs/agent-resources/vercel-plugin) installed (Claude Code, Codex, Cursor, or supported equivalents). It provides Vercel/Next.js-aware skills, slash commands, and specialist agents used during development.

One-time install (user scope):

```bash
npx plugins add vercel/vercel-plugin
```

Restart your agent tool after install. Verify with `/vercel-plugin:status` or `npx vercel-plugin doctor`.
