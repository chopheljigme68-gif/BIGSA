# Deployment

Two Node processes (the website and the API) and one database. Any host that runs Node 20+ works. The recommended setup is below; a self-hosted VPS alternative follows it.

## Recommended: website on Vercel, API on Render

* **API → Render** (`render.yaml` at the repo root is a ready Blueprint). Region Singapore. Render → New → Blueprint → this repo, then fill in `DATABASE_URL` (Session pooler, 5432), `REVALIDATE_SECRET`, `WEB_URL`, and optionally `SMTP_*`. Health check: `/health`.
* **Website → Vercel**, Root Directory `apps/web` (`apps/web/vercel.json` sets the install command and the Singapore region). Environment: `API_URL` (the Render address), `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET` (identical to Render).
* After the first deploy, set `WEB_URL` on Render to the Vercel address (later `https://www.bigsa.bt`).
* Every `git push` to `main` redeploys both. Run `npm run db:migrate` from your computer before pushing code that adds a migration.

How the pieces talk:
* Browsers only talk to the website. `/api/*` and `/media/*` are proxied to Render (`next.config.mjs`), so the admin cookie stays first-party.
* The website's middleware adds the visitor's IP to proxied requests, signed with `REVALIDATE_SECRET`; the API uses it for rate limits only when the signature matches.
* After every admin change, the admin panel calls `/admin/refresh` on the website, which checks the session with the API and refreshes all cached public pages. The API also calls `WEB_URL/api/revalidate`; either path alone is enough.
* Keep Render on an always-on plan: a free instance sleeps after 15 minutes and the next request waits about a minute.
* If very large uploads fail with HTTP 413, lower `UPLOAD_MAX_FILE_MB` / `UPLOAD_MAX_ADMIN_FILE_MB` on Render to 4.

## 1. Database (Supabase)

1. Create a Supabase project in the region closest to Bhutan (Singapore `ap-southeast-1` or Mumbai `ap-south-1`).
2. **Connect → Session pooler** gives the connection string. Put it in `DATABASE_URL`. The session pooler (port 5432) works over IPv4 and supports the advisory lock the migration runner uses. Avoid the transaction pooler (6543) for migrations.
3. Optional, recommended: **Database → SSL Configuration**. Download the CA certificate and set `DATABASE_CA_CERT` so TLS is fully verified.
4. From your machine or CI: `npm run db:migrate && npm run db:seed`, then `npm run admin:create -- --email … --name …`.

Nothing else in Supabase is used: no Auth, Storage, Edge Functions or Realtime. Row Level Security is not required because only the API connects, with its own credentials. Turn off the Data API (PostgREST) in Supabase if you want no other route into the database.

Storage maths: the seed is about 12 MB (34 photos plus variants, and 4 PDFs). The Supabase free tier gives 500 MB. Uploads are capped (10 MB public, 25 MB admin), and photos are recompressed on upload.

## 2. API (`apps/api`)

```bash
npm ci && npm run build -w @bigsa/shared && npm run build -w @bigsa/api
NODE_ENV=production node apps/api/dist/index.js
```

Environment: `DATABASE_URL`, `JWT_SECRET` (48+ random chars), `WEB_URL`, `REVALIDATE_SECRET`, `TRUST_PROXY`, `SMTP_*`, `MAIL_*`. Health check: `GET /health`.

Keep the API on a private network if you can. Only the website needs to reach it.

## 3. Website (`apps/web`, includes the admin panel at `/admin`)

```bash
npm run build -w @bigsa/web && PORT=3000 npm run start -w @bigsa/web
```

Environment: `API_URL` (where the API is reachable from the server), `NEXT_PUBLIC_SITE_URL`, and `REVALIDATE_SECRET` (the same value as the API).

Domain: `www.bigsa.bt`, with the admin at `www.bigsa.bt/admin`. `/admin` sends `X-Robots-Tag: noindex` and is disallowed in robots.txt. Optionally restrict `/admin` by IP at the proxy as well (example below).

## 4. Reverse proxy and TLS (VPS example)

```nginx
server {
  server_name www.bigsa.bt;
  client_max_body_size 30m;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
# Optional: only allow the BIGSA office network into /admin
# location /admin { allow 203.0.113.0/24; deny all; proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
```

Get certificates with `certbot --nginx`. With NGINX in front of Next.js, which in turn sits in front of the API, set `TRUST_PROXY=2` on the API so rate limits see the visitor's real IP.

## 5. Backups and restore

* Supabase takes daily backups on paid plans. On any plan, also run a nightly logical dump you control:
  `pg_dump "$DATABASE_URL" -Fc -f bigsa-$(date +%F).dump`, and keep 30 days off-site.
* Restore: `pg_restore --clean --if-exists -d "$DATABASE_URL" bigsa-YYYY-MM-DD.dump`.
* Files live in the database, so one dump captures everything.

## 6. Updates

`git pull && npm ci && npm run db:migrate && npm run build`, then restart both processes. Migrations are additive and safe to re-run.
