# Zapojenie ostrej verzie EliteBiker Ride

Stránka beží na GitHub Pages. Kým nie je vyplnený `js/config.js`, beží v **skúšobnom režime**
(vymyslené údaje, uložené len v prehliadači). Na ostrú prevádzku treba 3 účty:

| Služba | Na čo | Cena na štart |
|---|---|---|
| **Supabase** | databáza, prihlásenie, chat v reálnom čase, fotky, serverové funkcie | zadarmo (Free plán) |
| **Strava API** | pripojenie Stravy | od 2026 len s predplatným Stravy (cca 11,99 $/mes.) – **zatiaľ vypnuté** |
| **Meta for Developers** | prihlásenie cez Instagram | zadarmo – ale nové Meta aplikácie (od konca 10/2026) už nemajú „Instagram login“, len Unified login cez Facebook → **zatiaľ vypnuté**, IG meno sa zadáva ručne |

**Stav 10. 11. 2026:** beží Supabase + prihlásenie e-mailom (odkaz alebo kód) cez SMTP Shoptetu (info@elitebiker.sk). Instagram a Strava sa zobrazia, až keď sa vyplní `IG_APP_ID` / `STRAVA_CLIENT_ID`.

Tajné kľúče (`…_SECRET`, `service_role`) **nikdy** nepatria do `config.js` ani do GitHubu – len do Supabase (Secrets).

---

## 1. Supabase (≈ 15 min)

1. https://supabase.com → **Start your project** → prihlás sa cez GitHub (účet EliteBikersk).
2. **New project**: názov `elitebiker-ride`, región **Central EU (Frankfurt)**, vygeneruj heslo databázy a ulož si ho.
3. **SQL Editor → New query** → vlož celý súbor [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   - Ak hlási chybu pri `pg_cron`: **Database → Extensions** → zapni `pg_cron` a spusti skript znova.
4. **Authentication → URL Configuration**
   - Site URL: `https://elitebikersk.github.io/elitebiker-ride/`
   - Redirect URLs: `https://elitebikersk.github.io/elitebiker-ride/**`
5. **Authentication → Emails → SMTP Settings**: zapni vlastné SMTP (napr. schránka info@elitebiker.sk).
   Bez toho Supabase pošle len pár prihlasovacích e-mailov za hodinu.
   Odporúčame upraviť aj šablónu „Magic Link“ do slovenčiny.
6. **Project Settings → API**: skopíruj **Project URL** a **anon / publishable key** do `js/config.js`.

### Serverové funkcie
V počítači (treba Node.js):
```bash
npx supabase login
npx supabase link --project-ref <ref-projektu>
npx supabase functions deploy instagram-auth ig-media strava-auth strava-data delete-account --no-verify-jwt
npx supabase secrets set APP_URL=https://elitebikersk.github.io/elitebiker-ride/ \
  ALLOWED_ORIGINS=https://elitebikersk.github.io \
  STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=... \
  IG_APP_ID=... IG_APP_SECRET=...
```
(Alebo cez web: **Edge Functions → Deploy a new function** a vložiť kód z `supabase/functions/…`, tajné kľúče v **Edge Functions → Secrets**.)

---

## 2. Strava (≈ 5 min)

1. https://www.strava.com/settings/api → vytvor aplikáciu:
   - Application Name: `EliteBiker Ride`, Category: `Social Network`
   - Website: `https://elitebikersk.github.io/elitebiker-ride/`
   - **Authorization Callback Domain:** `elitebikersk.github.io`
   - nahraj ikonu (`icon-512.png`)
2. **Client ID** → do `js/config.js` (`STRAVA_CLIENT_ID`).
   **Client Secret** → len do Supabase Secrets (`STRAVA_CLIENT_SECRET`).
3. Nová aplikácia zvládne prvých ~10 pripojených bikerov. Pred spustením pre všetkých ju treba poslať Strave na schválenie
   (formulár na stránke API aplikácie).
4. Pravidlá Stravy: údaje zo Stravy smie vidieť **len ich majiteľ** – aplikácia ich ostatným neukazuje.

---

## 3. Instagram (≈ 20 min + schválenie Metou)

1. https://developers.facebook.com → **My Apps → Create App** → použitie „Instagram“ (Instagram API).
2. **Instagram → API setup with Instagram business login** → **Set up Instagram business login**:
   - Redirect URL (OAuth redirect URI): `https://elitebikersk.github.io/elitebiker-ride/`
   - Oprávnenie: `instagram_business_basic`
3. **Instagram app ID** → `js/config.js` (`IG_APP_ID`).
   **Instagram app secret** → Supabase Secrets (`IG_APP_SECRET`).
4. **Kým aplikácia nie je schválená**, prihlásiť sa môžu len ľudia pridaní ako testeri:
   **App roles → Roles → Instagram Testers** → pridať @meno. Tester potvrdí v Instagrame
   (Nastavenia → Aplikácie a webové stránky → Pozvánky testerov). Na pilot s pár ľuďmi stačí.
5. **Pre všetkých**: App Review pre `instagram_business_basic` + overenie firmy (Business Verification),
   do nastavení aplikácie:
   - Privacy Policy URL: `https://elitebikersk.github.io/elitebiker-ride/privacy.html`
   - User data deletion: `https://elitebikersk.github.io/elitebiker-ride/privacy.html`
   - ikona aplikácie, krátke video, ako sa prihlásenie používa. Schválenie trvá zvyčajne pár dní až týždňov.

**Obmedzenia Instagramu:** prihlásiť sa dá len s účtom tvorcu alebo firemným účtom (prepnutie je zadarmo
v Instagrame: Nastavenia → Typ účtu). Kto ho nemá, prihlási sa e-mailom a @meno a fotku zadá sám.
Instagram nedovoľuje zistiť, koho človek sleduje – kamoši sa pridávajú podľa @mena alebo odkazom.

---

## 4. Zapnutie

Vyplň `js/config.js` (URL, anon key, IG_APP_ID, STRAVA_CLIENT_ID), ulož do GitHubu – o minútu beží ostrá verzia.

## Čo robí server
- **Chat** vidia len účastníci jazdy a po skončení jazdy ho každých 15 minút maže úloha `eb-ride-chat-cleanup`.
- **Jazdu** vidia len pozvaní (pravidlá prístupu priamo v databáze – nedajú sa obísť z prehliadača).
- **Fotky** z jázd sú v súkromnom úložisku, profilovky vo verejnom.
- **Zmazanie účtu** v Profile zmaže všetky údaje a odpojí Instagram aj Stravu.
