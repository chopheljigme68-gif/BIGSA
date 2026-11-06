-- BIGSA website — initial schema.
-- Plain PostgreSQL 15+ (Supabase-compatible). Connects only through DATABASE_URL;
-- no Supabase client SDK, auth or storage is used.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Admin users and audit trail
-- ---------------------------------------------------------------------------
create table admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  name          text not null,
  password_hash text not null,
  role          text not null check (role in ('super_admin', 'editor', 'applications_officer')),
  is_active     boolean not null default true,
  failed_logins int not null default 0,
  locked_until  timestamptz,
  last_login_at timestamptz,
  token_version int not null default 0,          -- bump to revoke all sessions
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index admin_users_email_key on admin_users (lower(email));
create trigger admin_users_updated before update on admin_users for each row execute function set_updated_at();

create table audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references admin_users(id) on delete set null,
  actor_name text,
  action     text not null,                      -- e.g. news.update
  entity     text,
  entity_id  text,
  detail     jsonb,
  ip         text,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Media. Files live in Postgres (bytea) so DATABASE_URL is the only
-- infrastructure dependency and backups include every upload.
-- Public images get pre-sized WebP variants for slow connections.
-- ---------------------------------------------------------------------------
create table media (
  id           uuid primary key default gen_random_uuid(),
  filename     text not null,
  mime         text not null,
  size         int  not null,
  width        int,
  height       int,
  alt          text,
  caption      text,
  credit       text,
  visibility   text not null default 'public' check (visibility in ('public', 'private')),
  in_gallery   boolean not null default false,
  sha256       text not null,
  data         bytea not null,
  uploaded_by  uuid references admin_users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index media_gallery_idx on media (created_at desc) where in_gallery and visibility = 'public';
create index media_sha_idx on media (sha256);

create table media_variants (
  media_id uuid not null references media(id) on delete cascade,
  width    int  not null,
  mime     text not null,
  size     int  not null,
  data     bytea not null,
  primary key (media_id, width)
);

-- ---------------------------------------------------------------------------
-- Site content (about, vision & mission, contact, social links, motto)
-- ---------------------------------------------------------------------------
create table site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references admin_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indigenous games and sports archive
-- ---------------------------------------------------------------------------
create table sports (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name                  text not null,
  name_dz               text,
  tagline               text,
  summary               text,
  history               text,
  how_to_play           text,
  cultural_significance text,
  facts                 jsonb not null default '[]',
  scoring               jsonb not null default '[]',
  equipment             jsonb not null default '[]',
  rules                 jsonb not null default '[]',
  video_url             text,
  cover_id              uuid references media(id) on delete set null,
  gallery_ids           uuid[] not null default '{}',
  sort_order            int not null default 0,
  is_published          boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(tagline, '') || ' ' || coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(history, '') || ' ' || coalesce(how_to_play, '') || ' ' || coalesce(cultural_significance, '')), 'C')
  ) stored
);
create index sports_search_idx on sports using gin (search);
create trigger sports_updated before update on sports for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- News, events (archive), team
-- ---------------------------------------------------------------------------
create table news (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  excerpt      text,
  body         text not null default '',
  category     text not null default 'news'
               check (category in ('news', 'announcement', 'tournament', 'training', 'notice', 'result')),
  sport_id     uuid references sports(id) on delete set null,
  cover_id     uuid references media(id) on delete set null,
  is_featured  boolean not null default false,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  author_id    uuid references admin_users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'C')
  ) stored
);
create index news_public_idx on news (published_at desc) where status = 'published';
create index news_search_idx on news using gin (search);
create trigger news_updated before update on news for each row execute function set_updated_at();

create table events (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  summary      text,
  body         text not null default '',
  venue        text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  results      text,
  sport_id     uuid references sports(id) on delete set null,
  cover_id     uuid references media(id) on delete set null,
  gallery_ids  uuid[] not null default '{}',
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(venue, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '') || ' ' || coalesce(results, '')), 'C')
  ) stored
);
create index events_starts_idx on events (starts_at desc) where is_published;
create index events_search_idx on events using gin (search);
create trigger events_updated before update on events for each row execute function set_updated_at();

create table team_members (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  designation      text not null,
  bio              text,
  responsibilities text,
  email            text,
  phone            text,
  photo_id         uuid references media(id) on delete set null,
  sort_order       int not null default 0,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger team_updated before update on team_members for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Resources & publications (searchable document repository)
-- ---------------------------------------------------------------------------
create table resources (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  category       text not null check (category in ('rules', 'standards', 'framework', 'guidelines', 'forms', 'policies', 'reports', 'publications', 'notices')),
  sport_id       uuid references sports(id) on delete set null,
  file_id        uuid references media(id) on delete set null,
  download_count int not null default 0,
  is_featured    boolean not null default false,
  is_published   boolean not null default true,
  published_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored
);
create index resources_search_idx on resources using gin (search);
create trigger resources_updated before update on resources for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Online application system
-- ---------------------------------------------------------------------------
create table forms (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  summary       text,
  category      text not null default 'General',
  instructions  text,
  eligibility   text,
  requirements  text,
  faq           jsonb not null default '[]',
  contact_note  text,
  definition    jsonb not null,                 -- see packages/shared/src/forms.ts
  opens_at      timestamptz,
  closes_at     timestamptz,
  is_active     boolean not null default false,
  notify_emails text[] not null default '{}',
  download_id   uuid references media(id) on delete set null,   -- printable version
  ref_prefix    text not null default 'APP',
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(instructions, '')), 'B')
  ) stored
);
create index forms_search_idx on forms using gin (search);
create trigger forms_updated before update on forms for each row execute function set_updated_at();

create sequence application_ref_seq;

create table applications (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,
  form_id         uuid not null references forms(id) on delete restrict,
  form_version    jsonb not null,               -- definition snapshot at submit time
  data            jsonb not null,
  applicant_name  text,
  applicant_email text,
  applicant_phone text,
  status          text not null default 'received'
                  check (status in ('received', 'under_review', 'needs_info', 'approved', 'rejected', 'withdrawn')),
  assigned_to     uuid references admin_users(id) on delete set null,
  ip_hash         text,
  user_agent      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index applications_form_idx on applications (form_id, created_at desc);
create index applications_status_idx on applications (status);
create index applications_search_idx on applications using gin (
  to_tsvector('simple', coalesce(reference, '') || ' ' || coalesce(applicant_name, '') || ' ' || coalesce(applicant_email, ''))
);
create trigger applications_updated before update on applications for each row execute function set_updated_at();

create table application_files (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  field_key      text not null,
  media_id       uuid not null references media(id) on delete cascade
);
create index application_files_app_idx on application_files (application_id);

create table application_notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  author_id      uuid references admin_users(id) on delete set null,
  author_name    text,
  body           text not null,
  kind           text not null default 'note' check (kind in ('note', 'status')),
  created_at     timestamptz not null default now()
);
create index application_notes_app_idx on application_notes (application_id, created_at);

-- ---------------------------------------------------------------------------
-- Contact enquiries
-- ---------------------------------------------------------------------------
create table contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text not null,
  message    text not null,
  is_read    boolean not null default false,
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index contact_messages_created_idx on contact_messages (created_at desc);

-- ---------------------------------------------------------------------------
-- Lightweight, privacy-friendly page-view counts (no cookies, no IPs stored).
-- ---------------------------------------------------------------------------
create table page_views (
  path  text not null,
  day   date not null default current_date,
  views int  not null default 1,
  primary key (path, day)
);
