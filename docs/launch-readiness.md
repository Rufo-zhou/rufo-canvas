# Rufo Launch Readiness

Last checked: 2026-07-20

## Automated Gates

Run before every public release:

```bash
npm run verify
```

This executes:

- `tsc --noEmit`
- `eslint . --max-warnings=0`
- `node scripts/preflight.mjs`
- `next build`

Run dependency security audit in a normal Node/npm environment:

```bash
npm audit --audit-level=high
```

The repository uses `package-lock.json` as the package lock. Do not treat `pnpm audit` as authoritative unless a `pnpm-lock.yaml` is intentionally added.

## Environment Checklist

Required for Supabase production mode:

- `NEXT_PUBLIC_APP_MODE=supabase`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional provider keys:

- `POLLINATIONS_API_KEY`
- `HUGGINGFACE_API_KEY`
- `AGNES_API_KEY`
- `NANO_BANANA_API_KEY`
- `GPTLMAGE2_API_KEY`

Provider keys must stay server-only. Never add `NEXT_PUBLIC_` to provider secrets.

## Supabase Checklist

- Apply every SQL file in `supabase/migrations/` in filename order.
- Confirm the Storage bucket named by `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` exists.
- Confirm RLS policies are enabled for projects, canvas snapshots, generation tasks, generated assets, and Storage objects.
- Enable Supabase Anonymous sign-ins if the public guest button should work.
- Configure email templates and SMTP if email confirmation is enabled.
- Configure Google OAuth only when `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
- Add the deployed site URL and wildcard redirect URL in Supabase Auth URL Configuration.

## Public Deployment Checklist

- Deploy to Vercel or Netlify; do not share `localhost` as a public URL.
- Configure all variables from `.env.example` in the host environment settings.
- Keep `SUPABASE_SERVICE_ROLE_KEY` and provider keys server-only.
- Use `npm run verify` locally before pushing release changes.
- After deployment, open the production URL in a private/incognito browser and complete the smoke test below.

## Smoke Test

1. Open the public URL.
2. Register with email or use guest access.
3. Create a project from the home prompt.
4. Open the canvas.
5. Add text, frame, uploaded asset, and a generated image node.
6. Drag and resize generated media nodes.
7. Use video mode and click `Seedance 优化`.
8. Confirm the optimized prompt includes intent, camera, motion, timing, reference handling, and technical constraints.
9. Save the canvas, refresh, and confirm nodes reload.
10. Open generation history and confirm completed or failed tasks show usable Chinese recovery guidance.

## Current Quality Notes

- The app supports local demo mode and Supabase production mode.
- Public image generation has keyless Pollinations image models.
- Stable video generation still depends on user or server provider keys.
- Guest access now uses Supabase Anonymous Auth in production mode and local demo identity only in demo mode.
