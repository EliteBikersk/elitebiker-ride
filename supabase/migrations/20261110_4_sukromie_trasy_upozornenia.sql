-- =====================================================================
-- EliteBiker Ride – 10. 11. 2026 (večer)
-- Vek a mesto vidia len priatelia, farby trailov pri horských jazdách,
-- elektrobicykle v katalógu, stav doručenia upozornení na zariadeniach.
-- =====================================================================

-- 1. Vek a mesto len pre priateľov ------------------------------------
-- Stĺpce age a city sa z tabuľky profiles priamo nečítajú; vracia ich funkcia
-- profile_private() – sebe a priateľom (prijatá žiadosť), nikomu inému.
revoke select on public.profiles from authenticated, anon;
grant select (id, display_name, ig_username, fb_name, avatar_url, bike_types, created_at) on public.profiles to authenticated;

create or replace function public.profile_private(p_ids uuid[])
returns table(id uuid, age int, city text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.age, p.city
  from public.profiles p
  where auth.uid() is not null
    and p.id = any (p_ids[1:500])
    and (p.id = auth.uid() or private.are_friends(auth.uid(), p.id));
$$;
revoke all on function public.profile_private(uuid[]) from public, anon;
grant execute on function public.profile_private(uuid[]) to authenticated;

-- hľadanie: mesto len pri priateľoch
create or replace function public.search_profiles(q text)
returns table(id uuid, display_name text, avatar_url text, city text, ig_username text)
language plpgsql security definer set search_path = ''
as $$
declare s text;
begin
  if auth.uid() is null then return; end if;
  s := extensions.unaccent(lower(regexp_replace(ltrim(trim(coalesce(q, '')), '@'), '([%_\\])', '\\\1', 'g')));
  if char_length(s) < 3 then return; end if;
  perform private.hit('search', 120, interval '1 hour');
  return query
    select p.id, p.display_name, p.avatar_url,
      case when private.are_friends(auth.uid(), p.id) then p.city end, p.ig_username
    from public.profiles p
    where p.id <> auth.uid() and p.display_name is not null
      and (extensions.unaccent(lower(p.display_name)) like '%' || s || '%'
        or coalesce(p.ig_username, '') like '%' || s || '%'
        or extensions.unaccent(lower(coalesce(p.fb_name, ''))) like '%' || s || '%')
    order by p.display_name
    limit 10;
end $$;

-- 2. Farby trailov (horský bicykel) ------------------------------------
-- tempo a trasa sú len pri ceste a gravel; horský má farby trailov, e-bike a dirt nič
alter table public.rides alter column pace drop not null;
alter table public.rides add column if not exists trails text[];
do $$ begin
  alter table public.rides add constraint rides_trails_ok check (
    trails is null or (cardinality(trails) between 1 and 4 and trails <@ array['green','blue','red','black']::text[]));
exception when duplicate_object then null; end $$;
grant select (trails), insert (trails) on public.rides to authenticated;

-- 3. Elektrobicykle v katalógu -----------------------------------------
alter table public.catalog_bikes add column if not exists ebike boolean not null default false;
grant select (ebike) on public.catalog_bikes to authenticated;

-- 4. Upozornenia: zariadenie a stav posledného doručenia ----------------
alter table public.push_subscriptions add column if not exists device text;
alter table public.push_subscriptions add column if not exists last_status int;
alter table public.push_subscriptions add column if not exists last_error text;
alter table public.push_subscriptions add column if not exists last_at timestamptz;
do $$ begin
  alter table public.push_subscriptions add constraint push_device_len check (device is null or char_length(device) <= 80);
exception when duplicate_object then null; end $$;
grant select (device, last_status, last_error, last_at) on public.push_subscriptions to authenticated;

drop function if exists public.save_push_subscription(text, text, text);
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_device text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nie si prihlásený.'; end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'Neplatné zariadenie.'; end if;
  if p_p256dh !~ '^[A-Za-z0-9_-]{80,100}$' or p_auth !~ '^[A-Za-z0-9_-]{16,32}$' then raise exception 'Neplatné zariadenie.'; end if;
  perform private.hit('push_save', 30, interval '1 hour');
  insert into push_subscriptions (endpoint, user_id, p256dh, auth, device)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_device, 80))
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
    device = coalesce(excluded.device, push_subscriptions.device),
    created_at = case when push_subscriptions.p256dh = excluded.p256dh and push_subscriptions.user_id = excluded.user_id then push_subscriptions.created_at else now() end,
    last_status = case when push_subscriptions.p256dh = excluded.p256dh then push_subscriptions.last_status end,
    last_error = case when push_subscriptions.p256dh = excluded.p256dh then push_subscriptions.last_error end;
end $$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
