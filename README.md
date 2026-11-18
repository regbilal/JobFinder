# JobFinder

**LinkedIn job search** dashboard built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**. Search **job postings** (official listings—not LinkedIn feed posts), filter results, and export reports. Access is protected by `APP_PASSWORD`.

## Features

- Search form: comma-separated keywords, location, date range (LinkedIn only)
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
| `RAPIDAPI_KEY` | No       | [JSearch on RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) — live **job listings** |
| `SERPAPI_KEY`  | No       | [SerpAPI](https://serpapi.com/) — live **feed posts** via `site:linkedin.com/posts` Google search |

Copy from `.env.example` and never commit real secrets.

### Demo vs live results

By default, JobFinder shows **simulated** rows (`lib/aggregators/simulator.ts`) so the UI works without paid APIs. They are **not** real job posts.

**LinkedIn** does not offer a public “search all jobs” API for indie apps. Scraping LinkedIn yourself breaks their Terms of Service and is brittle. The supported path in this repo is:

1. Subscribe to **JSearch** on RapidAPI (aggregates listings from LinkedIn and other publishers).
2. Set `RAPIDAPI_KEY` in `.env.local` / Vercel.
3. Enable the **LinkedIn** board in search — results use real `job_apply_link` URLs and show **Apply** (not **Search**).

### Jobs + feed posts (LinkedIn only)

| Surface | Live data | API key |
|---------|-----------|---------|
| **Job listings** | JSearch → LinkedIn publisher | `RAPIDAPI_KEY` |
| **Feed posts** | SerpAPI Google index of `linkedin.com/posts` | `SERPAPI_KEY` |

LinkedIn does not offer a public post-search API. Post results use indexed public URLs (coverage and freshness follow Google/SerpAPI, not LinkedIn directly).

### Freshness: APIs vs opening LinkedIn

| Approach | Freshness | Volume | Notes |
|----------|-----------|--------|--------|
| **JSearch** (`RAPIDAPI_KEY`) | Best among APIs | High | Uses `date_posted`; preferred for jobs |
| **SerpAPI** (`SERPAPI_KEY`) | Often **stale** (Google index) | Medium | Used only to top up when JSearch returns few hits |
| **Open LinkedIn (live)** buttons in the app | **Always current** | Everything on LinkedIn | No API; opens linkedin.com with your filters |

**Alternatives (not built in yet):** [Apify](https://apify.com) LinkedIn Jobs actors (fresher, paid per run), Proxycurl, or browser automation/scraping with your own LinkedIn account — scraping violates LinkedIn ToS and breaks often; use only if you accept that risk.

For production hiring workflows, many teams use **JSearch + dashboard “Open LinkedIn Jobs (live)”** for the latest postings.

### Fetch from LinkedIn (default, no API)

**Fetch from LinkedIn** calls LinkedIn’s public guest job search (same HTML as the website), parses listings into the table, and uses real `linkedin.com/jobs/view/{id}` links. No `RAPIDAPI_KEY` / `SERPAPI_KEY` required.

| Mode | Jobs | Posts |
|------|------|-------|
| **Fetch** | Parsed job cards in-app | Live search links only |
| **Search links** | Opens linkedin.com | Opens linkedin.com |
| **Third-party API** | JSearch / Serp | Serp |

LinkedIn may block some datacenter IPs (e.g. serverless hosts). If fetch returns 0 rows on Vercel, use **Search links** or **Third-party API**. Scraping may violate LinkedIn’s ToS—use for personal/internal tooling.

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