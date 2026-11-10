# EliteBiker Ride – nejazdi sám

Aplikácia od [EliteBiker](https://www.elitebiker.sk/) na spoločné jazdy s partiou.
Daj kamošom vedieť, kedy ideš na bike (cesta, gravel, horský, e-bike), a pridaj sa k nim, keď idú oni.

**Stránka:** https://elitebikersk.github.io/elitebiker-ride/

## Funkcie
- Prihlásenie **e-mailom a heslom** alebo kódom z e-mailu. Profil: meno, fotka, vek, mesto a **Instagram / Facebook**, aby si kamoši vedeli napísať.
- **Jazdy**: typ, deň a čas, **stretko na mape so špendlikom** (posúvaš mapu ako vo Wolte, vyhľadávanie adries, moja poloha),
  **trasa nakreslená ťukaním na mapu** s výpočtom km, tempo, poznámka. Navigácia na stretko cez Google Mapy / Waze.
- **Zopakuj obvyklú jazdu** jedným ťukom.
- **Kto jazdu uvidí?** – 🌍 **verejná** (každý biker do 30 km od stretka sa môže pridať), 👥 **pre partiu** (pozvaní môžu pozvať ďalších)
  alebo 🔒 **len pre vybraných** (ďalej sa nedá poslať). Skratky ako na Snapchate, pozývanie odkazom aj ľudí bez appky.
- **Verejné jazdy v okolí** – podľa mesta v profile (do 30 km), presná poloha sa nezisťuje.
- **Chat len pre účastníkov**, po skončení jazdy sa zmaže. **Fotky z jazdy** ostávajú.
- **EliteBiker Klub**: body počíta server, odmeny (kontrola a servis zdarma…), história bonusov, zľavy pre členov, odkazy do e-shopu.
- **Administrácia** (`admin.html`) s dvojstupňovým overením: používatelia, body, vydanie odmeny, verejné jazdy, záznam zmien.
- **Ochrana**: RLS + stĺpcové práva, súkromné profily, limity proti zneužitiu, tajné kľúče vo Vaulte, CSP, vlastné písmo, zmazanie účtu a údajov.
- Responzívne (mobil, tablet, počítač), dá sa pridať na plochu telefónu.

## Technicky
- Statická stránka (HTML/CSS/JS bez buildu) na GitHub Pages.
- Server: **Supabase** – PostgreSQL s pravidlami prístupu (RLS), prihlásenie, realtime chat, úložisko, Edge Functions.
- Mapy: Leaflet + OpenStreetMap, adresy cez Nominatim.
- `supabase/schema.sql` – databáza, `supabase/functions/delete-account` – zmazanie účtu.
- Bez vyplneného `js/config.js` beží **skúšobný režim** s vymyslenými údajmi (`js/mock.js`).

## Zapojenie
Návod krok za krokom: [SETUP.md](SETUP.md)

## Lokálne
```bash
python3 -m http.server 8080   # potom http://localhost:8080
```
