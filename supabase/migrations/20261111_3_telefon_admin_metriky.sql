-- =====================================================================
-- EliteBiker Ride, 11. 11. 2026
-- 1. Telefónne číslo: vidia ho len ľudia, ktorí idú na tú istú jazdu (kým jazda neskončí).
-- 2. Meranie používania: koľko ľudí appku otvorilo a kto bol aktívny v ktorý deň (len pre súhrnné čísla).
-- 3. Administrácia: len poradie a mená používateľov a súhrnné metriky, žiadne osobné údaje.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Telefón
-- ---------------------------------------------------------------------
create table if not exists public.user_phones (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  phone      text not null constraint user_phones_format check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);
alter table public.user_phones enable row level security;
revoke all on public.user_phones from anon, authenticated, public;
create policy "telefón – môj" on public.user_phones for select to authenticated using (user_id = (select auth.uid()));
create policy "telefón – môj (zápis)" on public.user_phones for insert to authenticated with check (user_id = (select auth.uid()));
create policy "telefón – môj (úprava)" on public.user_phones for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "telefón – môj (zmazanie)" on public.user_phones for delete to authenticated using (user_id = (select auth.uid()));
grant select (user_id, phone, updated_at), insert (user_id, phone), update (phone), delete on public.user_phones to authenticated;

create or replace function private.phone_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.user_id := coalesce(auth.uid(), new.user_id); else new.user_id := old.user_id; end if;
  new.updated_at := now();
  perform private.hit('phone', 20, interval '1 day');
  return new;
end $$;
create trigger phone_guard before insert or update on public.user_phones for each row execute function private.phone_guard();

-- čísla ostatných účastníkov jazdy, na ktorú idem; po skončení jazdy už nič
create or replace function public.ride_phones(p_ride uuid) returns table (user_id uuid, phone text)
language sql stable security definer set search_path = '' as $$
  select o.user_id, ph.phone
  from public.ride_participants me
  join public.rides r on r.id = me.ride_id and r.ends_at > now()
  join public.ride_participants o on o.ride_id = me.ride_id and o.user_id <> me.user_id
  join public.user_phones ph on ph.user_id = o.user_id
  where me.ride_id = p_ride and me.user_id = (select auth.uid());
