-- =====================================================================
-- EliteBiker Ride, 11. 11. 2026
-- Údržba: záznamy o aktivite sa mažú po 400 dňoch (rovnaká denná úloha ako limity a pozvánky).
-- =====================================================================
select cron.schedule('eb-ride-housekeeping', '23 3 * * *',
  $$with a as (delete from private.rate_limits where bucket < now() - interval '2 days'),
         b as (delete from private.activity_days where day < current_date - 400)
    delete from public.invites where expires_at < now() - interval '30 days'$$);
