# EliteBiker Ride · Nejazdi sám

Aplikácia od [EliteBiker](https://www.elitebiker.sk/) na spoločné jazdy s partiou.
Daj kamošom vedieť, kedy ideš na bike (cesta, gravel, horský, e-bike), a pridaj sa k nim, keď idú oni.

**Stránka:** https://elitebikersk.github.io/elitebiker-ride/

## Funkcie
- Prihlásenie **e-mailom a heslom** alebo kódom z e-mailu. Profil: meno, fotka, vek, mesto a **Instagram / Facebook**, aby si kamoši vedeli napísať.
- **Jazdy**: typ, deň a čas, **stretko na mape so špendlikom** (posúvaš mapu ako vo Wolte, vyhľadávanie adries, moja poloha),
  **trasa nakreslená ťukaním na mapu** s výpočtom km, tempo, poznámka. Navigácia na stretko cez Google Mapy / Waze.
- **Zopakuj obvyklú jazdu** jedným ťukom.
- **Kto jazdu uvidí?** 🌍 **verejná** (každý biker do 30 km od stretka sa môže pridať), 👥 **pre partiu** (pozvaní môžu pozvať ďalších)
  alebo 🔒 **len pre vybraných** (ďalej sa nedá poslať). Skratky ako na Snapchate, pozývanie odkazom aj ľudí bez appky.
- **Verejné jazdy v okolí**: podľa mesta v profile (do 30 km), presná poloha sa nezisťuje.
- **Chat len pre účastníkov**, po skončení jazdy sa zmaže. Profilovka sa pred nahraním dá orezať do kruhu.
- **Zdieľanie s EliteBiker dizajnom** (ako na Strave): fotka z mobilu (oreže sa na formát, nikam sa nenahráva) s číslami (km, stúpanie, čas), trasou a logom, štýly Štatistiky, Trasa, Partia a priehľadná Nálepka, formát Príbeh 9:16 alebo Príspevok 4:5. Obrázok sa kreslí v telefóne.
- **Moje bicykle**: výber z ponuky elitebiker.sk, bicykle aj elektrobicykle (aktualizuje sa každý deň), alebo vlastný názov; kamoši ich vidia pri mene.
- **Profil kamoša**: klik na priateľa ukáže vek, mesto, kontakt, na čom jazdí, bicykle a jeho najbližšiu jazdu. Vek a mesto vidia len priatelia.
- **Nová jazda podľa bicykla**: pri ceste a gravel tempo a trasa, pri horskom a e-bike farby trailov (zelená, modrá, červená, čierna), dirt bez nich. V detaile jazdy sa ukážu len vyplnené údaje. Predvolene môžu účastníci pozvať ďalších, zaškrtnutím „len pozvaní“.
- **Upozornenia do mobilu**: žiadosť o priateľstvo, prijatie, pozvánka na jazdu, kto sa pridal k jazde, zlé počasie. V Profile jedno tlačidlo na zapnutie a skúšobné upozornenie. Na iPhone appka ukáže, ako si ju pridať na plochu, a po otvorení z plochy sa raz opýta na upozornenia.
- **EliteBiker Klub**: pripravujeme (v appke zatiaľ len ukážka). Body už počíta server, odmeny a zľavy prídu neskôr.
- **Administrácia** (`admin.html`) s dvojstupňovým overením: používatelia, body, vydanie odmeny, verejné jazdy, záznam zmien.
- **Ochrana**: RLS + stĺpcové práva, súkromné profily, limity proti zneužitiu, tajné kľúče vo Vaulte, CSP, vlastné písmo, zmazanie účtu a údajov.
- Responzívne (mobil, tablet, počítač), dá sa pridať na plochu telefónu s ikonkou EliteBiker.

## Technicky
- Statická stránka (HTML/CSS/JS bez buildu) na GitHub Pages.
- Server: **Supabase**: PostgreSQL s pravidlami prístupu (RLS), prihlásenie, realtime chat, úložisko, Edge Functions.
- Mapy: Leaflet + OpenStreetMap, adresy cez Nominatim.
- `supabase/schema.sql`: databáza, `supabase/functions/`: serverové funkcie (zmazanie účtu, počasie, upozornenia `notify`, katalóg bicyklov `bike-catalog`).
- `js/crop.js`: orezanie fotky pred nahraním.
- Bez vyplneného `js/config.js` beží **skúšobný režim** s vymyslenými údajmi (`js/mock.js`).

## Zapojenie
Návod krok za krokom: [SETUP.md](SETUP.md)

## Lokálne
```bash
python3 -m http.server 8080   # potom http://localhost:8080
```
