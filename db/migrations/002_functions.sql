-- JSON helpers used by API queries so every endpoint returns media and sport
-- references in the same shape (see MediaRef in packages/shared/src/types.ts).

create or replace function media_json(mid uuid) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', id, 'alt', alt, 'width', width, 'height', height, 'caption', caption, 'credit', credit)
  from media where id = mid and visibility = 'public'
$$;

create or replace function media_list_json(ids uuid[]) returns jsonb
language sql stable as $$
  select coalesce(jsonb_agg(media_json(m.id) order by array_position(ids, m.id)), '[]'::jsonb)
  from media m where m.id = any(ids) and m.visibility = 'public'
$$;

create or replace function sport_json(sid uuid) returns jsonb
language sql stable as $$
  select jsonb_build_object('slug', slug, 'name', name) from sports where id = sid
$$;

create or replace function file_json(mid uuid) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', id, 'filename', filename, 'mime', mime, 'size', size) from media where id = mid
$$;

-- Prefix-matching tsquery from free text ("arch rul" -> 'arch':* & 'rul':*).
-- Built in SQL so user input never reaches to_tsquery syntax unescaped.
create or replace function prefix_tsquery(q text) returns tsquery
language sql immutable as $$
  select case
    when coalesce(trim(q), '') = '' then null
    else to_tsquery('english', string_agg(quote_literal(w) || ':*', ' & '))
  end
  from unnest(regexp_split_to_array(lower(regexp_replace(q, '[^[:alnum:][:space:]-]', ' ', 'g')), '\s+')) as w
  where length(w) > 0
$$;
