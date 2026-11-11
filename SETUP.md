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
- Tá istá hodinová úloha posiela aj **pripomienky jazdy** (druh `reminder`): približne 2 hodiny pred štartom a pri behu o 19. hodine (Bratislava) aj na zajtrajšie jazdy. Text: „🚴 Zajtra 17:00: Manín“ / „⏰ Dnes 17:00: Manín“, telo „Stretko: … · 12 °C, polojasno · idú 4“. Každá fáza (`eve`, `2h`) ide len raz (`public.ride_reminders`, bez práv pre používateľov); pri zmene času jazdy sa záznamy zmažú a pripomienka príde znova.
- iPhone: upozornenia fungujú len v appke pridanej na plochu (iOS 16.4+).

### Upozornenia na žiadosti a pozvánky, katalóg bicyklov
- Funkcia `notify` (bez JWT, overuje `x-cron-key`) pošle upozornenie do mobilu. Volajú ju triggery v databáze cez `private.push_notify` (pg_net): nová / prijatá žiadosť o priateľstvo, kamoš pridaný cez odkaz, pozvánka na jazdu, niekto sa pridal k mojej jazde. Sebe sa nič neposiela a chyba upozornenia nikdy nezastaví samotnú akciu.
- Zariadenie dostáva tieto upozornenia, ak má v `push_subscriptions` stĺpec `social = true` (predvolené). Pri každom zariadení sa ukladá `device`, `last_status`, `last_error` a `last_at`: stav posledného odoslania (201 = služba prijala, 404/410 = zariadenie zrušené a zmaže sa).
- Šifrovanie upozornení (RFC 8291, aes128gcm) a podpis VAPID (RFC 8292) robí `_shared/push.ts` cez WebCrypto, bez knižnice web-push. Kontrola šifrovania priamo na serveri: `notify` s `{"selftest":true,"p256dh":…,"auth":…}` a kľúčom `x-cron-key` vráti zašifrovaný text „selftest-ok“.
- Ďalšie druhy cez `notify`: `ride_change` a `ride_cancel` (triggery `ride_change_notify` pri zmene času alebo stretka a `ride_cancel_notify` pred zmazaním jazdy), `chat` (trigger `chat_notify`, najviac raz za 3 minúty na jazdu a človeka, `private.chat_push`), `status` (funkcia `ride_status(p_ride, 'here'|'late'|'cant')`, len účastník a len v deň jazdy; pri `cant` sa neorganizátor z jazdy odhlási) a `service` (úloha `eb-ride-service` o 9:05 UTC, `private.service_reminders()`: len používatelia s polohou do 40 km od Považskej Bystrice, výročie pridania bicykla a 15. marca pred sezónou, každé len raz cez `private.service_push`).
- Výber v Profile (`notify_prefs.push`): `friend_request`, `friend_accepted`, `free`, `ride_invite`, `ride_join`, `ride_change`, `reminder`, `chat`, `status`, `weather`, `official`, `service`. Bez uloženého výberu je zapnuté všetko. Pripomienka servisu sa v Profile ukáže len ľuďom z okolia Považskej Bystrice.
- Mesto (`profiles.city`) sa z tabuľky priamo nečíta, vracia ho `profile_private(ids)` len sebe a priateľom. Vek sa nezbiera (`profiles.age` je prázdny).
- Funkcia `bike-catalog` raz denne (4:41, úloha `eb-ride-bike-catalog`) prejde kategórie *Bicykel pre každého* a *Elektrobicykel* (`ebike = true`) na elitebiker.sk a uloží ID, názov, značku, odkaz a fotku do `catalog_bikes`. Ak načíta menej ako 20 bicyklov, katalóg nemení.
- Typ bicykla v katalógu (`catalog_bikes.kind`) podľa kategórií e-shopu: Gravel bicykel, Cestný bicykel, BMX a dirt, Horský (aj Hardtail a Celoodpružený), Elektrobicykel. Rámy, mestské a detské bicykle typ nemajú (okrem jasného slova v názve), človek si ho vyberie pri pridaní. `user_bikes.type` sa dá meniť (`bike_type_guard` dovolí zmeniť len typ).
- Používateľ má najviac 5 bicyklov (`user_bikes`); odkaz a fotku berie server len z katalógu, nie od používateľa.

