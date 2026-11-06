# BIGSA website

Official website of the **Bhutan Indigenous Games and Sports Association**. One website, open to every visitor without signing in, with the admin panel at **`/admin`**. A small API sits behind it, backed by one PostgreSQL database on Supabase, connected only through `DATABASE_URL`.

There are two kinds of user: **guests** (every visitor, no account) and **admins** (sign in at `/admin`).

```
bigsa/
├── apps/
│   ├── web/      The website — Next.js 15, port 3000
│   │   └── src/app/(site)/   public pages (no sign-in, ever)
│   │   └── src/app/admin/    admin panel at /admin (sign-in required)
│   └── api/      REST API — Node + Express 5, port 4000
├── packages/
│   └── shared/   Types, form engine, markdown parser (used by all three)
├── db/
│   ├── migrations/   SQL schema (applied in order by `npm run db:migrate`)
│   └── seed/         BIGSA photos, rules PDFs, seed tooling
└── docs/         Deployment, security, admin guide, ToR coverage
```

## How it fits together

```
 browser ──► website (Next.js) ── /, /sports, /news … public, no sign-in
                 │             └─ /admin …           admin panel, sign-in
                 │  /api/*, /media/* proxied (same origin)
                 ▼
                         api (Express) ──► Supabase Postgres (DATABASE_URL only)
```

* **Only `DATABASE_URL` links to Supabase.** No Supabase SDK, Auth or Storage. Uploaded photos and documents are stored in Postgres (`media` table, with pre-sized WebP variants), so the database is the single thing to back up and move.
* Browsers never talk to the API directly; the website proxies it under its own origin. That keeps the admin session cookie first-party (`HttpOnly`, `SameSite=Strict`) and the API private.
* Sign-in is enforced only on `/admin` (`apps/web/src/middleware.ts` matches `/admin` and `/admin/*` only). The landing page and every public page never redirect to a login.
* The public site is server-rendered and cached. Publishing in the admin calls back to the site (`/api/revalidate`) so changes show at once.
* Online forms are **data, not code**: each form is a JSON definition edited in the admin's form builder. The same validation code (`packages/shared/src/forms.ts`) runs in the browser and on the API.

## Run it locally

Requirements: Node 20.12+ and a Postgres database (a Supabase project, or local Postgres 15+).

```bash
npm install                 # also builds packages/shared
cp .env.example .env        # fill DATABASE_URL, JWT_SECRET, REVALIDATE_SECRET
npm run db:migrate          # create tables
npm run db:seed             # BIGSA content: 12 sports, rules, forms, 34 photos
#   npm run db:seed -- --demo   adds clearly-labelled SAMPLE news/events for review
npm run admin:create -- --email you@bigsa.bt --name "Your Name"
npm run dev                 # API :4000 + website :3000 (admin at http://localhost:3000/admin)
```

For a local database set `DATABASE_URL=postgresql://postgres@localhost:5432/bigsa`. SSL is turned off automatically for localhost.

No SMTP yet? Emails (acknowledgements and notifications) are written to the API log instead, so everything else works.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run build` | Builds shared, API and website |
| `npm run typecheck` | Type-checks every workspace |
| `npm test` | Runs the form-engine and markdown tests |
| `npm run db:migrate` | Applies new files in `db/migrations` (idempotent, locked) |
| `npm run db:seed -- --sql seed.sql` | Writes the seed as SQL for the Supabase SQL editor |
| `npm run admin:create -- --email …` | Creates or resets a super admin |

## Public site

Home · Who we are · 12 Sports (and one page per sport) · Forms (online applications, plus Rules and downloads) · News · Archives (events) · Vision & mission · Contact us · Search. Site-wide search uses Postgres full-text with prefix matching.

Interactive pieces: a scoring explainer where you tap the target and an arrow lands with the points for that hit; a range strip drawn to the real distances; searchable rules for each sport; a multi-step application wizard with draft saving, upload progress and a printable receipt; a photo lightbox.

## Admin panel (`/admin`)

Type `/admin` after the site address, for example `http://localhost:3000/admin`. Nothing on the public site links to it.

Dashboard, News, Events & archive, Sports, Who's who, Documents, Media library, Applications (filter, status workflow with optional email to the applicant, internal notes, CSV export, file download), Online forms (switch on/off, dates, form builder), Messages, Site content, Admin accounts, Audit log, Account. See `docs/ADMIN_GUIDE.md`.

Every admin account has full access; there are no sub-roles.

## Content still needed from BIGSA

Tracked on the admin dashboard and in `docs/TOR_COVERAGE.md`: approval of the draft vision, mission and values; Who's who profiles; descriptions for nine sports; social links; organisational information; a vector logo; and the list of further online forms (ToR §4.5).
