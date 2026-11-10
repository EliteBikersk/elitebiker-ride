-- =====================================================================
-- EliteBiker Ride, 11. 11. 2026 (ZATIAĽ NESPUSTENÉ, treba potvrdiť v Supabase)
-- Upratanie: zmazanie starých admin funkcií. Už teraz nič nevracajú (pozri 20261111_3), toto ich len odstráni.
-- =====================================================================
drop function if exists public.admin_overview();
drop function if exists public.admin_users(text, text, int, int);
drop function if exists public.admin_user(uuid);
drop function if exists public.admin_rides();
