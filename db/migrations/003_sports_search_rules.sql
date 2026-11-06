-- Make rule, scoring and equipment terms (Daya, Dhobji, Bacho, Thrimpon…) findable in site search.
drop index if exists sports_search_idx;
alter table sports drop column search;
alter table sports add column search tsvector generated always as (
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(tagline, '') || ' ' || coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(history, '') || ' ' || coalesce(how_to_play, '') || ' ' || coalesce(cultural_significance, '')), 'C') ||
  setweight(jsonb_to_tsvector('english', scoring || equipment, '["string"]'), 'B') ||
  setweight(jsonb_to_tsvector('english', rules, '["string"]'), 'D')
) stored;
create index sports_search_idx on sports using gin (search);
