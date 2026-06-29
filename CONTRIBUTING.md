# Contributing to Rufo

## Development

1. Fork and clone the repository.
2. Install Node.js 24 and run `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Create a Supabase project and apply every SQL file in `supabase/migrations` in order.
5. Run `npm run dev`.

Never commit `.env.local`, API keys, Supabase service-role keys, generated files, or local CLI state.

## Required checks

```bash
npm run typecheck
npm run lint
npm run build
npm run preflight
```

## Pull requests

- Keep changes scoped and typed.
- Add or update documentation for user-facing behavior.
- Preserve RLS and private Storage access controls.
- Provider integrations must be server-side and configurable through environment variables.
- Do not describe a paid trial or limited credit as unlimited free usage.

All development must follow `docs/Agents.md`.
