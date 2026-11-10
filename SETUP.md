# Zapojenie ostrej verzie EliteBiker Ride

Stránka beží na GitHub Pages. Kým nie je vyplnený `js/config.js`, beží v **skúšobnom režime**
(vymyslené údaje, uložené len v prehliadači). Na ostrú prevádzku stačí **Supabase** (zadarmo, Free plán):
databáza, prihlásenie e-mailom, chat v reálnom čase, fotky a funkcia na zmazanie účtu.

**Stav 10. 11. 2026:** beží – projekt `elitebiker-ride` (Frankfurt), prihlásenie e-mailom (odkaz alebo kód)
cez SMTP Shoptetu (info@elitebiker.sk). Aplikácia sa **neprepája** s Instagramom, Facebookom ani Stravou –
Instagram a Facebook si každý zadá do profilu ručne, aby mu kamoši vedeli napísať.

Tajné kľúče (`service_role`, `sb_secret_…`) **nikdy** nepatria do `config.js` ani do GitHubu.

---

## 1. Supabase (≈ 15 min)

1. https://supabase.com → **Start your project** → prihlás sa cez GitHub (účet EliteBikersk).
2. **New project**: názov `elitebiker-ride`, región **Central EU (Frankfurt)**, vygeneruj heslo databázy a ulož si ho.
3. **SQL Editor → New query** → vlož celý súbor [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   - Ak hlási chybu pri `pg_cron`: **Database → Extensions** → zapni `pg_cron` a spusti skript znova.
4. **Authentication → URL Configuration**
   - Site URL: `https://elitebikersk.github.io/elitebiker-ride/`
   - Redirect URLs: `https://elitebikersk.github.io/elitebiker-ride/**`
5. **Authentication → Emails → SMTP Settings**: vlastné SMTP – schránka info@elitebiker.sk na Shoptete
   (server `mbox.myshoptet.com`, port `587`, používateľ = celá e-mailová adresa, heslo k schránke).
   Bez toho Supabase pošle e-mail len členom tímu. Šablóny „Magic link“ a „Confirm sign up“ sú v slovenčine
   (vzor v [`supabase/email-magic-link.html`](supabase/email-magic-link.html)).
6. **Project Settings → API**: skopíruj **Project URL** a **publishable key** do `js/config.js`.

### Serverová funkcia (zmazanie účtu)
```bash
npx supabase login
npx supabase link --project-ref <ref-projektu>
npx supabase functions deploy delete-account --no-verify-jwt
```
(Alebo cez web: **Edge Functions → Deploy a new function** a vložiť `supabase/functions-bundled/delete-account/index.ts`.)

### Počasie a upozornenia
- Funkcie `weather` (predpoveď pre aplikáciu) a `weather-alerts` (upozornenia) – nasadiť zo `supabase/functions-bundled/`.
- Predpoveď: MET Norway (api.met.no, zadarmo aj komerčne, uvádzať zdroj), cache v tabuľke `weather_cache` na 1 h.
- Kľúče pre upozornenia (VAPID) a `cron_key` sú v tabuľke `app_secrets` (nečitateľná z prehliadača). Verejný VAPID kľúč je v `js/config.js` (`VAPID_PUBLIC`).
- Každú hodinu (7. minúta) volá pg_cron funkciu `weather-alerts`:
```sql
select cron.schedule('eb-ride-weather-alerts', '7 * * * *', $$
  select net.http_post(url := 'https://<ref>.supabase.co/functions/v1/weather-alerts',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-key',(select value from public.app_secrets where name='cron_key')),
    body := '{"cron":true}'::jsonb, timeout_milliseconds := 30000);
$$);
```
- Pravidlá „zlého počasia“ (počas jazdy, kontrola 24 h vopred, jedno upozornenie na jazdu): búrka, sneženie, dážď so snehom, dážď ≥ 1 mm (silný ≥ 5 mm), vietor ≥ 36 km/h alebo nárazy ≥ 54 km/h, ≥ 33 °C.
- iPhone: upozornenia fungujú len v appke pridanej na plochu (iOS 16.4+).

## 2. Zapnutie

Vyplň `js/config.js` (Supabase URL a publishable key), ulož do GitHubu – o minútu beží ostrá verzia.

## Čo robí server
- **Chat** vidia len účastníci jazdy a po skončení jazdy ho každých 15 minút maže úloha `eb-ride-chat-cleanup`.
- **Jazdu** vidia len pozvaní (pravidlá prístupu priamo v databáze – nedajú sa obísť z prehliadača).
- **Fotky** z jázd sú v súkromnom úložisku, profilovky vo verejnom.
- **Hľadanie** kamošov podľa mena, Instagramu alebo Facebooku (aj bez diakritiky) – funkcia `search_profiles`.
- **Zmazanie účtu** v Profile zmaže profil, jazdy, správy a fotky.

## Prečo nie Instagram / Strava prihlásenie (10. 11. 2026)
- **Instagram:** nové Meta aplikácie od konca októbra 2026 nedostanú „Instagram login“, len Unified login cez Facebook
  (iba firemné/tvorcovské účty, overenie firmy a schválenie Metou).
- **Strava:** API je od roku 2026 len pre predplatiteľov Stravy (cca 11,99 $/mes.) a bez schválenia max. 10 športovcov.
