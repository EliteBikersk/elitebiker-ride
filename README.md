# EliteBiker Ride – nejazdi sám

Demo aplikácie od [EliteBiker](https://www.elitebiker.sk/) na spoločné jazdy s partiou.
Daj kamošom vedieť, kedy ideš na bike (cesta, gravel, horský, e-bike), a pridaj sa k nim, keď idú oni.

**Živá stránka:** https://elitebikersk.github.io/elitebiker-ride/

## Čo demo ukazuje
- Prihlásenie cez Instagram – meno a profilová fotka z Instagramu, vek.
- Jazdy partie, „Pridám sa“, zopakovanie obvyklej jazdy jedným ťukom.
- „Komu pošleš jazdu?“ – skratky ako na Snapchate (MTB partia, Gravel pohodári, všetci priatelia…). Jazdu vidia len vybraní.
- Chat len pre účastníkov, po skončení jazdy sa zmaže. Fotky k jazde ostávajú.
- Strava (štatistiky, km od servisu – vidí ich len majiteľ), zdieľanie do Instagram Story.
- EliteBiker Klub – body, kontrola a servis zdarma, zľavy pre členov, odkazy do e-shopu.

## Technicky
- Jeden súbor `index.html` (HTML + CSS + JavaScript), bez buildu a závislostí.
- Responzívne: mobil (spodné menu), tablet (centrovaný obsah), počítač (bočné menu, detail jazdy ako panel vpravo), široký monitor (aj popis konceptu).
- Dá sa pridať na plochu telefónu (`manifest.webmanifest`).
- Údaje sú vymyslené a uložené len v pamäti prehliadača – po obnovení stránky sa demo vráti na začiatok.
- Prepojenie s Instagramom a Stravou je v deme simulované.

## Spustenie lokálne
Stačí otvoriť `index.html` v prehliadači.

## Nasadenie
GitHub Pages z vetvy `main`, priečinok `/` (root).
