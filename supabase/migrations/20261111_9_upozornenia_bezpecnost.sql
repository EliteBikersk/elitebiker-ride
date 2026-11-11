-- =====================================================================
-- EliteBiker Ride, 11. 11. 2026
-- 1. Vek sa už nezbiera: uložené hodnoty sa vymažú.
-- 2. Nové upozornenia: zmena a zrušenie jazdy, nová správa v chate, stav v deň jazdy
--    (som na mieste, meškám, nestihnem), pripomienka servisu (len okolie Považskej Bystrice).
--    Pripomienky pred jazdou (večer pred a 2 hodiny pred, s počasím) posiela funkcia weather-alerts.
-- 3. Nahlásenie a zablokovanie človeka alebo jazdy.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Vek
-- ---------------------------------------------------------------------
update public.profiles set age = null where age is not null;

-- ---------------------------------------------------------------------
-- 2. Druhy upozornení
-- ---------------------------------------------------------------------
create or replace function private.notify_kinds() returns text[] language sql immutable set search_path = '' as
$$ select array['friend_request','friend_accepted','ride_invite','ride_join','weather',
                'ride_change','reminder','chat','status','service']::text[] $$;
create or replace function private.pref_kind(k text) returns text language sql immutable set search_path = '' as
$$ select case k when 'friend_joined' then 'friend_accepted' when 'ride_cancel' then 'ride_change' else k end $$;
-- kto si už výber uložil, dostane nové druhy zapnuté (doteraz ich nemohol vypnúť)
update public.notify_prefs set push = (select array_agg(distinct x order by x) from unnest(push || array['ride_change','reminder','chat','status','service']) x);

