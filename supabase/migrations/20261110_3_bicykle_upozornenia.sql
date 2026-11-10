-- =====================================================================
-- EliteBiker Ride – bicykle v profile (katalóg z elitebiker.sk)
-- a upozornenia do mobilu na žiadosti, pozvánky a pridanie sa na jazdu.
-- Dá sa spustiť aj opakovane.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Katalóg bicyklov z elitebiker.sk (plní funkcia bike-catalog raz denne)
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
-- 2. Bicykle používateľov (zo sortimentu alebo ručne zadaný názov), max. 5
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
-- 3. Upozornenia do mobilu (web push) – žiadosti, pozvánky, pridanie sa
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
-- 4. Katalóg sa obnoví každý deň o 4:41
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
