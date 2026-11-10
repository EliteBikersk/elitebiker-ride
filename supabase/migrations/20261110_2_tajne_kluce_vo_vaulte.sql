-- =====================================================================
-- Tajné kľúče (VAPID pre upozornenia, kľúč pre plánovač) sa presúvajú
-- z bežnej tabuľky do Supabase Vault – na disku sú zašifrované a kľúč
-- na dešifrovanie nie je uložený v databáze.
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
