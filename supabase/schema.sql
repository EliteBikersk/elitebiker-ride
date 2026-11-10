-- =====================================================================
-- EliteBiker Ride – databáza (Supabase / PostgreSQL)
-- Spusti celé v Supabase: SQL Editor → New query → vlož → Run.
-- Skript sa dá spustiť aj opakovane (používa IF NOT EXISTS / OR REPLACE).
-- Časť 12 sprísňuje a dopĺňa pravidlá z predchádzajúcich častí (verejné jazdy,
-- súkromie profilov, body, administrácia) – platí verzia z časti 12.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists unaccent with schema extensions;

-- pomocné funkcie pre pravidlá prístupu sú v schéme private (nie sú dostupné cez API)
create schema if not exists private;
revoke all on schema private from anon, public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- 1. Profily (verejné údaje bikera – vidia ich prihlásení používatelia)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  display_name     text check (char_length(display_name) <= 60),
  ig_username      text unique check (ig_username ~ '^[a-z0-9._]{1,30}$'),  -- Instagram (nepovinné)
  fb_name          text check (char_length(fb_name) <= 100),               -- Facebook meno alebo odkaz (nepovinné)
  avatar_url       text,
  age              int check (age between 14 and 99),
  city             text check (char_length(city) <= 60),
  bike_types       text[] not null default '{}',
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Priatelia a skratky (ako na Snapchate)
-- ---------------------------------------------------------------------
create table if not exists public.friendships (
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create table if not exists public.shortcuts (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 30),
  emoji      text not null default '⭐',
  members    uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Jazdy
-- ---------------------------------------------------------------------
create table if not exists public.rides (
  id            uuid primary key default gen_random_uuid(),
  host          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  type          text not null check (type in ('cesta','gravel','mtb','ebike','dirt')),
  title         text not null check (char_length(title) between 1 and 80),
  note          text check (char_length(note) <= 2000),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  meet_lat      double precision not null check (meet_lat between -90 and 90),
  meet_lng      double precision not null check (meet_lng between -180 and 180),
  meet_label    text check (char_length(meet_label) <= 160),
  route         jsonb,                 -- [[lat,lng],...] nakreslená trasa
  distance_km   numeric(6,1),
  elevation_m   int,
  pace          text not null default 'stredne' check (pace in ('pohoda','stredne','rychlo')),
  allow_invites boolean not null default false,
  audience_kind text not null default 'pick' check (audience_kind in ('pick','friends')),
  max_people    int check (max_people between 2 and 500),          -- nepovinný limit ľudí
  link_url      text check (char_length(link_url) <= 300 and link_url ~* '^https?://'),  -- trasa/akcia
  created_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists rides_starts_idx on public.rides(starts_at);

-- kto jazdu vidí (pozvaní)
-- doplnenie pre staršie databázy (Dirt/BMX, dlhší popis, limit ľudí, odkaz)
alter table public.rides add column if not exists max_people int check (max_people between 2 and 500);
alter table public.rides add column if not exists link_url text check (char_length(link_url) <= 300 and link_url ~* '^https?://');
alter table public.rides drop constraint if exists rides_type_check;
alter table public.rides add constraint rides_type_check check (type in ('cesta','gravel','mtb','ebike','dirt'));
alter table public.rides drop constraint if exists rides_note_check;
alter table public.rides add constraint rides_note_check check (char_length(note) <= 2000);

create table if not exists public.ride_audience (
  ride_id    uuid not null references public.rides(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);
-- kto ide
create table if not exists public.ride_participants (
  ride_id   uuid not null references public.rides(id) on delete cascade,
  user_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);
-- chat jazdy (maže sa po skončení jazdy)
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  ride_id    uuid not null references public.rides(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists messages_ride_idx on public.messages(ride_id, created_at);
-- fotky z jazdy (ostávajú aj po jazde)
create table if not exists public.ride_photos (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  path       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Pomocné funkcie pre pravidlá prístupu
-- ---------------------------------------------------------------------
create or replace function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a)));
$$;

create or replace function private.ride_host(r uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select host from rides where id = r;
$$;

create or replace function private.is_participant(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from ride_participants where ride_id = r and user_id = auth.uid());
$$;

create or replace function private.can_see_ride(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rides where id = r and host = auth.uid())
      or exists (select 1 from ride_audience where ride_id = r and user_id = auth.uid())
      or exists (select 1 from ride_participants where ride_id = r and user_id = auth.uid());
$$;

create or replace function private.chat_open(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rides where id = r and ends_at > now());
$$;

create or replace function private.can_invite(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rides where id = r and ends_at > now()
                 and (host = auth.uid() or (allow_invites and private.is_participant(r))));
$$;

create or replace function private.has_room(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (select max_people from rides where id = r) is null
      or (select count(*) from ride_participants where ride_id = r) < (select max_people from rides where id = r);
$$;

create or replace function private.try_uuid(t text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

-- ---------------------------------------------------------------------
-- 5. Triggery
-- ---------------------------------------------------------------------
-- nový používateľ → prázdny profil (meno, vek a kontakty doplní v aplikácii)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- organizátor je automaticky účastník
create or replace function public.handle_new_ride() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into ride_participants (ride_id, user_id) values (new.id, new.host) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_ride_created on public.rides;
create trigger on_ride_created after insert on public.rides
  for each row execute function public.handle_new_ride();

-- hľadanie bikerov je v časti 12 (search_profiles – len základné údaje, aspoň 3 znaky)

-- ---------------------------------------------------------------------
-- 6. Pravidlá prístupu (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.friendships       enable row level security;
alter table public.shortcuts         enable row level security;
alter table public.rides             enable row level security;
alter table public.ride_audience     enable row level security;
alter table public.ride_participants enable row level security;
alter table public.messages          enable row level security;
alter table public.ride_photos       enable row level security;

drop policy if exists "profily vidia prihlásení" on public.profiles;
create policy "profily vidia prihlásení" on public.profiles for select to authenticated using (true);
drop policy if exists "vlastný profil – úprava" on public.profiles;
create policy "vlastný profil – úprava" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "vlastný profil – vytvorenie" on public.profiles;
create policy "vlastný profil – vytvorenie" on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "priateľstvá – čítanie" on public.friendships;
create policy "priateľstvá – čítanie" on public.friendships for select to authenticated
  using (auth.uid() in (requester, addressee));
drop policy if exists "priateľstvá – žiadosť" on public.friendships;
create policy "priateľstvá – žiadosť" on public.friendships for insert to authenticated
  with check (requester = auth.uid() and status = 'pending');
drop policy if exists "priateľstvá – prijatie" on public.friendships;
create policy "priateľstvá – prijatie" on public.friendships for update to authenticated
  using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists "priateľstvá – zrušenie" on public.friendships;
create policy "priateľstvá – zrušenie" on public.friendships for delete to authenticated
  using (auth.uid() in (requester, addressee));

drop policy if exists "skratky – vlastné" on public.shortcuts;
create policy "skratky – vlastné" on public.shortcuts for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "jazdy – čítanie" on public.rides;
create policy "jazdy – čítanie" on public.rides for select to authenticated
  using (host = auth.uid() or private.can_see_ride(id));
drop policy if exists "jazdy – vytvorenie" on public.rides;
create policy "jazdy – vytvorenie" on public.rides for insert to authenticated with check (host = auth.uid());
drop policy if exists "jazdy – úprava" on public.rides;
create policy "jazdy – úprava" on public.rides for update to authenticated
  using (host = auth.uid()) with check (host = auth.uid());
drop policy if exists "jazdy – zrušenie" on public.rides;
create policy "jazdy – zrušenie" on public.rides for delete to authenticated using (host = auth.uid());

drop policy if exists "publikum – čítanie" on public.ride_audience;
create policy "publikum – čítanie" on public.ride_audience for select to authenticated
  using (user_id = auth.uid() or private.ride_host(ride_id) = auth.uid() or private.is_participant(ride_id));
drop policy if exists "publikum – pozvanie" on public.ride_audience;
create policy "publikum – pozvanie" on public.ride_audience for insert to authenticated
  with check (invited_by = auth.uid() and private.can_invite(ride_id) and private.are_friends(auth.uid(), user_id));
drop policy if exists "publikum – odobratie" on public.ride_audience;
create policy "publikum – odobratie" on public.ride_audience for delete to authenticated
  using (private.ride_host(ride_id) = auth.uid());

drop policy if exists "účastníci – čítanie" on public.ride_participants;
create policy "účastníci – čítanie" on public.ride_participants for select to authenticated
  using (private.can_see_ride(ride_id));
drop policy if exists "účastníci – pridám sa" on public.ride_participants;
create policy "účastníci – pridám sa" on public.ride_participants for insert to authenticated
  with check (user_id = auth.uid() and private.can_see_ride(ride_id) and private.chat_open(ride_id) and private.has_room(ride_id));
drop policy if exists "účastníci – odhlásim sa" on public.ride_participants;
create policy "účastníci – odhlásim sa" on public.ride_participants for delete to authenticated
  using (user_id = auth.uid() and private.ride_host(ride_id) <> auth.uid());

drop policy if exists "chat – čítanie" on public.messages;
create policy "chat – čítanie" on public.messages for select to authenticated
  using (private.is_participant(ride_id) and private.chat_open(ride_id));
drop policy if exists "chat – písanie" on public.messages;
create policy "chat – písanie" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and private.is_participant(ride_id) and private.chat_open(ride_id));

drop policy if exists "fotky – čítanie" on public.ride_photos;
create policy "fotky – čítanie" on public.ride_photos for select to authenticated
  using (user_id = auth.uid() or private.can_see_ride(ride_id));
drop policy if exists "fotky – pridanie" on public.ride_photos;
create policy "fotky – pridanie" on public.ride_photos for insert to authenticated
  with check (user_id = auth.uid() and private.is_participant(ride_id));
drop policy if exists "fotky – zmazanie" on public.ride_photos;
create policy "fotky – zmazanie" on public.ride_photos for delete to authenticated using (user_id = auth.uid());

-- práva: anonymný prístup nič, prihlásení len cez pravidlá vyššie, tokeny len server
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.friendships, public.shortcuts, public.rides,
  public.ride_audience, public.ride_participants, public.messages, public.ride_photos to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke execute on all functions in schema private from anon, public;
grant execute on all functions in schema private to authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.handle_new_ride() from anon, authenticated, public;

-- ---------------------------------------------------------------------
-- 7. Úložisko: profilovky (verejné) a fotky z jázd (súkromné)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('ride-photos', 'ride-photos', false) on conflict (id) do nothing;

drop policy if exists "profilovky – nahranie" on storage.objects;
create policy "profilovky – nahranie" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "profilovky – prepis" on storage.objects;
create policy "profilovky – prepis" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "profilovky – čítanie" on storage.objects;
create policy "profilovky – čítanie" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
drop policy if exists "fotky jázd – čítanie" on storage.objects;
create policy "fotky jázd – čítanie" on storage.objects for select to authenticated
  using (case when bucket_id = 'ride-photos' then private.can_see_ride(private.try_uuid((storage.foldername(name))[1])) else false end);
drop policy if exists "fotky jázd – nahranie" on storage.objects;
create policy "fotky jázd – nahranie" on storage.objects for insert to authenticated
  with check (case when bucket_id = 'ride-photos' then private.is_participant(private.try_uuid((storage.foldername(name))[1]))
              and (storage.foldername(name))[2] = auth.uid()::text else false end);
drop policy if exists "fotky jázd – zmazanie" on storage.objects;
create policy "fotky jázd – zmazanie" on storage.objects for delete to authenticated
  using (bucket_id = 'ride-photos' and (storage.foldername(name))[2] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 8. Živé aktualizácie (chat, kto sa pridal, nové jazdy, žiadosti)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['messages','ride_participants','ride_audience','rides','friendships','ride_photos'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
                   and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 9. Chat sa po skončení jazdy zmaže (každých 15 minút)
-- ---------------------------------------------------------------------
select cron.unschedule('eb-ride-chat-cleanup') where exists (select 1 from cron.job where jobname = 'eb-ride-chat-cleanup');
select cron.schedule('eb-ride-chat-cleanup', '*/15 * * * *',
  $$delete from public.messages m using public.rides r where m.ride_id = r.id and r.ends_at < now()$$);

-- ---------------------------------------------------------------------
-- 10. Pozývacie odkazy
create table if not exists public.invites (
  code       text primary key default translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/', '-_'),
  inviter    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  ride_id    uuid references public.rides(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists invites_inviter_idx on public.invites (inviter);
create index if not exists invites_ride_idx on public.invites (ride_id);

-- platnosť: odkaz na jazdu do konca jazdy, odkaz do partie 30 dní
create or replace function public.invite_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.inviter := auth.uid();
  new.created_at := now();
  if new.ride_id is not null then
    select ends_at into new.expires_at from rides where id = new.ride_id;
  else
    new.expires_at := now() + interval '30 days';
  end if;
  return new;
end $$;
drop trigger if exists on_invite_created on public.invites;
create trigger on_invite_created before insert on public.invites
  for each row execute function public.invite_defaults();

alter table public.invites enable row level security;
drop policy if exists "pozvánky – vlastné" on public.invites;
create policy "pozvánky – vlastné" on public.invites for select to authenticated using (inviter = auth.uid());
drop policy if exists "pozvánky – vytvorenie" on public.invites;
create policy "pozvánky – vytvorenie" on public.invites for insert to authenticated
  with check (inviter = auth.uid() and (ride_id is null or private.can_invite(ride_id)));
drop policy if exists "pozvánky – zmazanie" on public.invites;
create policy "pozvánky – zmazanie" on public.invites for delete to authenticated using (inviter = auth.uid());
revoke all on public.invites from anon;
grant select, insert, delete on public.invites to authenticated;

-- čo uvidí človek s odkazom ešte pred registráciou
create or replace function public.invite_info(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'inviter', json_build_object('name', p.display_name, 'avatar_url', p.avatar_url),
    'ride', case when r.id is null then null
                 else json_build_object('title', r.title, 'type', r.type, 'starts_at', r.starts_at) end,
    'valid', i.expires_at > now() and (i.ride_id is null or (r.id is not null and r.ends_at > now())))
  from invites i
  join profiles p on p.id = i.inviter
  left join rides r on r.id = i.ride_id
  where i.code = p_code;
$$;

-- uplatnenie odkazu po prihlásení
create or replace function public.redeem_invite(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  i  invites;
  r  rides;
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Nie si prihlásený.'; end if;
  select * into i from invites where code = p_code;
  if not found or i.expires_at <= now() then
    return json_build_object('ok', false, 'reason', 'expired');
  end if;
  if i.inviter = me then
    return json_build_object('ok', false, 'reason', 'self', 'ride_id', i.ride_id);
  end if;
  update friendships set status = 'accepted'
   where (requester = i.inviter and addressee = me) or (requester = me and addressee = i.inviter);
  if not found then
    insert into friendships (requester, addressee, status) values (i.inviter, me, 'accepted') on conflict do nothing;
  end if;
  if i.ride_id is not null then
    select * into r from rides where id = i.ride_id;
    if not found or r.ends_at <= now() then
      return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', null, 'reason', 'ride_ended');
    end if;
    insert into ride_audience (ride_id, user_id, invited_by) values (r.id, me, i.inviter) on conflict do nothing;
    if r.max_people is not null and (select count(*) from ride_participants where ride_id = r.id and user_id <> me) >= r.max_people then
      return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', r.id, 'reason', 'full');
    end if;
    insert into ride_participants (ride_id, user_id) values (r.id, me) on conflict do nothing;
  end if;
  return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', i.ride_id);
end $$;

revoke execute on function public.invite_defaults() from anon, authenticated, public;
revoke execute on function public.invite_info(text) from public;
grant execute on function public.invite_info(text) to anon, authenticated;
revoke execute on function public.redeem_invite(text) from anon, public;
grant execute on function public.redeem_invite(text) to authenticated;

-- ---------------------------------------------------------------------
-- 11. Počasie a upozornenia (web push)
-- ---------------------------------------------------------------------
create extension if not exists pg_net schema extensions;

-- tajné kľúče (VAPID, kľúč plánovača) sú zašifrované v Supabase Vault – pozri časť 13

-- predpovede z MET Norway (cache na 1 h)
create table if not exists public.weather_cache (
  key        text primary key,
  data       jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.weather_cache enable row level security;
revoke all on public.weather_cache from anon, authenticated;

-- zariadenia, ktoré chcú upozornenia
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  weather    boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "upozornenia – vlastné" on public.push_subscriptions;
create policy "upozornenia – vlastné" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
drop policy if exists "upozornenia – zrušenie" on public.push_subscriptions;
create policy "upozornenia – zrušenie" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
revoke all on public.push_subscriptions from anon;
grant select, delete on public.push_subscriptions to authenticated;

-- uloženie zariadenia (ak sa na ňom prihlási iný človek, prepíše sa)
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Nie si prihlásený.'; end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'Neplatné zariadenie.'; end if;
  insert into push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end $$;
revoke execute on function public.save_push_subscription(text, text, text) from anon, public;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ktoré jazdy už dostali upozornenie na počasie
create table if not exists public.ride_weather_alerts (
  ride_id  uuid primary key references public.rides(id) on delete cascade,
  summary  text,
  sent_at  timestamptz not null default now()
);
alter table public.ride_weather_alerts enable row level security;
revoke all on public.ride_weather_alerts from anon, authenticated;

-- ---------------------------------------------------------------------
-- 12. Verejné jazdy, poloha, body, administrácia, ochrana
-- ---------------------------------------------------------------------
-- ---------------------------------------------------------------------
-- 0. Základné práva
-- ---------------------------------------------------------------------
revoke all on schema private from anon, public;
revoke create on schema public from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. Obmedzovač pokusov (proti spamu a zneužitiu)
-- ---------------------------------------------------------------------
create table if not exists private.rate_limits (
  user_id uuid not null,
  action  text not null,
  bucket  timestamptz not null,
  hits    int not null default 0,
  primary key (user_id, action, bucket)
);
revoke all on private.rate_limits from anon, authenticated, public;

create or replace function private.hit(p_action text, p_max int, p_window interval) returns void
language plpgsql security definer set search_path = '' as $$
declare
  b timestamptz := date_bin(p_window, now(), timestamptz '2000-01-01');
  n int;
begin
  if auth.uid() is null then return; end if;            -- server a údržba bez limitu
  insert into private.rate_limits as r (user_id, action, bucket, hits) values (auth.uid(), p_action, b, 1)
  on conflict (user_id, action, bucket) do update set hits = r.hits + 1
  returning hits into n;
  if n > p_max then
    raise exception 'Príliš veľa pokusov naraz. Skús to o chvíľu.' using errcode = 'P0001', hint = 'rate_limit';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Jazdy: viditeľnosť (verejná / partia / len vybraní) a kontroly
-- ---------------------------------------------------------------------
alter table public.rides add column if not exists visibility text not null default 'friends';
alter table public.rides drop constraint if exists rides_visibility_check;
alter table public.rides add constraint rides_visibility_check check (visibility in ('public','friends','private'));
update public.rides set visibility = 'private' where visibility = 'friends' and not allow_invites;
alter table public.rides drop constraint if exists rides_route_check;
alter table public.rides add constraint rides_route_check
  check (route is null or (jsonb_typeof(route) = 'array' and jsonb_array_length(route) <= 2000));

create index if not exists rides_public_idx on public.rides (ends_at) where visibility = 'public';
create index if not exists rides_host_idx on public.rides (host);
create index if not exists ride_participants_user_idx on public.ride_participants (user_id);
create index if not exists ride_audience_user_idx on public.ride_audience (user_id);
create index if not exists ride_photos_ride_idx on public.ride_photos (ride_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee);

-- pri založení: čas nesmie byť v minulosti, rozumná dĺžka, limity proti spamu;
-- pri úprave sa dá meniť len viditeľnosť, názov, popis, limit ľudí a odkaz
create or replace function private.ride_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.host := coalesce(auth.uid(), new.host);
    new.created_at := now();
    if new.starts_at < now() - interval '15 minutes' then
      raise exception 'Jazda nemôže začínať v minulosti.' using errcode = '22023';
    end if;
    if new.starts_at > now() + interval '400 days' then
      raise exception 'Jazdu môžeš naplánovať najviac rok dopredu.' using errcode = '22023';
    end if;
    if new.ends_at - new.starts_at < interval '30 minutes' or new.ends_at - new.starts_at > interval '32 days' then
      raise exception 'Jazda musí trvať od 30 minút do 31 dní.' using errcode = '22023';
    end if;
    perform private.hit('ride', 15, interval '1 day');
  else
    new.id := old.id; new.host := old.host; new.created_at := old.created_at;
    new.starts_at := old.starts_at; new.ends_at := old.ends_at;
    new.meet_lat := old.meet_lat; new.meet_lng := old.meet_lng;
  end if;
  if new.visibility = 'public' and (tg_op = 'INSERT' or old.visibility <> 'public')
     and (select count(*) from public.rides r where r.host = new.host and r.visibility = 'public' and r.ends_at > now() and r.id <> new.id) >= 5 then
    raise exception 'Naraz môžeš mať najviac 5 verejných jázd.' using errcode = 'P0001';
  end if;
  new.allow_invites := new.visibility <> 'private';
  return new;
end $$;
drop trigger if exists ride_guard on public.rides;
create trigger ride_guard before insert or update on public.rides
  for each row execute function private.ride_guard();

-- limit ľudí platí aj pri súčasnom pridávaní viacerých ľudí
create or replace function private.participant_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare mx int;
begin
  new.joined_at := now();
  if exists (select 1 from public.ride_participants p where p.ride_id = new.ride_id and p.user_id = new.user_id) then
    return new;                                          -- už ide (on conflict do nothing)
  end if;
  select r.max_people into mx from public.rides r where r.id = new.ride_id for update;
  if mx is not null and (select count(*) from public.ride_participants p where p.ride_id = new.ride_id) >= mx then
    raise exception 'Jazda je už plná.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists participant_guard on public.ride_participants;
create trigger participant_guard before insert on public.ride_participants
  for each row execute function private.participant_guard();

-- ---------------------------------------------------------------------
-- 3. Poloha pre verejné jazdy (len približná, vidí ju iba majiteľ)
-- ---------------------------------------------------------------------
create table if not exists public.user_locations (
  user_id    uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  label      text check (char_length(label) <= 80),
  updated_at timestamptz not null default now()
);
create or replace function private.location_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.hit('location', 40, interval '1 hour');
  new.user_id := coalesce(auth.uid(), new.user_id);
  new.lat := round(new.lat::numeric, 2)::double precision;   -- ~1 km presnosť
  new.lng := round(new.lng::numeric, 2)::double precision;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists location_guard on public.user_locations;
create trigger location_guard before insert or update on public.user_locations
  for each row execute function private.location_guard();

alter table public.user_locations enable row level security;
drop policy if exists "poloha – vlastná" on public.user_locations;
create policy "poloha – vlastná" on public.user_locations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.user_locations from anon, public;
grant select, insert, update, delete on public.user_locations to authenticated;

create or replace function private.km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable parallel safe set search_path = '' as $$
  select 6371 * 2 * asin(least(1, sqrt(power(sin(radians(lat2 - lat1) / 2), 2)
       + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2))));
$$;

-- verejné jazdy vidno do 30 km od miesta, ktoré si človek nastavil
create or replace function private.near_me(p_lat double precision, p_lng double precision) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_locations l
                 where l.user_id = auth.uid() and private.km_between(l.lat, l.lng, p_lat, p_lng) <= 30);
$$;

-- ---------------------------------------------------------------------
-- 4. Kto čo vidí
-- ---------------------------------------------------------------------
create or replace function private.can_see_ride(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rides x where x.id = r and (
            x.host = auth.uid()
         or (x.visibility = 'public' and x.ends_at > now() and private.near_me(x.meet_lat, x.meet_lng))))
      or exists (select 1 from public.ride_audience a where a.ride_id = r and a.user_id = auth.uid())
      or exists (select 1 from public.ride_participants p where p.ride_id = r and p.user_id = auth.uid());
$$;

-- člen jazdy = organizátor, pozvaný alebo účastník (fotky vidia len členovia)
create or replace function private.is_member(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rides x where x.id = r and x.host = auth.uid())
      or exists (select 1 from public.ride_audience a where a.ride_id = r and a.user_id = auth.uid())
      or exists (select 1 from public.ride_participants p where p.ride_id = r and p.user_id = auth.uid());
$$;

-- pozývať môže organizátor; pri jazde pre partiu aj účastníci; pri verejnej každý, kto ju vidí
create or replace function private.can_invite(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rides x where x.id = r and x.ends_at > now() and (
            x.host = auth.uid()
         or (x.visibility = 'friends' and private.is_participant(r))
         or (x.visibility = 'public' and private.can_see_ride(r))));
$$;

-- administrátori (tabuľka nie je dostupná cez API)
create table if not exists private.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
revoke all on private.admins from anon, authenticated, public;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admins a where a.user_id = auth.uid());
$$;

-- admin musí byť prihlásený aj kódom z overovacej aplikácie (2FA, úroveň aal2)
create or replace function private.assert_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Tento účet nemá prístup do administrácie.' using errcode = '42501';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Potvrď prihlásenie kódom z overovacej aplikácie.' using errcode = '42501', hint = 'mfa';
  end if;
end $$;

-- profil vidíš len pri ľuďoch, s ktorými máš niečo spoločné (nie celý zoznam používateľov)
create or replace function private.can_see_profile(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p = auth.uid()
      or exists (select 1 from public.friendships f
                 where (f.requester = auth.uid() and f.addressee = p) or (f.requester = p and f.addressee = auth.uid()))
      or exists (select 1 from public.rides r where r.host = p and private.can_see_ride(r.id))
      or exists (select 1 from public.ride_participants rp where rp.user_id = p and private.can_see_ride(rp.ride_id))
      or exists (select 1 from public.ride_audience a where a.user_id = p
                 and (private.ride_host(a.ride_id) = auth.uid() or private.is_participant(a.ride_id)))
      or exists (select 1 from public.ride_photos ph where ph.user_id = p and private.is_member(ph.ride_id))
      or private.is_admin();
$$;

-- ---------------------------------------------------------------------
-- 5. Profily: kontroly a súkromie
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_bike_types_check;
alter table public.profiles add constraint profiles_bike_types_check
  check (bike_types <@ array['cesta','gravel','mtb','ebike','dirt']::text[] and cardinality(bike_types) <= 5);
alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or (char_length(avatar_url) <= 300
         and avatar_url ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/' || id::text || '/[A-Za-z0-9._-]+$')));
alter table public.shortcuts drop constraint if exists shortcuts_members_check;
alter table public.shortcuts add constraint shortcuts_members_check check (cardinality(members) <= 200);
alter table public.shortcuts drop constraint if exists shortcuts_emoji_check;
alter table public.shortcuts add constraint shortcuts_emoji_check check (char_length(emoji) <= 8);

create or replace function private.profile_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.hit('profile', 60, interval '1 hour');
  new.id := old.id; new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists profile_guard on public.profiles;
create trigger profile_guard before update on public.profiles
  for each row execute function private.profile_guard();

drop policy if exists "profily vidia prihlásení" on public.profiles;
drop policy if exists "profily – čítanie" on public.profiles;
create policy "profily – čítanie" on public.profiles for select to authenticated
  using (private.can_see_profile(id));

-- hľadanie: len základné údaje (meno, fotka, mesto, Instagram), aspoň 3 znaky, max. 10 výsledkov
drop function if exists public.search_profiles(text);
create or replace function public.search_profiles(q text)
returns table (id uuid, display_name text, avatar_url text, city text, ig_username text)
language plpgsql volatile security definer set search_path = '' as $$
declare s text;
begin
  if auth.uid() is null then return; end if;
  s := extensions.unaccent(lower(regexp_replace(ltrim(trim(coalesce(q, '')), '@'), '([%_\\])', '\\\1', 'g')));
  if char_length(s) < 3 then return; end if;
  perform private.hit('search', 120, interval '1 hour');
  return query
    select p.id, p.display_name, p.avatar_url, p.city, p.ig_username
    from public.profiles p
    where p.id <> auth.uid() and p.display_name is not null
      and (extensions.unaccent(lower(p.display_name)) like '%' || s || '%'
        or coalesce(p.ig_username, '') like '%' || s || '%'
        or extensions.unaccent(lower(coalesce(p.fb_name, ''))) like '%' || s || '%')
    order by p.display_name
    limit 10;
end $$;
revoke execute on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Limity: chat, fotky, žiadosti o priateľstvo, pozvánky
-- ---------------------------------------------------------------------
create or replace function private.message_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.hit('chat', 30, interval '1 minute');
  new.created_at := now();
  return new;
end $$;
drop trigger if exists message_guard on public.messages;
create trigger message_guard before insert on public.messages
  for each row execute function private.message_guard();

create or replace function private.photo_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.hit('photo', 60, interval '1 hour');
  if (select count(*) from public.ride_photos p where p.ride_id = new.ride_id and p.user_id = new.user_id) >= 30 then
    raise exception 'K jednej jazde môžeš pridať najviac 30 fotiek.' using errcode = 'P0001';
  end if;
  if new.path is null or new.path !~ ('^' || new.ride_id::text || '/' || new.user_id::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'Neplatná fotka.' using errcode = '22023';
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists photo_guard on public.ride_photos;
create trigger photo_guard before insert on public.ride_photos
  for each row execute function private.photo_guard();

create or replace function private.photo_quota_ok(p_ride uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from storage.objects o
          where o.bucket_id = 'ride-photos' and o.name like p_ride::text || '/' || auth.uid()::text || '/%') < 30;
$$;

create or replace function private.friend_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' then perform private.hit('friend', 60, interval '1 day'); end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists friend_guard on public.friendships;
create trigger friend_guard before insert on public.friendships
  for each row execute function private.friend_guard();

create or replace function public.invite_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.hit('invite', 60, interval '1 day');
  new.inviter := auth.uid();
  new.created_at := now();
  if new.ride_id is not null then
    select ends_at into new.expires_at from rides where id = new.ride_id;
  else
    new.expires_at := now() + interval '30 days';
  end if;
  return new;
end $$;
revoke execute on function public.invite_defaults() from anon, authenticated, public;

-- uplatnenie odkazu: pri jazde „len pre vybraných“ platí iba odkaz od organizátora
create or replace function public.redeem_invite(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  i  invites;
  r  rides;
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Nie si prihlásený.'; end if;
  perform private.hit('redeem', 30, interval '1 hour');
  select * into i from invites where code = p_code;
  if not found or i.expires_at <= now() then
    return json_build_object('ok', false, 'reason', 'expired');
  end if;
  if i.inviter = me then
    return json_build_object('ok', false, 'reason', 'self', 'ride_id', i.ride_id);
  end if;
  update friendships set status = 'accepted'
   where (requester = i.inviter and addressee = me) or (requester = me and addressee = i.inviter);
  if not found then
    insert into friendships (requester, addressee, status) values (i.inviter, me, 'accepted') on conflict do nothing;
  end if;
  if i.ride_id is not null then
    select * into r from rides where id = i.ride_id;
    if not found or r.ends_at <= now() then
      return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', null, 'reason', 'ride_ended');
    end if;
    if r.visibility = 'private' and i.inviter <> r.host then
      return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', null, 'reason', 'private');
    end if;
    insert into ride_audience (ride_id, user_id, invited_by) values (r.id, me, i.inviter) on conflict do nothing;
    if r.max_people is not null and (select count(*) from ride_participants where ride_id = r.id and user_id <> me) >= r.max_people then
      return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', r.id, 'reason', 'full');
    end if;
    insert into ride_participants (ride_id, user_id) values (r.id, me) on conflict do nothing;
  end if;
  return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', i.ride_id);
end $$;
revoke execute on function public.redeem_invite(text) from anon, public;
grant execute on function public.redeem_invite(text) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Pravidlá prístupu – úpravy
-- ---------------------------------------------------------------------
drop policy if exists "jazdy – zrušenie" on public.rides;
create policy "jazdy – zrušenie" on public.rides for delete to authenticated
  using (host = auth.uid() and ends_at > now());

drop policy if exists "fotky – čítanie" on public.ride_photos;
create policy "fotky – čítanie" on public.ride_photos for select to authenticated
  using (user_id = auth.uid() or private.is_member(ride_id));

drop policy if exists "fotky jázd – čítanie" on storage.objects;
create policy "fotky jázd – čítanie" on storage.objects for select to authenticated
  using (case when bucket_id = 'ride-photos' then private.is_member(private.try_uuid((storage.foldername(name))[1])) else false end);
drop policy if exists "fotky jázd – nahranie" on storage.objects;
create policy "fotky jázd – nahranie" on storage.objects for insert to authenticated
  with check (case when bucket_id = 'ride-photos' then private.is_participant(private.try_uuid((storage.foldername(name))[1]))
              and (storage.foldername(name))[2] = auth.uid()::text
              and private.photo_quota_ok(private.try_uuid((storage.foldername(name))[1])) else false end);

-- profilovky: zoznam súborov vidí len majiteľ (verejný odkaz na fotku funguje ďalej)
drop policy if exists "profilovky – čítanie" on storage.objects;
create policy "profilovky – čítanie" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "profilovky – zmazanie" on storage.objects;
create policy "profilovky – zmazanie" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "profilovky – prepis" on storage.objects;
create policy "profilovky – prepis" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

update storage.buckets set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'avatars';
update storage.buckets set file_size_limit = 6291456, allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'ride-photos';

-- len potrebné práva na stĺpce (aj keby niekto obišiel aplikáciu)
revoke all on public.profiles, public.friendships, public.shortcuts, public.rides, public.ride_audience,
  public.ride_participants, public.messages, public.ride_photos, public.invites from anon, public;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, ig_username, fb_name, avatar_url, age, city, bike_types) on public.profiles to authenticated;
revoke update on public.rides from authenticated;
grant select, insert, delete on public.rides to authenticated;
grant update (visibility, title, note, max_people, link_url) on public.rides to authenticated;
revoke update on public.friendships from authenticated;
grant select, insert, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;
revoke update, delete on public.messages from authenticated;
grant select, insert on public.messages to authenticated;
revoke update on public.ride_photos, public.ride_participants, public.ride_audience from authenticated;
grant select, insert, delete on public.ride_photos, public.ride_participants, public.ride_audience to authenticated;
revoke update on public.invites from authenticated;

-- ---------------------------------------------------------------------
-- 8. EB body – počítajú sa na serveri (nedajú sa podvrhnúť)
--    +20 spoločná jazda, +50 zorganizovaná jazda (aspoň 2 ľudia),
--    +10 fotka z jazdy (max. 5 na jazdu), + bonusy od EliteBikeru, − vydané odmeny
-- ---------------------------------------------------------------------
create table if not exists public.point_adjustments (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'bonus' check (kind in ('bonus','reward')),
  delta      int  not null check (delta <> 0 and delta between -100000 and 100000),
  reason     text not null check (char_length(reason) between 1 and 200),
  admin_id   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind <> 'reward' or delta < 0)
);
create index if not exists point_adjustments_user_idx on public.point_adjustments (user_id, created_at desc);
alter table public.point_adjustments enable row level security;
drop policy if exists "body – vlastné" on public.point_adjustments;
create policy "body – vlastné" on public.point_adjustments for select to authenticated using (user_id = auth.uid());
revoke all on public.point_adjustments from anon, authenticated, public;
grant select (id, user_id, kind, delta, reason, created_at) on public.point_adjustments to authenticated;

create or replace view private.user_points as
with done as (
  select r.id, r.host from public.rides r
  where r.ends_at < now() and (select count(*) from public.ride_participants p where p.ride_id = r.id) >= 2
), j as (
  select p.user_id, count(*)::int c from public.ride_participants p join done d on d.id = p.ride_id
  where p.user_id <> d.host group by p.user_id
), h as (
  select d.host as user_id, count(*)::int c from done d group by d.host
), f as (
  select x.user_id, sum(least(x.c, 5))::int c
  from (select ph.user_id, ph.ride_id, count(*) c from public.ride_photos ph join done d on d.id = ph.ride_id group by ph.user_id, ph.ride_id) x
  group by x.user_id
), a as (
  select pa.user_id,
         coalesce(sum(pa.delta) filter (where pa.kind = 'bonus'), 0)::int as bonus,
         coalesce(-sum(pa.delta) filter (where pa.kind = 'reward'), 0)::int as spent
  from public.point_adjustments pa group by pa.user_id
)
select pr.id as user_id,
       coalesce(j.c, 0) as joined, coalesce(h.c, 0) as hosted, coalesce(f.c, 0) as photos,
       coalesce(a.bonus, 0) as bonus, coalesce(a.spent, 0) as spent,
       coalesce(j.c, 0) * 20 + coalesce(h.c, 0) * 50 + coalesce(f.c, 0) * 10 + coalesce(a.bonus, 0) as earned,
       coalesce(j.c, 0) * 20 + coalesce(h.c, 0) * 50 + coalesce(f.c, 0) * 10 + coalesce(a.bonus, 0) - coalesce(a.spent, 0) as balance
from public.profiles pr
left join j on j.user_id = pr.id
left join h on h.user_id = pr.id
left join f on f.user_id = pr.id
left join a on a.user_id = pr.id;
revoke all on private.user_points from anon, authenticated, public;

create or replace function public.my_points() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'joined', up.joined, 'hosted', up.hosted, 'photos', up.photos, 'bonus', up.bonus,
    'spent', up.spent, 'earned', up.earned, 'balance', up.balance,
    'history', coalesce((select json_agg(json_build_object('kind', x.kind, 'delta', x.delta, 'reason', x.reason, 'at', x.created_at) order by x.created_at desc)
                         from (select * from public.point_adjustments pa where pa.user_id = auth.uid() order by pa.created_at desc limit 30) x), '[]'::json))
  from private.user_points up where up.user_id = auth.uid();
$$;
revoke execute on function public.my_points() from public, anon;
grant execute on function public.my_points() to authenticated;

-- ---------------------------------------------------------------------
-- 9. Administrácia (len admin s 2FA; každá zmena sa zapíše do záznamu)
-- ---------------------------------------------------------------------
create table if not exists private.admin_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid,
  action     text not null,
  target     uuid,
  detail     jsonb,
  created_at timestamptz not null default now()
);
revoke all on private.admin_log from anon, authenticated, public;

create or replace function public.admin_status() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('admin', private.is_admin(), 'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'));
$$;

create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return json_build_object(
    'users',          (select count(*) from public.profiles),
    'users_7d',       (select count(*) from auth.users u where u.created_at > now() - interval '7 days'),
    'active_30d',     (select count(*) from auth.users u where u.last_sign_in_at > now() - interval '30 days'),
    'rides_upcoming', (select count(*) from public.rides r where r.ends_at > now()),
    'public_upcoming',(select count(*) from public.rides r where r.ends_at > now() and r.visibility = 'public'),
    'rides_30d',      (select count(*) from public.rides r where r.ends_at < now() and r.ends_at > now() - interval '30 days'),
    'points_balance', (select coalesce(sum(up.balance), 0) from private.user_points up),
    'rewards_30d',    (select count(*) from public.point_adjustments pa where pa.kind = 'reward' and pa.created_at > now() - interval '30 days'));
end $$;

create or replace function public.admin_users(p_q text default '', p_sort text default 'new', p_limit int default 50, p_offset int default 0)
returns table (id uuid, display_name text, email text, avatar_url text, city text, age int, ig_username text, fb_name text,
               created_at timestamptz, last_sign_in_at timestamptz, joined int, hosted int, photos int,
               bonus int, spent int, earned int, balance int, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare s text;
begin
  perform private.assert_admin();
  s := extensions.unaccent(lower(regexp_replace(ltrim(trim(coalesce(p_q, '')), '@'), '([%_\\])', '\\\1', 'g')));
  return query
    select p.id, p.display_name, u.email::text, p.avatar_url, p.city, p.age, p.ig_username, p.fb_name,
           u.created_at, u.last_sign_in_at, up.joined, up.hosted, up.photos, up.bonus, up.spent, up.earned, up.balance,
           count(*) over ()
    from public.profiles p
    join auth.users u on u.id = p.id
    join private.user_points up on up.user_id = p.id
    where s = ''
       or extensions.unaccent(lower(coalesce(p.display_name, ''))) like '%' || s || '%'
       or lower(coalesce(u.email::text, '')) like '%' || s || '%'
       or coalesce(p.ig_username, '') like '%' || s || '%'
       or extensions.unaccent(lower(coalesce(p.fb_name, ''))) like '%' || s || '%'
       or extensions.unaccent(lower(coalesce(p.city, ''))) like '%' || s || '%'
       or replace(p.id::text, '-', '') like replace(s, '-', '') || '%'
    order by case when p_sort = 'points' then up.balance end desc nulls last,
             case when p_sort = 'name' then lower(coalesce(p.display_name, u.email::text)) end asc,
             u.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.admin_user(p_user uuid) returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return (
    select json_build_object(
      'id', p.id, 'display_name', p.display_name, 'email', u.email, 'avatar_url', p.avatar_url, 'city', p.city, 'age', p.age,
      'ig_username', p.ig_username, 'fb_name', p.fb_name, 'bike_types', p.bike_types,
      'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at, 'confirmed', u.email_confirmed_at is not null,
      'points', json_build_object('joined', up.joined, 'hosted', up.hosted, 'photos', up.photos, 'bonus', up.bonus,
                                  'spent', up.spent, 'earned', up.earned, 'balance', up.balance),
      'friends', (select count(*) from public.friendships f where f.status = 'accepted' and p.id in (f.requester, f.addressee)),
      'upcoming', (select count(*) from public.ride_participants rp join public.rides r on r.id = rp.ride_id where rp.user_id = p.id and r.ends_at > now()),
      'history', coalesce((select json_agg(json_build_object('id', pa.id, 'kind', pa.kind, 'delta', pa.delta, 'reason', pa.reason,
                                                            'at', pa.created_at, 'admin', ad.display_name) order by pa.created_at desc)
                           from public.point_adjustments pa left join public.profiles ad on ad.id = pa.admin_id
                           where pa.user_id = p.id), '[]'::json))
    from public.profiles p
    join auth.users u on u.id = p.id
    join private.user_points up on up.user_id = p.id
    where p.id = p_user);
end $$;

create or replace function public.admin_adjust_points(p_user uuid, p_delta int, p_reason text, p_kind text default 'bonus')
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  why text := trim(coalesce(p_reason, ''));
  d   int  := p_delta;
  bal int;
begin
  perform private.assert_admin();
  if p_kind not in ('bonus', 'reward') then raise exception 'Neznámy typ zmeny.' using errcode = '22023'; end if;
  if d is null or d = 0 or abs(d) > 100000 then raise exception 'Zadaj počet bodov (1 až 100 000).' using errcode = '22023'; end if;
  if char_length(why) < 1 or char_length(why) > 200 then raise exception 'Napíš dôvod (najviac 200 znakov).' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_user) then raise exception 'Používateľ neexistuje.' using errcode = '22023'; end if;
  if p_kind = 'reward' then d := -abs(d); end if;
  perform pg_advisory_xact_lock(hashtext('eb-points-' || p_user::text));
  select up.balance into bal from private.user_points up where up.user_id = p_user;
  if p_kind = 'reward' and bal + d < 0 then
    raise exception 'Na túto odmenu nemá dosť bodov (má %).', bal using errcode = 'P0001';
  end if;
  insert into public.point_adjustments (user_id, kind, delta, reason, admin_id) values (p_user, p_kind, d, why, auth.uid());
  insert into private.admin_log (admin_id, action, target, detail)
  values (auth.uid(), case when p_kind = 'reward' then 'reward' else 'points' end, p_user,
          jsonb_build_object('delta', d, 'reason', why, 'balance_before', bal));
  return (select json_build_object('earned', up.earned, 'balance', up.balance) from private.user_points up where up.user_id = p_user);
end $$;

create or replace function public.admin_rides() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return json_build_object(
    'counts', json_build_object(
      'public',  (select count(*) from public.rides r where r.ends_at > now() and r.visibility = 'public'),
      'friends', (select count(*) from public.rides r where r.ends_at > now() and r.visibility = 'friends'),
      'private', (select count(*) from public.rides r where r.ends_at > now() and r.visibility = 'private')),
    'public', coalesce((select json_agg(json_build_object(
        'id', r.id, 'title', r.title, 'type', r.type, 'starts_at', r.starts_at, 'ends_at', r.ends_at, 'meet_label', r.meet_label,
        'note', r.note, 'host', r.host, 'host_name', hp.display_name, 'max_people', r.max_people,
        'people', (select count(*) from public.ride_participants rp where rp.ride_id = r.id)) order by r.starts_at)
      from public.rides r left join public.profiles hp on hp.id = r.host
      where r.ends_at > now() and r.visibility = 'public'), '[]'::json));
end $$;

-- admin môže zrušiť len verejnú jazdu (napr. nevhodný obsah); súkromné jazdy nevidí
create or replace function public.admin_delete_ride(p_ride uuid, p_reason text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare r public.rides;
begin
  perform private.assert_admin();
  if char_length(trim(coalesce(p_reason, ''))) < 1 then raise exception 'Napíš dôvod.' using errcode = '22023'; end if;
  select * into r from public.rides x where x.id = p_ride;
  if not found then raise exception 'Jazda neexistuje.' using errcode = '22023'; end if;
  if r.visibility <> 'public' then raise exception 'Zrušiť môžeš len verejnú jazdu.' using errcode = '42501'; end if;
  insert into private.admin_log (admin_id, action, target, detail)
  values (auth.uid(), 'ride_delete', r.host, jsonb_build_object('ride', r.id, 'title', r.title, 'starts_at', r.starts_at, 'reason', left(trim(p_reason), 200)));
  delete from public.rides x where x.id = p_ride;
end $$;

create or replace function public.admin_log_list(p_limit int default 100) returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return coalesce((select json_agg(json_build_object('id', l.id, 'action', l.action, 'detail', l.detail, 'at', l.created_at,
                                                     'admin', ad.display_name, 'target', l.target, 'target_name', tp.display_name) order by l.created_at desc)
                   from (select * from private.admin_log x order by x.created_at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) l
                   left join public.profiles ad on ad.id = l.admin_id
                   left join public.profiles tp on tp.id = l.target), '[]'::json);
end $$;

-- ---------------------------------------------------------------------
-- 10. Moje údaje (GDPR – právo na prístup a prenosnosť)
-- ---------------------------------------------------------------------
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
    'devices_with_notifications', (select count(*) from public.push_subscriptions ps where ps.user_id = me));
end $$;

-- práva na nové funkcie
revoke execute on function public.admin_status(), public.admin_overview(), public.admin_users(text, text, int, int),
  public.admin_user(uuid), public.admin_adjust_points(uuid, int, text, text), public.admin_rides(),
  public.admin_delete_ride(uuid, text), public.admin_log_list(int), public.export_my_data() from public, anon;
grant execute on function public.admin_status(), public.admin_overview(), public.admin_users(text, text, int, int),
  public.admin_user(uuid), public.admin_adjust_points(uuid, int, text, text), public.admin_rides(),
  public.admin_delete_ride(uuid, text), public.admin_log_list(int), public.export_my_data() to authenticated;
revoke execute on all functions in schema private from anon, public;
grant execute on all functions in schema private to authenticated;
revoke all on all tables in schema private from anon, authenticated, public;

-- ---------------------------------------------------------------------
-- 11. Údržba: staré záznamy limitov a vypršané pozvánky
-- ---------------------------------------------------------------------
select cron.unschedule('eb-ride-housekeeping') where exists (select 1 from cron.job where jobname = 'eb-ride-housekeeping');
select cron.schedule('eb-ride-housekeeping', '23 3 * * *',
  $$with a as (delete from private.rate_limits where bucket < now() - interval '2 days')
    delete from public.invites where expires_at < now() - interval '30 days'$$);

-- ---------------------------------------------------------------------
-- 13. Tajné kľúče vo Vaulte
--   Pri novej inštalácii vlož kľúče takto (hodnoty si vygeneruj, nikam ich nepíš):
--   select vault.create_secret('<verejný VAPID>', 'eb_vapid_public');
--   select vault.create_secret('<súkromný VAPID>', 'eb_vapid_private');
--   select vault.create_secret('<náhodný reťazec>', 'eb_cron_key');
-- ---------------------------------------------------------------------
-- =====================================================================
-- @@vault-start
do $$
declare s record;
begin
  if to_regclass('public.app_secrets') is not null then
    for s in execute 'select name, value from public.app_secrets' loop
      if not exists (select 1 from vault.secrets v where v.name = 'eb_' || s.name) then
        perform vault.create_secret(s.value, 'eb_' || s.name, 'EliteBiker Ride – ' || s.name);
      end if;
    end loop;
  end if;
end $$;

-- čítať ich môže len server (service_role), nie prehliadač
create or replace function public.server_secrets() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_object_agg(substr(s.name, 4), s.decrypted_secret), '{}'::json)
  from vault.decrypted_secrets s where s.name like 'eb\_%';
$$;
revoke execute on function public.server_secrets() from public, anon, authenticated;
grant execute on function public.server_secrets() to service_role;

-- plánovač berie kľúč z Vaultu
select cron.unschedule('eb-ride-weather-alerts') where exists (select 1 from cron.job where jobname = 'eb-ride-weather-alerts');
select cron.schedule('eb-ride-weather-alerts', '7 * * * *', $$
  select net.http_post(
    url := 'https://kfkbqamnblyitpugllps.supabase.co/functions/v1/weather-alerts',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'eb_cron_key')),
    body := '{"cron":true}'::jsonb,
    timeout_milliseconds := 30000);
$$);
-- @@vault-end


-- ---------------------------------------------------------------------
-- 14. Katalóg bicyklov z elitebiker.sk (plní funkcia bike-catalog raz denne)
-- ---------------------------------------------------------------------
create table if not exists public.catalog_bikes (
  id         int primary key,                       -- ID produktu v Shoptete
  name       text not null check (char_length(name) between 2 and 160),
  brand      text,
  url        text not null check (url ~ '^https://www\.elitebiker\.sk/'),
  image      text check (image is null or image ~ '^https://cdn\.myshoptet\.com/'),
  updated_at timestamptz not null default now()
);
alter table public.catalog_bikes enable row level security;
drop policy if exists "katalóg – čítanie" on public.catalog_bikes;
create policy "katalóg – čítanie" on public.catalog_bikes for select to authenticated using (true);
revoke all on public.catalog_bikes from anon, authenticated, public;
grant select on public.catalog_bikes to authenticated;

-- ---------------------------------------------------------------------
-- 15. Bicykle používateľov (zo sortimentu alebo ručne zadaný názov), max. 5
-- ---------------------------------------------------------------------
create table if not exists public.user_bikes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 160),
  catalog_id int,
  url        text check (url is null or url ~ '^https://www\.elitebiker\.sk/'),
  image      text check (image is null or image ~ '^https://cdn\.myshoptet\.com/'),
  created_at timestamptz not null default now()
);
create index if not exists user_bikes_user_idx on public.user_bikes (user_id);

create or replace function private.bike_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.catalog_bikes;
begin
  perform private.hit('bike', 30, interval '1 hour');
  new.user_id := coalesce(auth.uid(), new.user_id);
  new.created_at := now();
  if (select count(*) from public.user_bikes b where b.user_id = new.user_id) >= 5 then
    raise exception 'Môžeš mať najviac 5 bicyklov.' using errcode = 'P0001';
  end if;
  new.name := left(trim(regexp_replace(coalesce(new.name, ''), '\s+', ' ', 'g')), 160);
  -- odkaz a fotku berieme len z katalógu e-shopu, nie od používateľa
  new.url := null; new.image := null;
  if new.catalog_id is not null then
    select * into c from public.catalog_bikes x where x.id = new.catalog_id;
    if found then new.name := c.name; new.url := c.url; new.image := c.image;
    else new.catalog_id := null; end if;
  end if;
  if char_length(new.name) < 2 then raise exception 'Napíš názov bicykla.' using errcode = '22023'; end if;
  return new;
end $$;
drop trigger if exists bike_guard on public.user_bikes;
create trigger bike_guard before insert on public.user_bikes
  for each row execute function private.bike_guard();

alter table public.user_bikes enable row level security;
drop policy if exists "bicykle – čítanie" on public.user_bikes;
create policy "bicykle – čítanie" on public.user_bikes for select to authenticated
  using (user_id = auth.uid() or private.can_see_profile(user_id));
drop policy if exists "bicykle – pridanie" on public.user_bikes;
create policy "bicykle – pridanie" on public.user_bikes for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "bicykle – zmazanie" on public.user_bikes;
create policy "bicykle – zmazanie" on public.user_bikes for delete to authenticated
  using (user_id = auth.uid());
revoke all on public.user_bikes from anon, authenticated, public;
grant select, insert, delete on public.user_bikes to authenticated;

-- ---------------------------------------------------------------------
-- 16. Upozornenia do mobilu (web push) – žiadosti, pozvánky, pridanie sa
-- ---------------------------------------------------------------------
alter table public.push_subscriptions add column if not exists social boolean not null default true;

create or replace function private.pname(u uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(trim(p.display_name), ''), 'Biker') from public.profiles p where p.id = u;
$$;

-- pošle požiadavku na funkciu notify (odíde až po potvrdení transakcie);
-- sebe nič neposielame a chyba upozornenia nikdy nezastaví samotnú akciu
create or replace function private.push_notify(p_user uuid, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = auth.uid() then return; end if;
  if not exists (select 1 from public.push_subscriptions s where s.user_id = p_user and s.social) then return; end if;
  perform net.http_post(
    url := 'https://kfkbqamnblyitpugllps.supabase.co/functions/v1/notify',
    body := p_payload || jsonb_build_object('user_id', p_user),
    headers := jsonb_build_object('Content-Type', 'application/json',
                 'x-cron-key', (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'eb_cron_key')),
    timeout_milliseconds := 15000);
exception when others then
  raise warning 'push_notify: %', sqlerrm;
end $$;

create or replace function private.friend_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me uuid := coalesce(auth.uid(), new.addressee); other uuid;
begin
  other := case when me = new.requester then new.addressee else new.requester end;
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform private.push_notify(new.addressee, jsonb_build_object('kind', 'friend_request', 'actor', private.pname(new.requester)));
    elsif new.status = 'accepted' then
      perform private.push_notify(other, jsonb_build_object('kind', 'friend_joined', 'actor', private.pname(me)));
    end if;
  elsif old.status = 'pending' and new.status = 'accepted' then
    perform private.push_notify(other, jsonb_build_object('kind', 'friend_accepted', 'actor', private.pname(me)));
  end if;
  return null;
end $$;
drop trigger if exists friend_notify on public.friendships;
create trigger friend_notify after insert or update of status on public.friendships
  for each row execute function private.friend_notify();

create or replace function private.audience_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.rides;
begin
  if new.user_id = auth.uid() then return null; end if;
  select * into r from public.rides x where x.id = new.ride_id;
  if not found or r.ends_at < now() then return null; end if;
  perform private.push_notify(new.user_id, jsonb_build_object('kind', 'ride_invite', 'actor', private.pname(coalesce(new.invited_by, r.host)),
    'ride_id', r.id, 'title', r.title, 'starts_at', r.starts_at));
  return null;
end $$;
drop trigger if exists audience_notify on public.ride_audience;
create trigger audience_notify after insert on public.ride_audience
  for each row execute function private.audience_notify();

create or replace function private.join_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.rides;
begin
  if new.user_id is distinct from auth.uid() then return null; end if;
  select * into r from public.rides x where x.id = new.ride_id;
  if not found or new.user_id = r.host or r.ends_at < now() then return null; end if;
  perform private.push_notify(r.host, jsonb_build_object('kind', 'ride_join', 'actor', private.pname(new.user_id),
    'ride_id', r.id, 'title', r.title, 'starts_at', r.starts_at));
  return null;
end $$;
drop trigger if exists join_notify on public.ride_participants;
create trigger join_notify after insert on public.ride_participants
  for each row execute function private.join_notify();

revoke execute on all functions in schema private from anon, public;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------
-- 17. Katalóg sa obnoví každý deň o 4:41
-- ---------------------------------------------------------------------
-- @@vault-start
select cron.unschedule('eb-ride-bike-catalog') where exists (select 1 from cron.job where jobname = 'eb-ride-bike-catalog');
select cron.schedule('eb-ride-bike-catalog', '41 4 * * *', $$
  select net.http_post(
    url := 'https://kfkbqamnblyitpugllps.supabase.co/functions/v1/bike-catalog',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'eb_cron_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$$);
-- @@vault-end


-- 18. Vek a mesto len pre priateľov ------------------------------------
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

-- 19. Farby trailov (horský bicykel) ------------------------------------
-- tempo a trasa sú len pri ceste a gravel; horský má farby trailov, e-bike a dirt nič
alter table public.rides alter column pace drop not null;
alter table public.rides add column if not exists trails text[];
do $$ begin
  alter table public.rides add constraint rides_trails_ok check (
    trails is null or (cardinality(trails) between 1 and 4 and trails <@ array['green','blue','red','black']::text[]));
exception when duplicate_object then null; end $$;
grant select (trails), insert (trails) on public.rides to authenticated;

-- 20. Elektrobicykle v katalógu -----------------------------------------
alter table public.catalog_bikes add column if not exists ebike boolean not null default false;
grant select (ebike) on public.catalog_bikes to authenticated;

-- 21. Upozornenia: zariadenie a stav posledného doručenia ----------------
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

-- administrátor (doplň svoje ID z Authentication → Users):
-- insert into private.admins (user_id) values ('<uuid>');
