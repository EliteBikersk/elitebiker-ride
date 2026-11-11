-- =====================================================================
-- EliteBiker Ride, 11. 11. 2026
-- Každý bicykel má typ (cesta, gravel, horský, e-bike, dirt/BMX), aby sa pri jazde
-- ukázal ten správny. Bicyklom z ponuky e-shopu sa typ priradí sám podľa kategórie.
-- =====================================================================
alter table public.catalog_bikes add column if not exists kind text
  constraint catalog_bikes_kind check (kind in ('cesta', 'gravel', 'mtb', 'ebike', 'dirt'));
grant select (kind) on public.catalog_bikes to authenticated;

alter table public.user_bikes add column if not exists type text
  constraint user_bikes_type check (type in ('cesta', 'gravel', 'mtb', 'ebike', 'dirt'));
grant update (type) on public.user_bikes to authenticated;
create policy "bicykle – typ" on public.user_bikes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- pri pridaní z ponuky e-shopu: typ z kategórie, ak ho človek nevybral sám
create or replace function private.bike_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.catalog_bikes;
begin
  perform private.hit('bike', 30, interval '1 hour');
  if tg_op = 'UPDATE' then
    -- meniť sa dá len typ
    new.id := old.id; new.user_id := old.user_id; new.name := old.name; new.catalog_id := old.catalog_id;
    new.url := old.url; new.image := old.image; new.created_at := old.created_at;
    return new;
  end if;
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
    if found then
      new.name := c.name; new.url := c.url; new.image := c.image;
      new.type := coalesce(new.type, c.kind, case when c.ebike then 'ebike' end);
    else new.catalog_id := null; end if;
  end if;
  if char_length(new.name) < 2 then raise exception 'Napíš názov bicykla.' using errcode = '22023'; end if;
  return new;
end $$;
create trigger bike_type_guard before update on public.user_bikes
  for each row execute function private.bike_guard();

-- katalóg teraz prechádza viac kategórií, preto dlhší čas na odpoveď
select cron.schedule('eb-ride-bike-catalog', '41 4 * * *', $$
  select net.http_post(
    url := 'https://kfkbqamnblyitpugllps.supabase.co/functions/v1/bike-catalog',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'eb_cron_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000);
$$);

-- po prvom behu katalógu: existujúcim bicyklom z ponuky doplniť typ (spustené 11. 11. 2026)
update public.user_bikes b set type = c.kind from public.catalog_bikes c where b.catalog_id = c.id and b.type is null and c.kind is not null;