### Prihlásenie cez Google a Apple
Appka si sama zistí, ktorí poskytovatelia sú zapnutí (`/auth/v1/settings`), a len tie tlačidlá ukáže. Kľúče zadáva Martin priamo v Supabase, do kódu sa nič nepíše.
- **Google** (zadarmo): [Google Cloud Console](https://console.cloud.google.com/) → nový projekt „EliteBiker Ride“ → *Google Auth Platform*: názov aplikácie, e-mail podpory info@elitebiker.sk, typ používateľov *Externí*. V *Clients* vytvoriť klienta typu *Webová aplikácia*: povolený zdroj JavaScriptu `https://elitebikersk.github.io`, presmerovanie `https://kfkbqamnblyitpugllps.supabase.co/auth/v1/callback`. Potom v *Audience* aplikáciu zverejniť (inak sa prihlásia len testovací používatelia). Client ID a Client secret vložiť v Supabase: *Authentication → Sign In / Providers → Google*, zapnúť a uložiť.
- **Apple** (platený vývojársky účet Apple): Team ID, App ID so zapnutým Sign in with Apple, Services ID (napr. `sk.elitebiker.ride.web`) s doménou `kfkbqamnblyitpugllps.supabase.co` a návratovou adresou `https://kfkbqamnblyitpugllps.supabase.co/auth/v1/callback`, kľúč (.p8). Z kľúča sa v Supabase vygeneruje tajný kľúč, ktorý **treba obnoviť každých 6 mesiacov**. Údaje vložiť v *Authentication → Sign In / Providers → Apple*.
- V *Authentication → URL Configuration* musí byť medzi povolenými adresami `https://elitebikersk.github.io/elitebiker-ride/**` (návrat aj s `?pozvanka=…`).
- Účet s rovnakým overeným e-mailom Supabase spojí, takže kto sa doteraz prihlasoval heslom, môže použiť aj Google. Meno z Google sa predvyplní pri registrácii; pozývací odkaz sa uplatní v appke po prihlásení.
- Tlačidlá sú len textové (bez log Google a Apple).

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
- **Upozornenia do mobilu**: žiadosti o priateľstvo, pozvánky na jazdy, kto sa pridal k jazde, zmena a zrušenie jazdy, chat, stav v deň jazdy, pripomienky pred jazdou, zlé počasie a servis (okolie Považskej Bystrice). Čo komu chodí, rozhoduje `notify_prefs` (výber v Profile) cez `private.wants()`.
- **Telefón** je v `user_phones` (vidí ho len vlastník); spolujazdcom ho vráti len `ride_phones(p_ride)`, a to len účastníkovi jazdy, kým jazda neskončí.
- **Výber mesta**: mesto sa vyberá zo zoznamu 2 927 obcí a mestských častí Slovenska (`public.places`, hľadá `search_places(q)` bez ohľadu na diakritiku). Poloha pre verejné jazdy sa berie priamo zo zvolenej obce. Kto býva mimo Slovenska, ťukne „Bývam mimo Slovenska“ a poloha sa nájde podľa názvu ako doteraz. Načítanie zoznamu (raz, napríklad v novom projekte): `select net.http_get('https://query.wikidata.org/sparql?format=json&query=…')` s dotazom z `migrations/20261111_8_obce.sql`, potom `select private.load_places(<id odpovede>)`.
- **Pozývací odkaz** `?pozvanka=KÓD`: kód ostáva v adrese, kým sa človek neprihlási, a pri registrácii sa uloží k účtu (`raw_user_meta_data.pozvanka`). Keď si nový biker prvýkrát vyplní meno, trigger `profile_invite` zavolá `private.redeem_invite_for` a spojí ho do partie s tým, kto pozval (aj na jazdu, ak išlo o odkaz na jazdu). Funguje to aj vtedy, keď sa kód v prehliadači stratí (Instagram, Safari, appka na ploche). Prihlásený, ktorý odkaz otvorí, je v partii hneď (`redeem_invite`), aj keď už mal čakajúcu žiadosť.
- **Úprava jazdy**: organizátor môže meniť vybrané stĺpce (`ride_guard` kontroluje čas, limit ľudí a skončenú jazdu).
- **Blokovanie** (`public.blocks`, vidí a mení len ten, kto blokuje): `private.blocked_pair(a, b)` platí oboma smermi. Zablokovaní sa nenájdu (`search_profiles`), nepridajú (`friend_guard`), nevidia verejné jazdy toho druhého (`can_see_ride`), jeho správy v chate (pravidlo na čítanie chatu) ani telefón (`ride_phones`), neuplatnia jeho pozvánku a nedostanú od neho upozornenie. Po zablokovaní sa zruší priateľstvo a pozvánky medzi nimi (`block_after`).
- **Nahlásenia** (`public.reports`): používateľ smie len vložiť (bez čítania, preto aplikácia nevolá `.select()`), `report_guard` doplní názov jazdy alebo meno a dá limit 10 za deň. Administrácia číta cez `admin_reports()` (bez toho, kto nahlasoval), vybaví cez `admin_report_done(id)` a jazdu zruší cez `admin_delete_ride(id, dôvod)`.
- **Mám čas** (`public.availability`): zápis len cez `set_availability('today'|'tomorrow', 'HH:MM', poznámka)`, deň počíta server podľa Bratislavy. Čítať môže len vlastník a priatelia, zmazať len vlastník. Pri prvom zápise na daný deň dostanú priatelia upozornenie `free`. Úloha `eb-ride-free-cleanup` (3:17 UTC) maže staré dni.
- **Možno** (`public.ride_maybe`): vidí ho každý, kto vidí jazdu; pridať môže ten, kto jazdu vidí a nie je účastník. Nezaberá miesto (`has_room` ráta len účastníkov). Po pridaní sa k jazde ho zmaže `maybe_after_join`. Zmena a zrušenie jazdy idú aj „možno“; večer pred jazdou im `weather-alerts` pošle „Ideš?“.
- **Oficiálne jazdy** (`rides.official`): založiť môže len admin (`official_guard`, potom sa označenie nedá meniť), jazda je vždy verejná a vidno ju do 60 km (`can_see_ride` s `near_me_km`). Po založení `official_notify` pošle upozornenie `official` všetkým s polohou do 60 km.
- **Cache v zariadení**: `sw.js` ukladá len súbory appky; posledné načítané jazdy, partiu a profily (bez telefónov) si appka drží v `localStorage` (`eb_snap_<id>`) a pri odhlásení alebo zmazaní účtu ich vymaže.
- **Náhľad odkazu**: `og.png` a značky `og:` v `index.html`. Vlastný náhľad pre každú jazdu by potreboval server, ktorý vráti HTML (Supabase Edge Functions vracajú HTML ako text, takže by to musel byť napríklad Cloudflare Worker na vlastnej doméne).

## Prečo nie Instagram / Strava prihlásenie (10. 11. 2026)
- **Instagram:** nové Meta aplikácie od konca októbra 2026 nedostanú „Instagram login“, len Unified login cez Facebook
  (iba firemné/tvorcovské účty, overenie firmy a schválenie Metou).
- **Strava:** API je od roku 2026 len pre predplatiteľov Stravy (cca 11,99 $/mes.) a bez schválenia max. 10 športovcov.
