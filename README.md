# GrowthOS — Performance Marketing Dashboard

A full-stack SaaS platform for e-commerce marketing agencies to manage clients' ad performance, inventory, and automated reporting.

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS + CSS variables
- **Database:** Prisma + PostgreSQL (Supabase)
- **Auth:** NextAuth.js v5 (Credentials + Role-based: ADMIN | CLIENT)
- **Email:** Resend (scheduled reports)
- **Scheduling:** Vercel Cron Jobs
- **Charts:** Recharts
- **Fonts:** DM Sans + Space Mono (Google Fonts)

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd growthOS
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase recommended) |
| `NEXTAUTH_SECRET` | Random secret for NextAuth (run `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your app URL (e.g. `http://localhost:3000`) |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `META_APP_ID` | Meta Developer App ID |
| `META_APP_SECRET` | Meta Developer App Secret |
| `TIKTOK_APP_ID` | TikTok Ads API App ID |
| `TIKTOK_APP_SECRET` | TikTok Ads API App Secret |
| `CRON_SECRET` | Random secret for cron job auth |

### 4. Set up Supabase (recommended)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your connection string: `Settings → Database → Connection string → URI`
3. Paste it as `DATABASE_URL` in your `.env`

### 5. Run Prisma migrations

```bash
npx prisma migrate dev --name init
```

Or for a quick setup without migrations:

```bash
npx prisma db push
```

### 6. Generate Prisma client

```bash
npx prisma generate
```

### 7. Seed the database

```bash
npx prisma db seed
```

This creates:
- **Admin:** `admin@growthOS.com` / `admin123`
- **Client:** `client@pinkrose.com` / `client123`
- Demo client: PinkRose Egypt with realistic ad creative and product data

### 8. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

---

## Features

### Dashboard Overview
- 4 KPI cards with period-over-period delta
- Revenue vs Ad Spend line chart
- ROAS by Platform bar chart
- Top 5 Ad Creatives grid

### Ad Creatives (`/dashboard/ads`)
- Full creatives grid, sortable by ROAS, Spend, Revenue, ROI, Purchases
- Card design: thumbnail as background, frosted glass metric overlay
- ROAS badges: 🥇 Gold (≥8x), 🟢 Green (≥5x), 🔵 Blue (≥4x)
- Manual sync buttons for Meta and TikTok

### Shopify Reports (`/dashboard/shopify`)
- **By Product tab:** Revenue bar chart, units sold, variant count
- **By Variant tab:** Sell-through progress bars (green/amber/red), stock warnings

### Inventory (`/dashboard/inventory`)
- **Sell-Through Tracker:** Top 4 products with variant progress bars
- **Restock Calculator:** Enter total units → get per-size breakdown based on historical sales ratios

### Alerts (`/dashboard/alerts`)
- Triggered when sell-through reaches 25%, 50%, 70%, or 100% (out of stock)
- Filter by All / Critical / Warning
- Mark individual or all alerts as read

### Admin (`/dashboard/admin`)
- Add/edit/remove clients
- Connect Shopify, Meta, TikTok credentials
- Status toggle (active ↔ paused)
- Set report frequency

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers |
| `/api/clients` | GET/POST | List / create clients |
| `/api/clients/[id]` | GET/PUT/DELETE | Client CRUD |
| `/api/clients/[id]/alerts` | GET | Client alerts |
| `/api/clients/[id]/alerts/read-all` | PATCH | Mark all read |
| `/api/alerts/[alertId]/read` | PATCH | Mark one read |
| `/api/dashboard` | GET | Aggregated dashboard data |
| `/api/sync/meta` | POST | Sync Meta Ads data |
| `/api/sync/tiktok` | POST | Sync TikTok Ads data |
| `/api/sync/shopify` | POST | Sync Shopify orders + inventory |
| `/api/alerts/check` | POST | Run sell-through checks |
| `/api/cron/daily` | GET | Daily cron job |
| `/api/cron/weekly` | GET | Weekly cron job |
| `/api/cron/monthly` | GET | Monthly cron job |

---

## Cron Jobs (Vercel)

Configured in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/daily", "schedule": "0 8 * * *" },
    { "path": "/api/cron/weekly", "schedule": "0 8 * * 1" },
    { "path": "/api/cron/monthly", "schedule": "0 8 1 * *" }
  ]
}
```

Each cron job:
1. Syncs Meta + TikTok ad data
2. Syncs Shopify orders + inventory
3. Runs inventory alert checks
4. Sends email reports via Resend

---

## Deployment (Vercel)

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Add all environment variables in Vercel project settings
4. Deploy — Vercel auto-detects Next.js and configures cron jobs from `vercel.json`

---

## Design System

Colors defined as CSS variables in `app/globals.css`:

| Variable | Value | Use |
|----------|-------|-----|
| `--bg` | `#0A0B0F` | Page background |
| `--surface` | `#111318` | Cards, panels |
| `--surface2` | `#181C23` | Nested elements |
| `--accent` | `#4F6EF7` | Primary actions |
| `--accent2` | `#7C3AED` | Secondary accent |
| `--green` | `#22C55E` | Positive indicators |
| `--red` | `#EF4444` | Alerts, errors |
| `--amber` | `#F59E0B` | Warnings |

---

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio
```
