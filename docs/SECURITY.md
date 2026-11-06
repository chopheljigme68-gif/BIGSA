# Security and maintenance

Mapped to ToR §10 (Technical and Security Requirements) and OWASP Top 10.

## Controls in place

| Area | Control |
| --- | --- |
| Admin access | Sign-in exists only at `/admin`; the public site never asks visitors to sign in. bcrypt (cost 12) passwords, minimum 12 characters. Sessions are JWTs in an `HttpOnly; Secure; SameSite=Strict` cookie, 8-hour expiry. Account lockout after 5 failures for 15 minutes, plus IP rate limiting on sign-in. Generic error messages and constant-time comparison for unknown emails. |
| Session revocation | `token_version` is checked on every request: a password change, deactivation or reset signs the user out everywhere immediately. |
| Accounts | Two kinds of user: guests (no account) and admins. Every admin route requires a valid session, checked by the API on every request. |
| CSRF | SameSite=Strict cookie, plus a required custom header (`x-bigsa-admin`) on every mutating admin request. |
| Input validation | zod schemas on every admin write. Public forms are validated server-side with the shared form engine, and unknown fields are dropped. SQL is parameterised, and dynamic columns come only from allow-lists. |
| File uploads | Type detected from magic bytes, not the extension or browser MIME. Executables, scripts, SVG and arbitrary zips are rejected. Images are re-encoded (stripping EXIF/GPS and appended payloads). Size and count limits apply. Files are served with `nosniff`, a sandboxing CSP and `Content-Disposition`. Applicant files are private and only reachable through authenticated, audited admin routes. |
| Spam and abuse | Honeypot field, minimum fill time, per-IP rate limits on applications (15/hour) and messages (8/hour). |
| Privacy | IP addresses are stored only as salted HMAC hashes. Page analytics are cookieless counters. Applicant data is never exposed by public endpoints. CSV exports neutralise spreadsheet formula injection. |
| Transport and headers | HSTS, CSP, X-Frame-Options DENY, Referrer-Policy and Permissions-Policy on the website. Helmet on the API. TLS to the database (CA verification available). |
| XSS | React escapes output everywhere. News bodies use a restricted markdown parser that produces React elements (no HTML). Link schemes are allow-listed. Search highlights are escaped, with only `<mark>` restored. |
| Auditing | Sign-ins, failed sign-ins, every create, update and delete, exports, application views and file downloads go to `audit_log`, visible to admins. |
| Secrets | Only in environment variables. `JWT_SECRET` is enforced at 32+ characters at startup. `.env` is git-ignored. |

## Before launch (ToR §10, §12)

1. Run `npm audit` and update dependencies; resolve critical and high findings.
2. Run an OWASP ZAP baseline scan against staging, including `/admin`.
3. Confirm TLS (SSL Labs A or better), and that `/admin` is not linked from the public site and returns `noindex`.
4. Create named accounts for each staff member. No shared logins.
5. Remove the `--demo` sample content if it was seeded.
6. Test a backup restore into a scratch database.

## Maintenance plan

* **Monthly:** `npm outdated` / `npm audit`, then apply patch and minor updates and redeploy. Review the audit log and admin accounts, and deactivate leavers.
* **Quarterly:** test-restore a backup, rotate `REVALIDATE_SECRET`, and review who has admin accounts.
* **Yearly:** rotate `JWT_SECRET` (this signs everyone out), plan major framework upgrades (Next.js, Express), and renew the domain.

## Dependencies (all open source, no paid components)

Next.js, React, Express, pg, zod, bcryptjs, jsonwebtoken, multer, sharp, helmet, express-rate-limit, compression, cookie-parser, nodemailer. No paid plugins, themes or subscriptions. Recurring costs are hosting, the domain, Supabase (the free tier may suffice), and SMTP if a paid provider is chosen.
