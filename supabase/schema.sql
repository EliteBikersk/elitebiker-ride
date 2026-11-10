-- =====================================================================
-- EliteBiker Ride – databáza (Supabase / PostgreSQL)
-- Spusti celé v Supabase: SQL Editor → New query → vlož → Run.
-- Skript sa dá spustiť aj opakovane (používa IF NOT EXISTS / OR REPLACE).
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
  type          text not null check (type in ('cesta','gravel','mtb','ebike')),
  title         text not null check (char_length(title) between 1 and 80),
  note          text check (char_length(note) <= 500),
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
  created_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists rides_starts_idx on public.rides(starts_at);

-- kto jazdu vidí (pozvaní)
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

-- hľadanie bikerov podľa mena, Instagramu alebo Facebooku (bez diakritiky)
create or replace function public.search_profiles(q text)
returns setof public.profiles
language sql stable security invoker set search_path = public, extensions as $$
  with t as (select unaccent(lower(regexp_replace(ltrim(trim(q), '@'), '([%_\\])', '\\\1', 'g'))) as s)
  select p.* from public.profiles p, t
  where auth.uid() is not null and p.id <> auth.uid() and char_length(t.s) >= 2
    and (unaccent(lower(coalesce(p.display_name, ''))) like '%' || t.s || '%'
      or coalesce(p.ig_username, '') like '%' || t.s || '%'
      or unaccent(lower(coalesce(p.fb_name, ''))) like '%' || t.s || '%')
  order by p.display_name nulls last
  limit 15;
$$;

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
  with check (user_id = auth.uid() and private.can_see_ride(ride_id) and private.chat_open(ride_id));
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
revoke execute on function public.search_profiles(text) from anon, public;
grant execute on function public.search_profiles(text) to authenticated;

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
    insert into ride_participants (ride_id, user_id) values (r.id, me) on conflict do nothing;
  end if;
  return json_build_object('ok', true, 'inviter', i.inviter, 'ride_id', i.ride_id);
end $$;

revoke execute on function public.invite_defaults() from anon, authenticated, public;
revoke execute on function public.invite_info(text) from public;
grant execute on function public.invite_info(text) to anon, authenticated;
revoke execute on function public.redeem_invite(text) from anon, public;
grant execute on function public.redeem_invite(text) to authenticated;
