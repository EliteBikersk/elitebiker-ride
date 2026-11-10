# Zapojenie ostrej verzie EliteBiker Ride

Stránka beží na GitHub Pages. Kým nie je vyplnený `js/config.js`, beží v **skúšobnom režime**
(vymyslené údaje, uložené len v prehliadači). Na ostrú prevádzku stačí **Supabase** (zadarmo, Free plán):
databáza, prihlásenie e-mailom, chat v reálnom čase, fotky a funkcia na zmazanie účtu.

**Stav 10. 11. 2026:** beží, projekt `elitebiker-ride` (Frankfurt), prihlásenie e-mailom (odkaz alebo kód)
cez SMTP Shoptetu (info@elitebiker.sk). Aplikácia sa **neprepája** s Instagramom, Facebookom ani Stravou -
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
5. **Authentication → Emails → SMTP Settings**: vlastné SMTP, schránka info@elitebiker.sk na Shoptete
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
- Funkcie `weather` (predpoveď pre aplikáciu) a `weather-alerts` (upozornenia), nasadiť zo `supabase/functions-bundled/`.
- Predpoveď: MET Norway (api.met.no, zadarmo aj komerčne, uvádzať zdroj), cache v tabuľke `weather_cache` na 1 h.
- Kľúče pre upozornenia (VAPID) a `cron_key` sú zašifrované v **Supabase Vault** (`eb_vapid_public`, `eb_vapid_private`, `eb_cron_key`). Funkcia ich číta cez `server_secrets()`, ktorú smie volať len server. Verejný VAPID kľúč je aj v `js/config.js` (`VAPID_PUBLIC`).
- Každú hodinu (7. minúta) volá pg_cron funkciu `weather-alerts`:
```sql
select cron.schedule('eb-ride-weather-alerts', '7 * * * *', $$
  select net.http_post(url := 'https://<ref>.supabase.co/functions/v1/weather-alerts',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-key',(select decrypted_secret from vault.decrypted_secrets where name='eb_cron_key')),
    body := '{"cron":true}'::jsonb, timeout_milliseconds := 30000);
$$);
```
- Pravidlá „zlého počasia“ (počas jazdy, kontrola 24 h vopred, jedno upozornenie na jazdu): búrka, sneženie, dážď so snehom, dážď ≥ 1 mm (silný ≥ 5 mm), vietor ≥ 36 km/h alebo nárazy ≥ 54 km/h, ≥ 33 °C.
- iPhone: upozornenia fungujú len v appke pridanej na plochu (iOS 16.4+).

### Upozornenia na žiadosti a pozvánky, katalóg bicyklov
- Funkcia `notify` (bez JWT, overuje `x-cron-key`) pošle upozornenie do mobilu. Volajú ju triggery v databáze cez `private.push_notify` (pg_net): nová / prijatá žiadosť o priateľstvo, kamoš pridaný cez odkaz, pozvánka na jazdu, niekto sa pridal k mojej jazde. Sebe sa nič neposiela a chyba upozornenia nikdy nezastaví samotnú akciu.
- Zariadenie dostáva tieto upozornenia, ak má v `push_subscriptions` stĺpec `social = true` (predvolené). Pri každom zariadení sa ukladá `device`, `last_status`, `last_error` a `last_at`: stav posledného odoslania (201 = služba prijala, 404/410 = zariadenie zrušené a zmaže sa).
- Šifrovanie upozornení (RFC 8291, aes128gcm) a podpis VAPID (RFC 8292) robí `_shared/push.ts` cez WebCrypto, bez knižnice web-push. Kontrola šifrovania priamo na serveri: `notify` s `{"selftest":true,"p256dh":…,"auth":…}` a kľúčom `x-cron-key` vráti zašifrovaný text „selftest-ok“.
- Vek a mesto (`profiles.age`, `profiles.city`) sa z tabuľky priamo nečítajú, vracia ich `profile_private(ids)` len sebe a priateľom.
- Funkcia `bike-catalog` raz denne (4:41, úloha `eb-ride-bike-catalog`) prejde kategórie *Bicykel pre každého* a *Elektrobicykel* (`ebike = true`) na elitebiker.sk a uloží ID, názov, značku, odkaz a fotku do `catalog_bikes`. Ak načíta menej ako 20 bicyklov, katalóg nemení.
- Používateľ má najviac 5 bicyklov (`user_bikes`); odkaz a fotku berie server len z katalógu, nie od používateľa.

## 2. Zapnutie

Vyplň `js/config.js` (Supabase URL a publishable key), ulož do GitHubu, o minútu beží ostrá verzia.

