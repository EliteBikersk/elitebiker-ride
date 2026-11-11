-- =====================================================================
-- EliteBiker Ride, 11. 11. 2026 popoludní
-- 1. „Mám čas“: dnes alebo zajtra od istej hodiny, vidia len priatelia a dostanú upozornenie.
-- 2. „Možno“ pri jazde: nezaberá miesto, nemá chat ani telefóny, dostane upozornenie o zmene.
-- 3. Oficiálne jazdy EliteBiker: založí len admin, vidno ich do 60 km, ľudia v okolí dostanú upozornenie.
-- Bez mazania (žiadne DROP), aby sa dala spustiť bez schvaľovania.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Nové druhy upozornení: free (kamoš má čas), official (jazda EliteBiker v okolí)
-- ---------------------------------------------------------------------
create or replace function private.notify_kinds() returns text[] language sql immutable set search_path = '' as
$$ select array['friend_request','friend_accepted','ride_invite','ride_join','weather',
                'ride_change','reminder','chat','status','service','free','official']::text[] $$;
update public.notify_prefs set push = (select array_agg(distinct x order by x) from unnest(push || array['free','official']) x);

-- ---------------------------------------------------------------------
-- 1. Mám čas
-- ---------------------------------------------------------------------
create table if not exists public.availability (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  from_time  time,
  note       text check (char_length(note) <= 80),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.availability enable row level security;
revoke all on public.availability from anon, authenticated, public;
create policy "mám čas – čítanie" on public.availability for select to authenticated
  using (user_id = (select auth.uid()) or private.are_friends((select auth.uid()), user_id));
create policy "mám čas – zrušenie" on public.availability for delete to authenticated
  using (user_id = (select auth.uid()));
grant select, delete on public.availability to authenticated;
create index if not exists availability_day_idx on public.availability(day);

-- zápis len cez funkciu: deň počíta server (Bratislava), priatelia dostanú upozornenie len pri novom dni
create or replace function public.set_availability(p_day text, p_from text default null, p_note text default null) returns json
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); d date; t time; n text; fresh boolean; u uuid;
begin
  if me is null then raise exception 'Nie si prihlásený.' using errcode = '42501'; end if;
  if p_day not in ('today', 'tomorrow') then raise exception 'Vyber dnes alebo zajtra.' using errcode = '22023'; end if;
  d := (now() at time zone 'Europe/Bratislava')::date + case when p_day = 'tomorrow' then 1 else 0 end;
  if nullif(trim(coalesce(p_from, '')), '') is not null then
    begin t := p_from::time; exception when others then raise exception 'Čas nevyzerá správne.' using errcode = '22023'; end;
  end if;
  n := nullif(left(regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g'), 80), '');
  perform private.hit('free', 20, interval '1 day');
  fresh := not exists (select 1 from public.availability a where a.user_id = me and a.day = d);
  insert into public.availability as a (user_id, day, from_time, note) values (me, d, t, n)
    on conflict (user_id, day) do update set from_time = excluded.from_time, note = excluded.note;
  if fresh then
    for u in select case when f.requester = me then f.addressee else f.requester end from public.friendships f
             where f.status = 'accepted' and (f.requester = me or f.addressee = me) loop
      perform private.push_notify(u, jsonb_build_object('kind', 'free', 'actor', private.pname(me), 'day', p_day,
        'from', to_char(t, 'HH24:MI'), 'note', n));
    end loop;
  end if;
  return json_build_object('ok', true, 'day', d, 'notified', fresh);
end $$;
revoke execute on function public.set_availability(text, text, text) from public, anon;
grant execute on function public.set_availability(text, text, text) to authenticated;

-- staré dni sa mažú každú noc
select cron.schedule('eb-ride-free-cleanup', '17 3 * * *',
  $$delete from public.availability where day < (now() at time zone 'Europe/Bratislava')::date$$);

-- ---------------------------------------------------------------------
-- 2. Možno
-- ---------------------------------------------------------------------
create table if not exists public.ride_maybe (
  ride_id    uuid not null references public.rides(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);
alter table public.ride_maybe enable row level security;
revoke all on public.ride_maybe from anon, authenticated, public;
create policy "možno – čítanie" on public.ride_maybe for select to authenticated
  using (private.can_see_ride(ride_id));
create policy "možno – pridať" on public.ride_maybe for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_see_ride(ride_id) and private.chat_open(ride_id)
              and not private.is_participant(ride_id));
create policy "možno – zrušiť" on public.ride_maybe for delete to authenticated
  using (user_id = (select auth.uid()));
grant select, delete on public.ride_maybe to authenticated;
grant insert (ride_id) on public.ride_maybe to authenticated;
create index if not exists ride_maybe_user_idx on public.ride_maybe(user_id);

create or replace function private.maybe_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := coalesce(auth.uid(), new.user_id);
  new.created_at := now();
  perform private.hit('maybe', 60, interval '1 day');
  return new;
end $$;
create trigger maybe_guard before insert on public.ride_maybe for each row execute function private.maybe_guard();

-- kto sa pridá k jazde, už nie je „možno“
create or replace function private.maybe_after_join() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.ride_maybe m where m.ride_id = new.ride_id and m.user_id = new.user_id;
  return null;
end $$;
create trigger maybe_after_join after insert on public.ride_participants for each row execute function private.maybe_after_join();

-- profil „možno“ vidia tí, čo vidia jazdu (ako pri účastníkoch)
create or replace function private.can_see_profile(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p = auth.uid()
      or exists (select 1 from public.friendships f
                 where (f.requester = auth.uid() and f.addressee = p) or (f.requester = p and f.addressee = auth.uid()))
      or exists (select 1 from public.rides r where r.host = p and private.can_see_ride(r.id))
      or exists (select 1 from public.ride_participants rp where rp.user_id = p and private.can_see_ride(rp.ride_id))
      or exists (select 1 from public.ride_maybe m where m.user_id = p and private.can_see_ride(m.ride_id))
      or exists (select 1 from public.ride_audience a where a.user_id = p
                 and (private.ride_host(a.ride_id) = auth.uid() or private.is_participant(a.ride_id)))
      or exists (select 1 from public.ride_photos ph where ph.user_id = p and private.is_member(ph.ride_id))
      or private.is_admin();
$$;

-- zmena a zrušenie jazdy: upozornenie aj tým, čo dali „možno“
create or replace function private.ride_change_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t boolean; pl boolean; u uuid;
begin
  if new.ends_at < now() then return null; end if;
  t := new.starts_at is distinct from old.starts_at;
  pl := new.meet_lat is distinct from old.meet_lat or new.meet_lng is distinct from old.meet_lng or new.meet_label is distinct from old.meet_label;
  if not (t or pl) then return null; end if;
  for u in select p.user_id from public.ride_participants p where p.ride_id = new.id and p.user_id <> new.host
           union select m.user_id from public.ride_maybe m where m.ride_id = new.id and m.user_id <> new.host loop
    perform private.push_notify(u, jsonb_build_object('kind', 'ride_change', 'actor', private.pname(new.host), 'ride_id', new.id,
      'title', new.title, 'starts_at', new.starts_at, 'meet', new.meet_label,
      'changed', case when t and pl then 'both' when t then 'time' else 'place' end));
  end loop;
  return null;
end $$;

create or replace function private.ride_cancel_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if old.ends_at < now() then return old; end if;
  for u in select p.user_id from public.ride_participants p where p.ride_id = old.id and p.user_id <> old.host
           union select m.user_id from public.ride_maybe m where m.ride_id = old.id and m.user_id <> old.host loop
    perform private.push_notify(u, jsonb_build_object('kind', 'ride_cancel', 'actor', private.pname(old.host),
      'title', old.title, 'starts_at', old.starts_at));
  end loop;
  return old;
end $$;

-- ---------------------------------------------------------------------
-- 3. Oficiálne jazdy EliteBiker
-- ---------------------------------------------------------------------
alter table public.rides add column if not exists official boolean not null default false;

create or replace function private.near_me_km(p_lat double precision, p_lng double precision, p_km double precision) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_locations l
                 where l.user_id = auth.uid() and private.km_between(l.lat, l.lng, p_lat, p_lng) <= p_km);
$$;

create or replace function private.can_see_ride(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rides x where x.id = r and (
            x.host = auth.uid()
         or (x.visibility = 'public' and x.ends_at > now() and not private.blocked_pair(auth.uid(), x.host)
             and (private.near_me(x.meet_lat, x.meet_lng) or (x.official and private.near_me_km(x.meet_lat, x.meet_lng, 60))))))
      or exists (select 1 from public.ride_audience a where a.ride_id = r and a.user_id = auth.uid())
      or exists (select 1 from public.ride_participants p where p.ride_id = r and p.user_id = auth.uid());
$$;

-- oficiálnu jazdu založí len admin; je vždy verejná a označenie sa nedá dodatočne pridať ani odobrať
create or replace function private.official_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then new.official := old.official; end if;
  if tg_op = 'INSERT' and new.official and not private.is_admin() then
    raise exception 'Oficiálnu jazdu môže založiť len EliteBiker.' using errcode = '42501';
  end if;
  if new.official then new.visibility := 'public'; end if;
  return new;
end $$;
create trigger official_guard before insert or update on public.rides for each row execute function private.official_guard();

-- nová oficiálna jazda: upozornenie všetkým do 60 km
create or replace function private.official_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if not new.official or new.starts_at < now() then return null; end if;
  for u in select l.user_id from public.user_locations l
           where l.user_id <> new.host and private.km_between(l.lat, l.lng, new.meet_lat, new.meet_lng) <= 60 loop
    perform private.push_notify(u, jsonb_build_object('kind', 'official', 'ride_id', new.id, 'title', new.title,
      'starts_at', new.starts_at, 'meet', new.meet_label));
  end loop;
  return null;
end $$;
create trigger official_notify after insert on public.rides for each row execute function private.official_notify();

revoke execute on function private.maybe_guard(), private.maybe_after_join(), private.official_guard(), private.official_notify(),
  private.near_me_km(double precision, double precision, double precision) from public, anon, authenticated;
