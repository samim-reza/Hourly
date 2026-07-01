# Hourly

**Hourly** is a cross-platform time-tracking app with proof of work — periodic screenshots, activity monitoring, and a web dashboard for freelancers and clients.

Built from the [Time Tracker App — Full Electron Build Plan](https://app.notion.com/p/bf3f2852b41e43e2be0c4f4921102bd7).

## Architecture

```
apps/desktop     → Electron tracker (timer, screenshots, activity, tray)
apps/dashboard   → Next.js web dashboard (hours, reports, client view)
packages/shared  → Shared types and Supabase helpers
supabase/        → Database migrations + RLS policies
```

## Features (MVP)

- **Desktop app**: Start/stop/pause timer, project selector, memo, system tray
- **Monitoring**: Screenshots every ~10 min, keyboard/mouse event counts (not keylogging), idle auto-pause
- **Sync**: Time entries, screenshots, and activity logs to Supabase
- **Dashboard**: Hours overview, weekly timesheet, screenshot gallery, CSV export
- **Roles**: Freelancer (full access) and client (read-only via RLS)

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

## Setup

### 1. Supabase

1. Create a Supabase project
2. Run migrations in order from `supabase/migrations/` via the SQL editor
3. Enable email auth in Authentication → Providers
4. Copy your project URL and anon key

### 2. Environment variables

```bash
cp apps/desktop/.env.example apps/desktop/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
```

Fill in your Supabase URL and anon key in both files.

### 3. Install dependencies

```bash
npm install
npm run build -w @hourly/shared
```

### 4. Run

**Desktop app (development):**

```bash
npm run dev:desktop
```

**Web dashboard:**

```bash
npm run dev:dashboard
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard.

## Building for production

```bash
npm run build:dashboard   # Next.js production build
npm run build:desktop     # Electron app
npm run dist -w @hourly/desktop   # Package .exe / .dmg / AppImage
```

## User roles

- Sign up via the **desktop app** as a freelancer (default role)
- To create a **client** account, sign up with `role: 'client'` in user metadata, or update `profiles.role` in Supabase
- Assign clients to projects by setting `client_id` on the `projects` table

## Privacy & ethics

Hourly counts **how many** keyboard and mouse events occur — it never logs **which** keys were pressed. Be transparent with anyone being tracked.

## macOS / Windows notes

- **macOS**: Requires Screen Recording and Accessibility permissions for screenshots and activity monitoring. Code signing requires an Apple Developer account ($99/yr).
- **Windows**: Screenshots work without extra prompts. Unsigned builds may trigger SmartScreen warnings.

## Project structure

| Path | Description |
|------|-------------|
| `apps/desktop/electron/main.ts` | Main process: tray, screenshots, activity, idle detection |
| `apps/desktop/src/` | React renderer UI |
| `apps/dashboard/src/app/` | Next.js App Router pages |
| `supabase/migrations/` | Postgres schema + Row Level Security |

## Docker deployment (VPS + existing Caddy)

The dashboard is deployed as container **`hourly-app`** on port **8001**, on the external Docker network **`web`**. Caddy in `~/MyChatbot` proxies `hourly.samimreza.me` → `hourly-app:8001` — do not add another reverse proxy here.

### On the VPS (`~/Hourly`)

```bash
# 1. Ensure shared network exists (once)
docker network create web   # skip if already created by MyChatbot

# 2. Configure env
cp .env.example .env
# Edit .env — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Build and start (no ports 80/443, no host bind — only expose 8001 on `web` network)
docker compose up -d --build

# 4. Logs
docker compose logs -f hourly-app

# 5. Health check (from another container on `web`, or after Caddy restart)
curl -s https://hourly.samimreza.me/api/health
# → {"status":"ok","service":"hourly-dashboard"}
```

### Restart Caddy (on MyChatbot side)

```bash
cd ~/MyChatbot
docker compose restart caddy
```

### Supabase auth (production)

In Supabase → Authentication → URL configuration, add:

- Site URL: `https://hourly.samimreza.me`
- Redirect URLs: `https://hourly.samimreza.me/**`

### Confirm

| Requirement | Value |
|-------------|-------|
| Container name | `hourly-app` |
| Internal port | `8001` |
| Listen address | `0.0.0.0` |
| Health endpoint | `/api/health` |
| Network | `web` (external) |

---

## License

Private — all rights reserved.
