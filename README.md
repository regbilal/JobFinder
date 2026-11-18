# JobFinder

Modern job aggregation dashboard built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**. Search across multiple job boards (modular aggregators), filter results, and export reports. Access is protected by a single shared password (`APP_PASSWORD`).

## Features

- Search form: comma-separated keywords, location, date range, per-board toggles
- Aggregated results with match score, source, apply links
- Client-side filters (text, minimum match %, source)
- Export filtered results as **CSV**, **JSON**, or on-screen **summary**
- Password gate via middleware + signed session cookie
- Deployment-ready for [Vercel](https://vercel.com) or [Netlify](https://netlify.com)

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local and set APP_PASSWORD
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`, then the dashboard after sign-in.

## Environment variables

| Variable       | Required | Description |
|----------------|----------|-------------|
| `APP_PASSWORD` | Yes      | Shared password for dashboard access |
| `AUTH_SECRET`  | No       | HMAC secret for session cookies (defaults to `APP_PASSWORD`) |

Copy from `.env.example` and never commit real secrets.

## Project structure

```
app/
  api/auth/login|logout/     # Password login & logout
  api/jobs/search/           # Orchestrates board aggregators
  dashboard/                 # Main UI
  login/                     # Login screen
components/                  # Search, results, export UI
lib/
  aggregators/               # Modular job board integrations
    boards/                  # linkedin, indeed, glassdoor, regional
    simulator.ts             # Deterministic demo data
  auth.ts                    # Cookie session helpers
middleware.ts                # APP_PASSWORD protection
```

## Integrating real job sources

Each board implements `JobBoardAggregator` in `lib/aggregators/types.ts`. Replace `fetchJobs` in `lib/aggregators/boards/*.ts` with:

- Official APIs (preferred), or
- Server-side fetch/scrape behind your own compliance review

The search route (`app/api/jobs/search/route.ts`) and UI stay unchanged.

## Deploy on Vercel

1. Push this repo to GitHub (or import the folder).
2. Import the project in Vercel.
3. Add environment variable **`APP_PASSWORD`** in Project Settings → Environment Variables.
4. Optionally set **`AUTH_SECRET`** to a long random string (recommended in production).
5. Deploy.

## Deploy on Netlify

1. Connect the repository in Netlify.
2. Build command: `npm run build`
3. Publish directory: `.next` is handled by the [Netlify Next.js runtime](https://docs.netlify.com/frameworks/next-js/overview/) — use the default Next.js plugin when prompted.
4. Set `APP_PASSWORD` (and optional `AUTH_SECRET`) in Netlify environment variables.

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run start`| Run production     |
| `npm run lint` | ESLint             |

## Security notes

- `APP_PASSWORD` is compared with **timing-safe** equality.
- Session cookies are **httpOnly**; `secure` is enabled in production.
- Unauthenticated API routes return **401**; pages redirect to `/login`.

## License

MIT