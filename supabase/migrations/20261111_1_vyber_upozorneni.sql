-- =====================================================================
-- EliteBiker Ride – 11. 11. 2026
-- Každý si v Profile vyberie, pri čom mu chodia upozornenia do mobilu.
-- =====================================================================

create or replace function private.notify_kinds() returns text[] language sql immutable set search_path = '' as
$$ select array['friend_request','friend_accepted','ride_invite','ride_join','weather']::text[] $$;

create table if not exists public.notify_prefs (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  push       text[] not null default private.notify_kinds(),
  updated_at timestamptz not null default now(),
  constraint notify_prefs_kinds check (push <@ private.notify_kinds())
);
alter table public.notify_prefs enable row level security;
drop policy if exists "upozornenia – moje nastavenie" on public.notify_prefs;
create policy "upozornenia – moje nastavenie" on public.notify_prefs for select using (user_id = (select auth.uid()));
drop policy if exists "upozornenia – moje nastavenie (zápis)" on public.notify_prefs;
create policy "upozornenia – moje nastavenie (zápis)" on public.notify_prefs for insert with check (user_id = (select auth.uid()));
drop policy if exists "upozornenia – moje nastavenie (úprava)" on public.notify_prefs;
create policy "upozornenia – moje nastavenie (úprava)" on public.notify_prefs for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.notify_prefs from anon, authenticated;
grant select (user_id, push, updated_at), insert (user_id, push), update (push) on public.notify_prefs to authenticated;

create or replace function private.prefs_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then new.user_id := auth.uid(); end if;
  new.push := array(select distinct x from unnest(coalesce(new.push, '{}'::text[])) x order by 1);
  new.updated_at := now();
  if auth.uid() is not null then perform private.hit('prefs', 120, interval '1 hour'); end if;
  return new;
end $$;
drop trigger if exists prefs_guard on public.notify_prefs;
create trigger prefs_guard before insert or update on public.notify_prefs for each row execute function private.prefs_guard();

-- počasie posiela funkcia weather-alerts len na zariadenia so stĺpcom weather = true: zosúladíme ho s nastavením
create or replace function private.prefs_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.push_subscriptions set weather = ('weather' = any (new.push)) where user_id = new.user_id;
  return null;
end $$;
drop trigger if exists prefs_sync on public.notify_prefs;
create trigger prefs_sync after insert or update on public.notify_prefs for each row execute function private.prefs_sync();

create or replace function private.pref_kind(k text) returns text language sql immutable set search_path = '' as
$$ select case k when 'friend_joined' then 'friend_accepted' else k end $$;

-- upozornenie má zmysel poslať, len ak má človek zapnuté zariadenie a daný druh nevypol
create or replace function private.wants(p_user uuid, p_kind text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.push_subscriptions s where s.user_id = p_user and s.social)
     and private.pref_kind(p_kind) = any (coalesce((select n.push from public.notify_prefs n where n.user_id = p_user), private.notify_kinds()));
$$;

create or replace function private.push_notify(p_user uuid, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = auth.uid() then return; end if;
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

-- nové zariadenie prevezme nastavenie počasia
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_device text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare w boolean := coalesce((select 'weather' = any (n.push) from notify_prefs n where n.user_id = auth.uid()), true);
begin
  if auth.uid() is null then raise exception 'Nie si prihlásený.'; end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000 then raise exception 'Neplatné zariadenie.'; end if;
  if p_p256dh !~ '^[A-Za-z0-9_-]{80,100}$' or p_auth !~ '^[A-Za-z0-9_-]{16,32}$' then raise exception 'Neplatné zariadenie.'; end if;
  perform private.hit('push_save', 30, interval '1 hour');
  insert into push_subscriptions (endpoint, user_id, p256dh, auth, device, weather)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_device, 80), w)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
    device = coalesce(excluded.device, push_subscriptions.device), weather = w,
    created_at = case when push_subscriptions.p256dh = excluded.p256dh and push_subscriptions.user_id = excluded.user_id then push_subscriptions.created_at else now() end,
    last_status = case when push_subscriptions.p256dh = excluded.p256dh then push_subscriptions.last_status end,
    last_error = case when push_subscriptions.p256dh = excluded.p256dh then push_subscriptions.last_error end;
end $$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