-- záznamy, aby nič neodišlo dvakrát (číta a píše len server; ride_reminders je v public kvôli funkcii weather-alerts, bez práv pre používateľov)
create table if not exists public.ride_reminders (
  ride_id uuid not null references public.rides(id) on delete cascade,
  phase   text not null check (phase in ('eve', '2h')),
  sent_at timestamptz not null default now(),
  primary key (ride_id, phase)
);
create table if not exists private.chat_push (
  ride_id uuid not null references public.rides(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);
create table if not exists private.service_push (
  user_id uuid not null references public.profiles(id) on delete cascade,
  what    text not null,
  sent_on date not null default current_date,
  primary key (user_id, what)
);
alter table public.ride_reminders enable row level security;
revoke all on public.ride_reminders, private.chat_push, private.service_push from anon, authenticated, public;

-- ---------------------------------------------------------------------
-- 3. Blokovanie a nahlásenia
-- ---------------------------------------------------------------------
create table if not exists public.blocks (
  blocker    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  constraint blocks_not_self check (blocker <> blocked)
);
alter table public.blocks enable row level security;
revoke all on public.blocks from anon, authenticated, public;
create policy "blokovanie – moje" on public.blocks for select to authenticated using (blocker = (select auth.uid()));
create policy "blokovanie – pridať" on public.blocks for insert to authenticated with check (blocker = (select auth.uid()));
create policy "blokovanie – zrušiť" on public.blocks for delete to authenticated using (blocker = (select auth.uid()));
grant select, delete on public.blocks to authenticated;
grant insert (blocked) on public.blocks to authenticated;

create or replace function private.blocked_pair(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select a is not null and b is not null and exists (select 1 from public.blocks x
    where (x.blocker = a and x.blocked = b) or (x.blocker = b and x.blocked = a));
$$;

create or replace function private.block_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.blocker := coalesce(auth.uid(), new.blocker);
  new.created_at := now();
  perform private.hit('block', 30, interval '1 day');
  return new;
end $$;
create trigger block_guard before insert on public.blocks for each row execute function private.block_guard();

-- po zablokovaní: zruší sa priateľstvo a pozvánky medzi nimi
create or replace function private.block_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships f where (f.requester = new.blocker and f.addressee = new.blocked) or (f.requester = new.blocked and f.addressee = new.blocker);
  delete from public.ride_audience a where (a.user_id = new.blocker and a.invited_by = new.blocked) or (a.user_id = new.blocked and a.invited_by = new.blocker);
  return null;
end $$;
create trigger block_after after insert on public.blocks for each row execute function private.block_after();

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  reporter    uuid default auth.uid() references public.profiles(id) on delete set null,
  target_user uuid references public.profiles(id) on delete set null,
  ride_id     uuid references public.rides(id) on delete set null,
  ride_title  text,
  target_name text,
  reason      text not null check (reason in ('obsah', 'spam', 'obtazovanie', 'nebezpecne', 'ine')),
  note        text check (char_length(note) <= 500),
  status      text not null default 'open' check (status in ('open', 'done')),
  created_at  timestamptz not null default now(),
  constraint reports_target check (target_user is not null or ride_id is not null)
);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated, public;
create policy "nahlásenie – odoslať" on public.reports for insert to authenticated with check (reporter = (select auth.uid()));
grant insert (target_user, ride_id, reason, note) on public.reports to authenticated;

create or replace function private.report_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.reporter := auth.uid(); new.status := 'open'; new.created_at := now();
  new.note := nullif(left(trim(coalesce(new.note, '')), 500), '');
  if new.target_user = auth.uid() then raise exception 'Seba nahlásiť nemôžeš.' using errcode = '22023'; end if;
  if new.ride_id is not null then
    if not private.can_see_ride(new.ride_id) then raise exception 'Túto jazdu nevidíš.' using errcode = '22023'; end if;
    select r.title into new.ride_title from public.rides r where r.id = new.ride_id;
  end if;
  if new.target_user is not null then new.target_name := private.pname(new.target_user); end if;
  perform private.hit('report', 10, interval '1 day');
  return new;
end $$;
create trigger report_guard before insert on public.reports for each row execute function private.report_guard();

-- zablokovaní sa navzájom nenájdu, nepridajú, nevidia verejné jazdy, správy ani telefón
create or replace function private.friend_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and private.blocked_pair(new.requester, new.addressee) then
    raise exception 'Túto osobu nemôžeš pridať.' using errcode = '22023';
  end if;
  if new.status = 'pending' then perform private.hit('friend', 60, interval '1 day'); end if;
  new.created_at := now();
  return new;
end $$;

create or replace function private.can_see_ride(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rides x where x.id = r and (
            x.host = auth.uid()
         or (x.visibility = 'public' and x.ends_at > now() and private.near_me(x.meet_lat, x.meet_lng)
             and not private.blocked_pair(auth.uid(), x.host))))
      or exists (select 1 from public.ride_audience a where a.ride_id = r and a.user_id = auth.uid())
      or exists (select 1 from public.ride_participants p where p.ride_id = r and p.user_id = auth.uid());
$$;

alter policy "chat – čítanie" on public.messages
  using (private.is_participant(ride_id) and private.chat_open(ride_id) and not private.blocked_pair((select auth.uid()), user_id));

create or replace function public.search_profiles(q text) returns table (id uuid, display_name text, avatar_url text, city text, ig_username text)
language plpgsql security definer set search_path = '' as $$
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
    where p.id <> auth.uid() and p.display_name is not null and not private.blocked_pair(auth.uid(), p.id)
      and (extensions.unaccent(lower(p.display_name)) like '%' || s || '%'
        or coalesce(p.ig_username, '') like '%' || s || '%'
        or extensions.unaccent(lower(coalesce(p.fb_name, ''))) like '%' || s || '%')
    order by p.display_name
    limit 10;
end $$;

create or replace function public.ride_phones(p_ride uuid) returns table (user_id uuid, phone text)
language sql stable security definer set search_path = '' as $$
  select o.user_id, ph.phone
  from public.ride_participants me
  join public.rides r on r.id = me.ride_id and r.ends_at > now()
  join public.ride_participants o on o.ride_id = me.ride_id and o.user_id <> me.user_id
  join public.user_phones ph on ph.user_id = o.user_id
  where me.ride_id = p_ride and me.user_id = (select auth.uid()) and not private.blocked_pair(me.user_id, o.user_id);
$$;

-- pozývací odkaz od zablokovaného nič nespraví
create or replace function private.redeem_invite_for(p_user uuid, p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  i  invites;
  r  rides;
  me uuid := p_user;
begin
  if me is null or p_code is null then return json_build_object('ok', false, 'reason', 'expired'); end if;
  select * into i from invites where code = p_code;
  if not found or i.expires_at <= now() then
    return json_build_object('ok', false, 'reason', 'expired');
  end if;
  if i.inviter = me then
    return json_build_object('ok', false, 'reason', 'self', 'ride_id', i.ride_id);
  end if;
  if private.blocked_pair(i.inviter, me) then
    return json_build_object('ok', false, 'reason', 'expired');
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

create or replace function private.push_notify(p_user uuid, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = auth.uid() then return; end if;
  if auth.uid() is not null and private.blocked_pair(auth.uid(), p_user) then return; end if;
  if not private.wants(p_user, p_payload->>'kind') then return; end if;
  perform net.http_post(
    url := 'https://kfkbqamnblyitpugllps.supabase.co/functions/v1/notify',
    body := p_payload || jsonb_build_object('user_id', p_user),
    headers := jsonb_build_object('Content-Type', 'application/json',
                 'x-cron-key', (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'eb_cron_key')),
    timeout_milliseconds := 15000);
exception when others then
  raise warning 'push_notify: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------
-- 4. Zmena a zrušenie jazdy
-- ---------------------------------------------------------------------
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
    if old.ends_at < now() then
      raise exception 'Skončenú jazdu už nemôžeš upraviť.' using errcode = '22023';
    end if;
    if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at then
      if new.starts_at is distinct from old.starts_at and new.starts_at < now() - interval '15 minutes' then
        raise exception 'Jazda nemôže začínať v minulosti.' using errcode = '22023';
      end if;
      if new.starts_at > now() + interval '400 days' then
        raise exception 'Jazdu môžeš naplánovať najviac rok dopredu.' using errcode = '22023';
      end if;
      if new.ends_at - new.starts_at < interval '30 minutes' or new.ends_at - new.starts_at > interval '32 days' then
        raise exception 'Jazda musí trvať od 30 minút do 31 dní.' using errcode = '22023';
      end if;
    end if;
    if new.max_people is not null and new.max_people is distinct from old.max_people
       and new.max_people < (select count(*) from public.ride_participants p where p.ride_id = new.id) then
      raise exception 'Na jazdu sa už prihlásilo viac ľudí, ako je nový limit.' using errcode = '22023';
    end if;
    -- iný čas alebo miesto: počasie aj pripomienky sa vyhodnotia odznova
    if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at
       or new.meet_lat is distinct from old.meet_lat or new.meet_lng is distinct from old.meet_lng then
      delete from public.ride_weather_alerts w where w.ride_id = new.id;
    end if;
    if new.starts_at is distinct from old.starts_at then
      delete from public.ride_reminders x where x.ride_id = new.id;
    end if;
    if auth.uid() is not null then perform private.hit('ride_edit', 60, interval '1 hour'); end if;
  end if;
  if new.visibility = 'public' and (tg_op = 'INSERT' or old.visibility <> 'public')
     and (select count(*) from public.rides r where r.host = new.host and r.visibility = 'public' and r.ends_at > now() and r.id <> new.id) >= 5 then
    raise exception 'Naraz môžeš mať najviac 5 verejných jázd.' using errcode = 'P0001';
  end if;
  new.allow_invites := new.visibility <> 'private';
  return new;
end $$;

create or replace function private.ride_change_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t boolean; pl boolean; u uuid;
begin
  if new.ends_at < now() then return null; end if;
  t := new.starts_at is distinct from old.starts_at;
  pl := new.meet_lat is distinct from old.meet_lat or new.meet_lng is distinct from old.meet_lng or new.meet_label is distinct from old.meet_label;
  if not (t or pl) then return null; end if;
  for u in select p.user_id from public.ride_participants p where p.ride_id = new.id and p.user_id <> new.host loop
    perform private.push_notify(u, jsonb_build_object('kind', 'ride_change', 'actor', private.pname(new.host), 'ride_id', new.id,
      'title', new.title, 'starts_at', new.starts_at, 'meet', new.meet_label,
      'changed', case when t and pl then 'both' when t then 'time' else 'place' end));
  end loop;
  return null;
end $$;
create trigger ride_change_notify after update on public.rides for each row execute function private.ride_change_notify();

create or replace function private.ride_cancel_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if old.ends_at < now() then return old; end if;
  for u in select p.user_id from public.ride_participants p where p.ride_id = old.id and p.user_id <> old.host loop
    perform private.push_notify(u, jsonb_build_object('kind', 'ride_cancel', 'actor', private.pname(old.host),
      'title', old.title, 'starts_at', old.starts_at));
  end loop;
  return old;
end $$;
create trigger ride_cancel_notify before delete on public.rides for each row execute function private.ride_cancel_notify();

-- ---------------------------------------------------------------------
-- 5. Chat: nová správa (najviac jedno upozornenie za 3 minúty na jazdu a človeka) a stav v deň jazdy
-- ---------------------------------------------------------------------
alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages add constraint messages_kind check (kind in ('text', 'status'));

create or replace function private.message_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.hit('chat', 30, interval '1 minute');
  -- stav (som na mieste a pod.) vie zapísať len funkcia ride_status
  if coalesce(current_setting('eb.status', true), '') <> '1' then new.kind := 'text'; end if;
  new.created_at := now();
  return new;
end $$;

create or replace function private.chat_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.rides; u uuid;
begin
  if new.kind <> 'text' then return null; end if;
  select * into r from public.rides x where x.id = new.ride_id;
  if not found then return null; end if;
  for u in select p.user_id from public.ride_participants p where p.ride_id = new.ride_id and p.user_id <> new.user_id loop
    if exists (select 1 from private.chat_push c where c.ride_id = new.ride_id and c.user_id = u and c.sent_at > now() - interval '3 minutes') then continue; end if;
    if private.blocked_pair(new.user_id, u) then continue; end if;
    insert into private.chat_push as c (ride_id, user_id, sent_at) values (new.ride_id, u, now())
      on conflict (ride_id, user_id) do update set sent_at = now();
    perform private.push_notify(u, jsonb_build_object('kind', 'chat', 'actor', private.pname(new.user_id), 'ride_id', r.id,
      'title', r.title, 'text', left(new.body, 160)));
  end loop;
  return null;
end $$;
create trigger chat_notify after insert on public.messages for each row execute function private.chat_notify();

create or replace function public.ride_status(p_ride uuid, p_status text) returns json
language plpgsql security definer set search_path = '' as $$
declare r public.rides; me uuid := auth.uid(); body text; u uuid; left_ride boolean := false;
begin
  if me is null then raise exception 'Nie si prihlásený.' using errcode = '42501'; end if;
  if p_status not in ('here', 'late', 'cant') then raise exception 'Neznámy stav.' using errcode = '22023'; end if;
  select * into r from public.rides x where x.id = p_ride;
  if not found or not exists (select 1 from public.ride_participants p where p.ride_id = p_ride and p.user_id = me) then
    raise exception 'Na tejto jazde nie si.' using errcode = '42501';
  end if;
  if r.ends_at < now() or r.starts_at > now() + interval '1 day' then
    raise exception 'Stav sa dá poslať len v deň jazdy.' using errcode = '22023';
  end if;
  perform private.hit('status', 10, interval '1 hour');
  body := case p_status when 'here' then '📍 Som na mieste' when 'late' then '⏱️ Meškám asi 10 minút' else '❌ Nestihnem to, dnes bez mňa' end;
  perform set_config('eb.status', '1', true);
  insert into public.messages (ride_id, user_id, body, kind) values (p_ride, me, body, 'status');
  perform set_config('eb.status', '', true);
  for u in select p.user_id from public.ride_participants p where p.ride_id = p_ride and p.user_id <> me loop
    perform private.push_notify(u, jsonb_build_object('kind', 'status', 'status', p_status, 'actor', private.pname(me),
      'ride_id', r.id, 'title', r.title, 'starts_at', r.starts_at));
  end loop;
  if p_status = 'cant' and r.host <> me then
    delete from public.ride_participants p where p.ride_id = p_ride and p.user_id = me;
    left_ride := true;
  end if;
  return json_build_object('ok', true, 'left', left_ride);
end $$;
revoke execute on function public.ride_status(uuid, text) from public, anon;
grant execute on function public.ride_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Pripomienka servisu: len do 40 km od Považskej Bystrice, rok od pridania bicykla a pred sezónou (15. marca)
-- ---------------------------------------------------------------------
create or replace function private.service_reminders() returns int
language plpgsql security definer set search_path = '' as $$
declare x record; n int := 0; t date := (now() at time zone 'Europe/Bratislava')::date;
begin
  for x in
    select l.user_id, b.id bike_id, b.name, b.created_at
    from public.user_locations l
    join public.user_bikes b on b.user_id = l.user_id
    where private.km_between(l.lat, l.lng, 49.1167, 18.45) <= 40
  loop
    -- výročie bicykla (každý rok)
    if extract(month from x.created_at) = extract(month from t) and extract(day from x.created_at) = extract(day from t)
       and x.created_at::date < t then
      insert into private.service_push (user_id, what) values (x.user_id, 'rok-' || x.bike_id || '-' || extract(year from t)) on conflict do nothing;
      if found then
        perform private.push_notify(x.user_id, jsonb_build_object('kind', 'service', 'phase', 'year', 'bike', x.name));
        n := n + 1;
      end if;
    end if;
  end loop;
  if extract(month from t) = 3 and extract(day from t) = 15 then
    for x in
      select distinct on (l.user_id) l.user_id, b.name
      from public.user_locations l join public.user_bikes b on b.user_id = l.user_id
      where private.km_between(l.lat, l.lng, 49.1167, 18.45) <= 40
      order by l.user_id, b.created_at
    loop
      insert into private.service_push (user_id, what) values (x.user_id, 'sezona-' || extract(year from t)) on conflict do nothing;
      if found then
        perform private.push_notify(x.user_id, jsonb_build_object('kind', 'service', 'phase', 'season', 'bike', x.name));
        n := n + 1;
      end if;
    end loop;
  end if;
  return n;
end $$;
revoke execute on function private.service_reminders() from public, anon, authenticated;
select cron.schedule('eb-ride-service', '5 9 * * *', $$select private.service_reminders()$$);

-- ---------------------------------------------------------------------
-- 7. Administrácia: nahlásenia (bez osobných údajov toho, kto nahlásil)
-- ---------------------------------------------------------------------
create or replace function public.admin_reports() returns table (id bigint, created_at timestamptz, kind text, ride_id uuid, ride_title text,
  target_name text, reason text, note text, status text, ride_live boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  return query
    select r.id, r.created_at, case when r.ride_id is not null or r.ride_title is not null then 'ride' else 'user' end,
      r.ride_id, r.ride_title, r.target_name, r.reason, r.note, r.status,
      exists (select 1 from public.rides x where x.id = r.ride_id and x.ends_at > now())
    from public.reports r order by (r.status = 'open') desc, r.created_at desc limit 200;
end $$;
create or replace function public.admin_report_done(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_admin();
  update public.reports set status = 'done' where id = p_id;
end $$;
revoke execute on function public.admin_reports(), public.admin_report_done(bigint) from public, anon;
grant execute on function public.admin_reports(), public.admin_report_done(bigint) to authenticated;