$$;
revoke execute on function public.ride_phones(uuid) from public, anon;
grant execute on function public.ride_phones(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Meranie používania
--   visit_days: koľkokrát sa appka v daný deň otvorila (bez akejkoľvek identity)
--   activity_days: ktorý prihlásený používateľ bol v daný deň aktívny (na počty aktívnych, maže sa po 400 dňoch)
-- ---------------------------------------------------------------------
create table if not exists private.visit_days (
  day  date not null,
  kind text not null check (kind in ('open', 'invite', 'ride', 'login')),
  n    int  not null default 0,
  primary key (day, kind)
);
create table if not exists private.activity_days (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  platform   text not null default 'web' check (platform in ('ios', 'android', 'desktop', 'web')),
  standalone boolean not null default false,
  opens      int not null default 1,
  primary key (user_id, day)
);
create index if not exists activity_days_day_idx on private.activity_days (day);
revoke all on private.visit_days, private.activity_days from anon, authenticated, public;

create or replace function private.today() returns date language sql stable set search_path = '' as
$$ select (now() at time zone 'Europe/Bratislava')::date $$;

create or replace function public.track(p_kind text default 'open', p_platform text default null, p_standalone boolean default false)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  d  date := private.today();
  k  text := case when p_kind in ('open', 'invite', 'ride', 'login') then p_kind else 'open' end;
  pf text := case when p_platform in ('ios', 'android', 'desktop') then p_platform else 'web' end;
begin
  -- strop proti nafúknutiu čísel
  insert into private.visit_days as v (day, kind, n) values (d, k, 1)
  on conflict (day, kind) do update set n = v.n + 1 where v.n < 200000;
  if auth.uid() is not null then
    insert into private.activity_days as a (user_id, day, platform, standalone, opens) values (auth.uid(), d, pf, coalesce(p_standalone, false), 1)
    on conflict (user_id, day) do update set platform = excluded.platform, standalone = a.standalone or excluded.standalone, opens = least(a.opens + 1, 1000);
  end if;
end $$;
revoke execute on function public.track(text, text, boolean) from public;
grant execute on function public.track(text, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Administrácia bez osobných údajov
-- ---------------------------------------------------------------------
-- staré funkcie s osobnými údajmi už nič nevrátia (zmažú sa v ďalšej migrácii)
create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = '' as $$ begin perform private.assert_admin(); return null; end $$;
create or replace function public.admin_users(p_q text default '', p_sort text default 'new', p_limit int default 50, p_offset int default 0)
returns table (id uuid, display_name text, email text, avatar_url text, city text, age int, ig_username text, fb_name text,
               created_at timestamptz, last_sign_in_at timestamptz, joined int, hosted int, photos int,
               bonus int, spent int, earned int, balance int, total bigint)
language plpgsql stable security definer set search_path = '' as $$ begin perform private.assert_admin(); return; end $$;
create or replace function public.admin_user(p_user uuid) returns json
language plpgsql stable security definer set search_path = '' as $$ begin perform private.assert_admin(); return null; end $$;
create or replace function public.admin_rides() returns json
language plpgsql stable security definer set search_path = '' as $$ begin perform private.assert_admin(); return null; end $$;

-- poradie registrácie a meno, nič viac
create or replace function public.admin_names() returns table (poradie bigint, meno text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query
    select row_number() over (order by p.created_at, p.id), coalesce(nullif(trim(p.display_name), ''), 'Bez mena')
    from public.profiles p order by p.created_at, p.id;
end $$;

create or replace function public.admin_metrics(p_days int default 30) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  t date := private.today();
  nd int := least(greatest(coalesce(p_days, 30), 7), 180);
begin
  perform private.assert_admin();
  return json_build_object(
    'today', t,
    'since', (select least((select min(day) from private.activity_days), (select min(day) from private.visit_days))),
    'users', (select json_build_object(
        'total', count(*),
        'today', count(*) filter (where (p.created_at at time zone 'Europe/Bratislava')::date = t),
        'd7',    count(*) filter (where (p.created_at at time zone 'Europe/Bratislava')::date > t - 7),
        'd30',   count(*) filter (where (p.created_at at time zone 'Europe/Bratislava')::date > t - 30))
      from public.profiles p),
    'active', (select json_build_object(
        'today',      count(distinct a.user_id) filter (where a.day = t),
        'd7',         count(distinct a.user_id) filter (where a.day > t - 7),
        'd30',        count(distinct a.user_id),
        'app_d30',    count(distinct a.user_id) filter (where a.standalone),
        'ios_d30',    count(distinct a.user_id) filter (where a.platform = 'ios'),
        'android_d30',count(distinct a.user_id) filter (where a.platform = 'android'),
        'desktop_d30',count(distinct a.user_id) filter (where a.platform in ('desktop', 'web')),
        'returning_d7', count(distinct a.user_id) filter (where a.day > t - 7 and exists (
            select 1 from private.activity_days b where b.user_id = a.user_id and b.day <= t - 7)))
      from private.activity_days a where a.day > t - 30),
    'visits', (select json_build_object(
        'today',     coalesce(sum(v.n) filter (where v.kind = 'open' and v.day = t), 0),
        'd7',        coalesce(sum(v.n) filter (where v.kind = 'open' and v.day > t - 7), 0),
        'd30',       coalesce(sum(v.n) filter (where v.kind = 'open'), 0),
        'invite_d30',coalesce(sum(v.n) filter (where v.kind = 'invite'), 0),
        'ride_d30',  coalesce(sum(v.n) filter (where v.kind = 'ride'), 0),
        'login_d30', coalesce(sum(v.n) filter (where v.kind = 'login'), 0))
      from private.visit_days v where v.day > t - 30),
    'rides', json_build_object(
        'upcoming',        (select count(*) from public.rides r where r.ends_at > now()),
        'public_upcoming', (select count(*) from public.rides r where r.ends_at > now() and r.visibility = 'public'),
        'created_d7',      (select count(*) from public.rides r where r.created_at > now() - interval '7 days'),
        'created_d30',     (select count(*) from public.rides r where r.created_at > now() - interval '30 days'),
        'joins_d30',       (select count(*) from public.ride_participants rp join public.rides r on r.id = rp.ride_id
                             where rp.joined_at > now() - interval '30 days' and rp.user_id <> r.host),
        'avg_people_d30',  (select round(avg(c), 1) from (select count(*) c from public.ride_participants rp join public.rides r on r.id = rp.ride_id
                             where r.ends_at < now() and r.ends_at > now() - interval '30 days' group by r.id) x),
        'by_type_d30',     coalesce((select json_object_agg(x.type, x.c) from (select r.type, count(*) c from public.rides r
                             where r.created_at > now() - interval '30 days' group by r.type) x), '{}'::json)),
    'social', json_build_object(
        'friendships', (select count(*) from public.friendships f where f.status = 'accepted'),
        'pending',     (select count(*) from public.friendships f where f.status = 'pending'),
        'push_users',  (select count(distinct ps.user_id) from public.push_subscriptions ps),
        'invites_d30', (select count(*) from public.invites i where i.created_at > now() - interval '30 days')),
    'series', (select json_agg(json_build_object(
        'day',    g.d,
        'active', (select count(*) from private.activity_days a where a.day = g.d),
        'new',    (select count(*) from public.profiles p where (p.created_at at time zone 'Europe/Bratislava')::date = g.d),
        'opens',  (select coalesce(sum(v.n), 0) from private.visit_days v where v.day = g.d and v.kind = 'open'),
        'rides',  (select count(*) from public.rides r where (r.created_at at time zone 'Europe/Bratislava')::date = g.d)) order by g.d)
      from (select (t - k) d from generate_series(nd - 1, 0, -1) k) g));
end $$;

revoke execute on function public.admin_names(), public.admin_metrics(int) from public, anon;
grant execute on function public.admin_names(), public.admin_metrics(int) to authenticated;

-- export mojich údajov: aj telefón a počet aktívnych dní
create or replace function public.export_my_data() returns json
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Nie si prihlásený.' using errcode = '42501'; end if;
  perform private.hit('export', 5, interval '1 hour');
  return json_build_object(
    'exported_at', now(),
    'account', (select json_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at) from auth.users u where u.id = me),
    'profile', (select row_to_json(p) from public.profiles p where p.id = me),
    'phone', (select ph.phone from public.user_phones ph where ph.user_id = me),
    'location', (select row_to_json(l) from public.user_locations l where l.user_id = me),
    'friends', coalesce((select json_agg(json_build_object('name', op.display_name, 'status', f.status, 'since', f.created_at))
                         from public.friendships f join public.profiles op on op.id = case when f.requester = me then f.addressee else f.requester end
                         where me in (f.requester, f.addressee)), '[]'::json),
    'shortcuts', coalesce((select json_agg(json_build_object('name', s.name, 'members', cardinality(s.members))) from public.shortcuts s where s.owner = me), '[]'::json),
    'rides_hosted', coalesce((select json_agg(json_build_object('title', r.title, 'type', r.type, 'visibility', r.visibility, 'starts_at', r.starts_at,
                                                                 'meet', r.meet_label, 'note', r.note) order by r.starts_at desc)
                              from public.rides r where r.host = me), '[]'::json),
    'rides_joined', coalesce((select json_agg(json_build_object('title', r.title, 'starts_at', r.starts_at, 'joined_at', p.joined_at) order by r.starts_at desc)
                              from public.ride_participants p join public.rides r on r.id = p.ride_id where p.user_id = me and r.host <> me), '[]'::json),
    'messages', coalesce((select json_agg(json_build_object('ride', r.title, 'text', m.body, 'at', m.created_at) order by m.created_at)
                          from public.messages m join public.rides r on r.id = m.ride_id where m.user_id = me), '[]'::json),
    'photos', coalesce((select json_agg(json_build_object('ride', r.title, 'file', ph.path, 'at', ph.created_at))
                        from public.ride_photos ph join public.rides r on r.id = ph.ride_id where ph.user_id = me), '[]'::json),
    'points', (select json_build_object('earned', up.earned, 'balance', up.balance) from private.user_points up where up.user_id = me),
    'point_history', coalesce((select json_agg(json_build_object('kind', pa.kind, 'delta', pa.delta, 'reason', pa.reason, 'at', pa.created_at) order by pa.created_at)
                               from public.point_adjustments pa where pa.user_id = me), '[]'::json),
    'notification_choices', (select np.push from public.notify_prefs np where np.user_id = me),
    'devices_with_notifications', (select count(*) from public.push_subscriptions ps where ps.user_id = me),
    'active_days', (select count(*) from private.activity_days a where a.user_id = me));
end $$;
