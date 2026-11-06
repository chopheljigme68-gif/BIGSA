# ToR coverage

How the build maps to the BIGSA Website Terms of Reference (14.09.26).

| ToR | Requirement | Where |
| --- | --- | --- |
| 4.1 | Home: banner, intro, featured sports, news, upcoming events, forms, documents, photos, social links, section links | `/` — headline, search, browse grid (sports, news, events, forms, documents), scoring explainer, range strip, news, events, photo strip; footer with social links |
| 4.2 | About: background, mandate, vision, mission, core areas, organisation, affiliations | `/who-we-are`, `/vision-mission`; edited in Site content |
| 4.3 | Who's who: name, photo, designation, profile, responsibilities, contact; add, edit, reorder, publish, remove | `/who-we-are#team`; admin → Who's who |
| 4.4 | Archive of 12 sports, each page with origin, how played, significance, photos, video, rules, related events and resources; add more later | `/sports`, `/sports/[slug]`; admin → Sports (new games need no code) |
| 4.5 | Applications: categories, eligibility, instructions, downloadable forms, online forms, documents, dates, FAQ, contact | `/forms`, `/forms/[slug]`, `/forms/downloads`; admin → Online forms |
| 4.6 | Searchable, filterable resource repository with preview and download | `/forms/downloads` (search, category, sport, PDF preview, counted downloads) |
| 4.7 | News, announcements, events, training, tournaments, notices, results | `/news` (category filters), `/archives` |
| 4.8 | Media gallery: photos, albums, video, captions, credits, event-based | Event photo albums, sport galleries, home photo strip, lightbox; captions and credits in Media library; YouTube/Vimeo embeds |
| 4.9 | Contact: addresses, phone, email, map, enquiry form with spam protection, social | `/contact` |
| 5.1 | Applicant functions: requirements, online form, uploads, review, consent, submit, on-screen and email acknowledgement, reference number, print | Application wizard |
| 5.2 | Admin: activate/deactivate, dates, view/search/filter, download, export, statuses, notes, notifications, access control | `/admin` → Applications and Online forms; admin-only access |
| 6 | Design: credible, Bhutanese identity, logo palette, clean, responsive, accessible, readable, slow-connection friendly | Palette from the logo; WebP variants and lazy images; no animation or UI libraries; keyboard and screen-reader support; reduced-motion respected |
| 7 | CMS: pages, profiles, news, documents, media, forms, user access, backup/restore | Admin panel at `/admin`; admin accounts; backups in DEPLOYMENT.md |
| 8 | English now, Dzongkha-ready (Unicode fonts) | Dzongkha names on sports and the association; Noto Serif Tibetan loaded |
| 9 | Site search, SEO titles and descriptions, analytics, frequently visited pages, download stats, sharing | `/search` and instant search (`/` or Ctrl+K); per-page metadata, sitemap.xml, robots.txt; cookieless page counts and download counts on the dashboard; share buttons on articles and events |
| 10 | Security | SECURITY.md |
| 13 | Admin manual, technical documentation, security guide, source, credentials | ADMIN_GUIDE.md, README.md, DEPLOYMENT.md, SECURITY.md |
| 14 | No lock-in | Standard Postgres, open-source stack, plain SQL migrations, files inside the database |

## Content sources and open items

* **From BIGSA's documents:** the background and mandate (ToR §1); everything on Dha, Khuru and Doegor, including the full rules (Annexures I–IV) and the 34 photographs (from Sangay Duba); contact details (ToR letterhead).
* **Drafted, needs BIGSA approval:** vision, mission and values; core areas of work; the Bhutan Olympic Committee affiliation line.
* **Not yet supplied:** descriptions of Ji-Dum, Sok-Sum, Tag-Dha-Nor, Dochusum Thrangni, Yam-Tse, Kolagpa, Chhab-Chha, Phyinang Gyerpi and Thab-Thenni (they show as *in preparation*); Who's who; social links; organisational information; a vector logo.
* **Forms (ToR §4.5 says BIGSA will confirm):** five forms are built from what BIGSA's rules already prescribe: team entry for archery, khuru and doegor (names, CID numbers, CID copies); the replacement player request; and the player code of conduct undertaking. Further forms can be built in the admin form builder once BIGSA confirms their fields.
