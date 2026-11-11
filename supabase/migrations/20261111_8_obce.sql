-- =====================================================================
-- EliteBiker Ride, 11. 11. 2026
-- Mesto sa vyberá zo zoznamu obcí Slovenska (2 927 obcí a mestských častí so súradnicami),
-- aby ho každý napísal rovnako a poloha pre verejné jazdy v okolí bola presná.
-- Zdroj: Wikidata (obce s kódom LAU na Slovensku), načítané 11. 11. 2026 cez pg_net:
--   SELECT ?item ?name ?lau ?coord ?okres WHERE { ?item wdt:P17 wd:Q214; wdt:P782 ?lau; wdt:P625 ?coord.
--     ?item rdfs:label ?name. FILTER(lang(?name)="sk")
--     OPTIONAL { ?item wdt:P131 ?o. ?o rdfs:label ?okres. FILTER(lang(?okres)="sk") } }
-- =====================================================================

create or replace function private.fold(t text) returns text
language sql immutable set search_path = '' as
$$ select translate(lower(coalesce(t, '')), 'áäčďéěíĺľňóôöőŕřšťúůüűýž', 'aacdeeillnoooorrstuuuuyz') $$;

create table if not exists public.places (
  id    int primary key,
  name  text not null,
  okres text,
  lat   double precision not null,
  lng   double precision not null,
  key   text not null
);
alter table public.places enable row level security;
revoke all on public.places from anon, authenticated, public;
create policy "obce – čítanie" on public.places for select to authenticated using (true);
grant select on public.places to authenticated;
create index if not exists places_key_idx on public.places (key text_pattern_ops);

-- načítanie z odpovede Wikidata (pg_net), jednorazovo
create or replace function private.load_places(p_response bigint) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with b as (select json_array_elements((r.content::json) -> 'results' -> 'bindings') x from net._http_response r where r.id = p_response),
  r as (select x -> 'item' ->> 'value' item, x -> 'name' ->> 'value' name, x -> 'lau' ->> 'value' lau,
               x -> 'coord' ->> 'value' coord, x -> 'okres' ->> 'value' okres
        from b where length(x -> 'lau' ->> 'value') in (12, 8)),
  d as (select distinct on (item) item, name, lau,
          split_part(replace(replace(coord, 'Point(', ''), ')', ''), ' ', 2)::double precision lat,
          split_part(replace(replace(coord, 'Point(', ''), ')', ''), ' ', 1)::double precision lng,
          case when length(lau) = 8 then null else nullif(regexp_replace(coalesce(okres, ''), '^okres ', ''), '') end okres
        from r order by item, (okres like 'okres %') desc, okres)
  insert into public.places (id, name, okres, lat, lng, key)
  select row_number() over (order by lau), name, okres, round(lat::numeric, 4), round(lng::numeric, 4), private.fold(name) from d
  on conflict (id) do update set name = excluded.name, okres = excluded.okres, lat = excluded.lat, lng = excluded.lng, key = excluded.key;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function private.load_places(bigint) from public, anon, authenticated;

-- hľadanie počas písania: začiatok názvu alebo slova, bez ohľadu na diakritiku; okresné mestá prvé
create or replace function public.search_places(q text) returns table (id int, name text, okres text, lat double precision, lng double precision)
language sql stable security definer set search_path = '' as $$
  with k as (select private.fold(trim(q)) k)
  select p.id, p.name, p.okres, p.lat, p.lng
  from public.places p, k
  where char_length(k.k) >= 2 and (p.key like k.k || '%' or p.key like '% ' || k.k || '%' or p.key like '%-' || k.k || '%')
  order by (p.key like k.k || '%') desc, (p.name = p.okres or p.okres is null) desc, char_length(p.name), p.name
  limit 12;
$$;
revoke execute on function public.search_places(text) from public, anon;
grant execute on function public.search_places(text) to authenticated;
