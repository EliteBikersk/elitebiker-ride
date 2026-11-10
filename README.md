# EliteBiker Ride – nejazdi sám

Aplikácia od [EliteBiker](https://www.elitebiker.sk/) na spoločné jazdy s partiou.
Daj kamošom vedieť, kedy ideš na bike (cesta, gravel, horský, e-bike), a pridaj sa k nim, keď idú oni.

**Stránka:** https://elitebikersk.github.io/elitebiker-ride/

## Funkcie
- Prihlásenie **e-mailom** (odkaz alebo kód, bez hesla). Profil: meno, fotka, vek, mesto a **Instagram / Facebook**, aby si kamoši vedeli napísať.
- **Jazdy**: typ, deň a čas, **stretko na mape so špendlikom** (posúvaš mapu ako vo Wolte, vyhľadávanie adries, moja poloha),
  **trasa nakreslená ťukaním na mapu** s výpočtom km, tempo, poznámka. Navigácia na stretko cez Google Mapy / Waze.
- **Zopakuj obvyklú jazdu** jedným ťukom.
- **Komu pošleš jazdu?** – skratky ako na Snapchate (vlastné skupiny), jazdu vidia len vybraní.
  Organizátor rozhodne, či môžu pozývať aj účastníci.
- **Chat len pre účastníkov**, po skončení jazdy sa zmaže. **Fotky z jazdy** ostávajú.
- **EliteBiker Klub**: body, odmeny (kontrola a servis zdarma…), zľavy pre členov, odkazy do e-shopu.
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