### Administrácia
- Stránka `admin.html` (https://elitebikersk.github.io/elitebiker-ride/admin.html).
- Admin = riadok v tabuľke `private.admins` (nie je dostupná cez API):
```sql
insert into private.admins (user_id) values ('<uuid z Authentication → Users>');
```
- Pri prvom vstupe si admin zapne overovaciu aplikáciu (Google/Microsoft Authenticator). Bez kódu z nej server nič nevydá (kontrola `aal2` v každej admin funkcii).
- Admin vidí len poradie a mená používateľov (`admin_names()`) a súhrnné metriky (`admin_metrics(p_days)`): aktívni dnes, za 7 a 30 dní, vracajúci sa, appka na ploche, otvorenia appky (aj cez pozvánku a odkaz na jazdu), noví, jazdy podľa typu, zariadenia, priateľstvá, upozornenia a graf po dňoch. E-mail, vek, mesto, telefón ani kontakty admin nevidí.
- Meranie: appka pri otvorení zavolá `track(kind, platform, standalone)`. Do `private.visit_days` sa pripočíta jedno otvorenie za deň (bez identity), prihlásenému sa do `private.activity_days` zapíše aktívny deň (maže sa po 400 dňoch v `eb-ride-housekeeping`). Do zariadenia sa nič neukladá.
- Body (`admin_adjust_points`) a rušenie verejných jázd (`admin_delete_ride`) ostali na serveri pre neskorší Klub, v administrácii zatiaľ nie sú. Po 20 min nečinnosti sa admin odhlási, prihlásenie platí len v jednej karte.

### Verejné jazdy a body
- Jazda má `visibility`: `public` (každý do 30 km od stretka podľa `user_locations`), `friends` (pozvaní, môžu pozývať ďalej), `private` (len pozvaní, pozýva len organizátor).
- Poloha používateľa = stred mesta z profilu (geokódovanie Nominatim, `autoLocation`), uložená zaokrúhlená na 2 desatinné miesta (~1 km) v `user_locations`; vidí ju len on. Pri zmene mesta sa prepočíta.
- EB body počíta server (`my_points()`): +20 spoločná jazda, +50 zorganizovaná jazda (aspoň 2 ľudia), +10 fotka (max 5 na jazdu), + bonusy − odmeny z `point_adjustments`.

### Ochrana
- RLS na všetkých tabuľkách, stĺpcové práva (napr. pri jazde sa dá meniť len viditeľnosť, názov, popis, limit, odkaz), kontroly v triggeroch (jazda nesmie začínať v minulosti, max 5 verejných jázd naraz…).
- Profily vidno len pri spoločných priateľoch/jazdách, hľadanie vracia len meno, fotku, mesto a Instagram (min. 3 znaky, max 10 výsledkov).
- Limity proti zneužitiu (`private.rate_limits`): hľadanie, chat, fotky, žiadosti, pozvánky, poloha, jazdy, export.
- Stránky majú Content-Security-Policy (len vlastné skripty), písmo je uložené lokálne, ochrana proti vloženiu do cudzej stránky.
- **Odporúčané v Supabase (Authentication → Sign In / Providers → Email):** heslo min. 8 znakov s písmenom a číslicou; pri prechode na Pro aj „Leaked password protection“.

## Čo robí server
- **Chat** vidia len účastníci jazdy a po skončení jazdy ho každých 15 minút maže úloha `eb-ride-chat-cleanup`.
- **Jazdu** vidia len pozvaní, verejnú aj bikeri do 30 km (pravidlá prístupu priamo v databáze, nedajú sa obísť z prehliadača).
- **Fotky** z jázd sú v súkromnom úložisku, profilovky vo verejnom.
- **Hľadanie** kamošov podľa mena, Instagramu alebo Facebooku (aj bez diakritiky), funkcia `search_profiles`.
- **Zmazanie účtu** v Profile zmaže profil, bicykle, jazdy, správy a fotky.
- **Upozornenia do mobilu**: žiadosti o priateľstvo, pozvánky na jazdy, kto sa pridal k jazde, zlé počasie. Čo komu chodí, rozhoduje `notify_prefs` (výber v Profile) cez `private.wants()`.
- **Telefón** je v `user_phones` (vidí ho len vlastník); spolujazdcom ho vráti len `ride_phones(p_ride)`, a to len účastníkovi jazdy, kým jazda neskončí.
- **Úprava jazdy**: organizátor môže meniť vybrané stĺpce (`ride_guard` kontroluje čas, limit ľudí a skončenú jazdu).

## Prečo nie Instagram / Strava prihlásenie (10. 11. 2026)
- **Instagram:** nové Meta aplikácie od konca októbra 2026 nedostanú „Instagram login“, len Unified login cez Facebook
  (iba firemné/tvorcovské účty, overenie firmy a schválenie Metou).
- **Strava:** API je od roku 2026 len pre predplatiteľov Stravy (cca 11,99 $/mes.) a bez schválenia max. 10 športovcov.
