# Rufo

Rufo is an infinite-canvas AI image generation MVP built with Next.js, TypeScript, Tailwind CSS, React Flow, and Supabase.

## Features

- Infinite React Flow canvas with pan, zoom, resize, layers, minimap, and persistence.
- Working marker, frame, freehand drawing, text, grid, upload, assets, generation, and chat tools.
- Image and video media nodes with private Supabase Storage.
- Keyless Sana image generation through the Pollinations public endpoint.
- Optional free-credit integrations for Nano Banana, Wan, Seedance, Veo, and Hugging Face.
- Email/password, anonymous guest, and optional Google authentication.

## Requirements

- Node.js 24 with npm available
- Supabase project with Auth enabled
- Supabase SQL migration applied from `supabase/migrations/0001_initial_schema.sql`
- Local `.env.local` created from `.env.example`

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local`:

```text
NEXT_PUBLIC_APP_MODE=demo
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=generated-assets
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
SUPABASE_SERVICE_ROLE_KEY=
IMAGE_GENERATION_MOCK=true
POLLINATIONS_API_KEY=
HUGGINGFACE_API_KEY=
AGNES_API_KEY=
```

`NEXT_PUBLIC_APP_MODE=demo` enables local authentication, projects, canvas persistence, and mock image generation without Supabase credentials.

To use Supabase, set `NEXT_PUBLIC_APP_MODE=supabase`, fill the Supabase variables, and apply every SQL file in `supabase/migrations/` in filename order.

Use `IMAGE_GENERATION_MOCK=true` to verify the complete cloud data flow without third-party Nano Banana or GPTlmage2 keys.

The new media route uses real keyless Pollinations image generation even when the legacy image route remains in mock mode. See [docs/free-models.md](docs/free-models.md) for model availability and limitations.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Authentication

- Email registration logs the user in immediately when Supabase email auto-confirm is enabled.
- Guest access uses Supabase anonymous authentication and does not require an email.
- Guest data belongs to that browser session and cannot be recovered after site data is cleared.
- Google login is implemented in the UI and auth provider. Enable it only after configuring Google OAuth in Supabase, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

The Google OAuth callback URL is:

```text
https://tjdlwhqpjbmmjkppgren.supabase.co/auth/v1/callback
```

## Public deployment

`localhost` and `127.0.0.1` are only accessible from the computer running Rufo. Friends do not need to download the project when Rufo is deployed to a public host.

Recommended hosts:

- Vercel for the simplest Next.js deployment.
- Netlify using the included `netlify.toml`.

Configure all values from `.env.example` in the host's environment settings. Keep `SUPABASE_SERVICE_ROLE_KEY` and image provider keys server-only.

After deployment, update Supabase Auth URL Configuration:

```text
Site URL: https://your-public-domain.example
Redirect URL: https://your-public-domain.example/**
```

For a temporary public preview from the local computer, a Cloudflare Quick Tunnel can forward the running production server. The preview remains available only while the computer, Next.js server, and tunnel process are running.

On the maintainer's Mac, `scripts/com.rufo.canvas.plist` can be installed as a LaunchAgent so `http://localhost:3000` starts automatically after login. This solves local restart access only; a stable address for friends still requires Vercel or Netlify deployment.

## Verify

1. Register a new user.
2. Log in.
3. Create a project from the home prompt box.
4. Open the project canvas.
5. Enter a prompt in the Agent sidebar and generate an image.
6. Confirm the generated image is added to the React Flow canvas.
7. Drag and resize the image node.
8. Save the canvas.
9. Refresh the page and confirm the canvas reloads.
10. Return to `/projects`, create and delete a project.

## Checks

```bash
npm run verify
```

`verify` runs the full launch gate:

```bash
npm run typecheck
npm run lint
npm run preflight
npm run build
```

Before a public release, also run `npm audit --audit-level=high` in a normal Node/npm environment. The Codex bundled runtime used for local maintenance may not expose `npm`, while the repository itself is locked by `package-lock.json`.

## Project Standards

All development must follow [docs/Agents.md](docs/Agents.md).
