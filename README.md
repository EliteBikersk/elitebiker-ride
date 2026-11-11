# EliteBiker Ride · Nejazdi sám

Aplikácia od [EliteBiker](https://www.elitebiker.sk/) na spoločné jazdy s partiou.
Daj kamošom vedieť, kedy ideš na bike (cesta, gravel, horský, e-bike), a pridaj sa k nim, keď idú oni.

**Stránka:** https://elitebikersk.github.io/elitebiker-ride/

## Funkcie
- Prihlásenie **e-mailom a heslom** alebo kódom z e-mailu. Profil: meno, fotka, mesto a **Instagram / Facebook**, aby si kamoši vedeli napísať.
- **Jazdy**: typ, deň a čas, **stretko na mape so špendlikom** (posúvaš mapu ako vo Wolte, vyhľadávanie adries, moja poloha),
  **trasa nakreslená ťukaním na mapu** s výpočtom km, tempo, poznámka. Navigácia na stretko cez Google Mapy / Waze.
- **Zopakuj obvyklú jazdu** jedným ťukom. **Organizátor môže jazdu upraviť** aj po vytvorení (čas, stretko, typ, trasa, popis, limit), kým neskončí.
- **Kto jazdu uvidí?** 🌍 **verejná** (každý biker do 30 km od stretka sa môže pridať), 👥 **pre partiu** (pozvaní môžu pozvať ďalších)
  alebo 🔒 **len pre vybraných** (ďalej sa nedá poslať). Skratky ako na Snapchate, pozývanie odkazom aj ľudí bez appky.
- **Verejné jazdy v okolí**: podľa mesta v profile (do 30 km), presná poloha sa nezisťuje.
- **Chat len pre účastníkov**, po skončení jazdy sa zmaže. Profilovka sa pred nahraním dá orezať do kruhu.
- **V deň jazdy** tri rýchle tlačidlá: 📍 Som na mieste, ⏱️ Meškám 10 min, ❌ Nestihnem. Správa sa objaví v chate a ostatní dostanú upozornenie; pri „Nestihnem“ sa účastník z jazdy odhlási (organizátor nie).
- **Trasa z GPX** pri ceste a gravel: súbor z Garminu, Komootu alebo Stravy, appka spočíta km a stúpanie, trasu zjednoduší na najviac 500 bodov a ak chýba stretko, dá ho na štart trasy.
- **Nahlásiť a zablokovať** človeka (v jeho profile) alebo jazdu (dole v detaile). Zablokovaní sa navzájom nenájdu, nevidia verejné jazdy, správy v chate ani telefón; zoznam zablokovaných je v Profile.
- **Nový biker bez partie** vidí hore veľké „Pozvi kamošov“ a pod tým verejné jazdy v okolí.
- **Mám čas**: v karte „Ideš jazdiť?“ tlačidlo 🙋 Mám čas (dnes alebo zajtra, od koľkej, na čo má chuť). Priatelia dostanú upozornenie a v Jazdách vidia rad „Majú čas jazdiť“; ťuknutím založia spolu jazdu s predvyplneným dňom, časom a pozvaným kamošom.
- **Možno** pri jazde: nezaberá miesto, ukáže sa v „Kto ide“ a na karte jazdy. Kto dal možno, dostane upozornenie o zmene či zrušení a večer pred jazdou otázku „Ideš?“. Po pridaní sa k jazde možno zmizne.
- **Oficiálne jazdy EliteBiker**: admin pri posielaní zaškrtne „Oficiálna jazda EliteBiker“. Jazda je verejná, vidno ju do 60 km, je pripnutá hore v Jazdách a bikeri v okolí dostanú upozornenie.
- **Prihlásenie cez Google a Apple**: tlačidlá sa na prihlasovacej obrazovke ukážu samy, keď je poskytovateľ zapnutý v Supabase (návod v SETUP.md).
- **Rýchle otvorenie a slabý signál**: appka sa uloží do prehliadača (service worker), posledné jazdy a partiu ukáže hneď pri otvorení aj bez signálu, s pruhom „Si bez signálu“.
- **Zdieľanie s EliteBiker dizajnom** (ako na Strave): fotka z mobilu (oreže sa na formát, nikam sa nenahráva) s číslami (km, stúpanie, čas), trasou a logom, štýly Štatistiky, Trasa, Partia a priehľadná Nálepka, formát Príbeh 9:16 alebo Príspevok 4:5. Obrázok sa kreslí v telefóne.
- **Moje bicykle**: výber z ponuky elitebiker.sk, bicykle aj elektrobicykle (aktualizuje sa každý deň), alebo vlastný názov; kamoši ich vidia pri mene. Každý bicykel má typ (cesta, gravel, horský, e-bike, dirt/BMX): z ponuky sa priradí sám podľa kategórie e-shopu, inak si ho človek vyberie jedným ťuknutím. Pri jazde sa pri každom ukáže bicykel podľa typu jazdy (ak taký nemá, podobný: gravel a cesta, horský a e-bike).
- **Profil kamoša**: klik na priateľa ukáže mesto, kontakt, na čom jazdí, bicykle a jeho najbližšiu jazdu. Mesto vidia len priatelia. Vek appka nezbiera.
- **Nová jazda podľa bicykla**: pri ceste a gravel tempo a trasa, pri horskom a e-bike farby trailov (zelená, modrá, červená, čierna), dirt bez nich. V detaile jazdy sa ukážu len vyplnené údaje. Predvolene môžu účastníci pozvať ďalších, zaškrtnutím „len pozvaní“.
- **Upozornenia do mobilu**: žiadosť o priateľstvo, prijatie, pozvánka na jazdu, kto sa pridal k jazde, zmena alebo zrušenie jazdy, nová správa v chate, stav v deň jazdy, pripomienka večer pred jazdou a 2 hodiny pred ňou s počasím („Zajtra 17:00: Manín“, „12 °C, polojasno · idú 4“), zlé počasie a pre okolie Považskej Bystrice (do 40 km) pripomienka servisu v EliteBikeri pred sezónou a raz za rok. V Profile jedno tlačidlo na zapnutie, skúšobné upozornenie a výber, na čo chceš upozornenia (každá udalosť zvlášť). Na iPhone appka ukáže, ako si ju pridať na plochu, a po otvorení z plochy sa raz opýta na upozornenia.
- **EliteBiker Klub**: pripravujeme (v appke zatiaľ len ukážka). Body už počíta server, odmeny a zľavy prídu neskôr.
- **Telefón** (nepovinné): vidia ho len spolujazdci na tej istej jazde, kým jazda neskončí. V zozname „Kto ide“ je tlačidlo Zavolať.
- **Administrácia** (`admin.html`) s dvojstupňovým overením: len poradie a mená používateľov a súhrnné čísla o používaní (aktívni dnes, za 7 a 30 dní, otvorenia appky, noví, jazdy, zariadenia, graf po dňoch) a nahlásenia (nahlásená jazda alebo meno a dôvod, bez toho, kto nahlasoval; jazdu sa dá zrušiť). Žiadne osobné údaje.
- **Ochrana**: RLS + stĺpcové práva, súkromné profily, limity proti zneužitiu, tajné kľúče vo Vaulte, CSP, vlastné písmo, zmazanie účtu a údajov.
- Responzívne (mobil, tablet, počítač), dá sa pridať na plochu telefónu s ikonkou EliteBiker.

## Technicky
- Statická stránka (HTML/CSS/JS bez buildu) na GitHub Pages.
- Server: **Supabase**: PostgreSQL s pravidlami prístupu (RLS), prihlásenie, realtime chat, úložisko, Edge Functions.
- Mapy: Leaflet + OpenStreetMap, adresy cez Nominatim.
- `supabase/schema.sql`: databáza, `supabase/functions/`: serverové funkcie (zmazanie účtu, počasie, upozornenia `notify`, katalóg bicyklov `bike-catalog`).
- `js/crop.js`: orezanie fotky pred nahraním.
- Bez vyplneného `js/config.js` beží **skúšobný režim** s vymyslenými údajmi (`js/mock.js`).
- `sw.js`: upozornenia a cache samotnej appky (stránka a skripty najprv zo siete, pri slabom signáli po 3 s z cache; písmo a ikonky z cache). Údaje zo servera, mapy ani fotky do cache nejdú.
- `og.png`: náhľad pri zdieľaní odkazu (WhatsApp, Messenger, Facebook). Jeden spoločný pre všetky odkazy, lebo GitHub Pages je statická stránka.

## Zapojenie
Návod krok za krokom: [SETUP.md](SETUP.md)

## Lokálne
```bash
python3 -m http.server 8080   # potom http://localhost:8080
```
