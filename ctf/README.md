# Red vs Blue CTF – feladatbank

Egyéni, jeopardy-stílusú CTF játékmód a Red vs Blue webapphoz. Három pálya közül lehet választani, azonos
felépítéssel, pontozással és ranglistával:

- **Blue – incidenskezelés** (`side = blue`): riasztástól a helyreállításig; a támadói módszerek csak a
  bizonyítékokban, felismerendő nyomként jelennek meg.
- **Red – behatolásteszt** (`side = red`): egy *engedélyezett* penetration test 7 szakasza a felderítéstől
  az adatszivárogtatásig. Minden anyag szintetikus, a feladatok kizárólag elemzésről szólnak – nincs működő
  exploit, futtatható kártevő vagy lépésről-lépésre támadási leírás.
- **OSINT – nyilvános lábnyom felmérése** (`side = osint`): egy kitalált cég megbízásából felméred, mit lát
  kívülről a cég nyilvános digitális lábnyomából, hogy csökkenthető legyen a támadási felület. 7 szakasz a
  webes lábnyomtól a kockázati jelentésig, kizárólag nyílt forrású, szintetikus adatokon.

A szabályterv: [Red vs Blue CTF – szabályterv és játékmenet](https://claude.ai/artifact/3EzsQwQ324WrNDFcFgay5K).

## Szerkezet

```
ctf/
  tasks/<side>/<mode>/L<réteg>/<feladat-id>/
    task.json   leírás, kulcsok, 4 részzászló hash-sel, 3 fokozatú tippek (HU/EN)
    files/      a feladat szintetikus anyagai
  index.json    automatikusan generált lista (ne kézzel szerkeszd)
  tools/build_index.py   ellenőrzés + indexgenerálás
```

- `side`: `blue` (incidenskezelés), `red` (behatolásteszt) vagy `osint` (nyilvános lábnyom), `mode`: `easy` | `hard`, réteg: 1–7.
- Minden réteg rögzített kulcstípust ad tovább (mindhárom pályán ugyanaz), így bármelyik két változat
  összeilleszthető: 1 `hostname` → 2 `account` → 3 `time` → 4 `domain` → 5 `subnet` → 6 `keyword` → 7 `final`.
- Red rétegek: 1 felderítés → 2 kezdeti hozzáférés → 3 végrehajtás → 4 megmaradás → 5 jogosultságemelés →
  6 oldalirányú mozgás → 7 adatszivárogtatás.
- OSINT rétegek: 1 webes lábnyom → 2 munkatársak és közösségi média → 3 kép-metaadat → 4 a cég saját domainjei →
  5 a cég saját IP-tartománya → 6 archívumok és régi oldalak → 7 kockázati jelentés.
- Sorsoláskor a játék egy teljes, azonos történetű láncot választ (az azonosítók csak a réteg számában térnek el,
  pl. `blue-easy-L1-kfl` … `blue-easy-L7-kfl`); ha nincs teljes lánc, rétegenként sorsol.
- Nyílt válasz soha nem kerül a repóba. A megoldókulcs az oktatónál van.

## Döntési incidenskezelés (`ctf/dontes/`)

Fiók nélkül játszható, elágazó történetű mód: naplóelemzés helyett esetleírásokat kapsz, és döntéseket
hozol. Minden döntés más következménnyel jár (három mérő: Működés, Bizonyítékok, Bizalom), és a történet
onnan folytatódik. Esetenként több befejezés (S–F értékelés), a végén a döntések visszajátszása a bevált
gyakorlattal. Időnyomás kapcsolható, animációk (a `prefers-reduced-motion` beállítást követi), HU/EN, sötét mód.

- `dontes/scenarios.js` – az esetek gráfként (döntési pontok, feltételes elágazások, befejezések), a fájl elején leírt formátumban.
- `dontes/engine.js` – tiszta játékmotor (pontozás, elágazás, az összes útvonal bejárása).
- `node ctf/tools/check_dontes.js` – ellenőrzi a gráfot (hivatkozások, HU/EN szövegek, elérhetőség); a GitHub Action is futtatja.
- `python3 ctf/tools/build_dontes_standalone.py <kimenet.html>` – önálló, egyfájlos változat.

Az eredmények csak a böngészőben tárolódnak (`localStorage`), a ranglistába nem kerülnek.

## Zászlóellenőrzés

A böngésző ellenőriz: `sha256("<feladat-id>:<zászló-id>:" + norm(válasz))`, ahol

```js
const norm = s => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
```

## Új feladat hozzáadása

1. Hozd létre a mappát a fenti szerkezetben, `task.json` + `files/`.
2. Minden fájl szintetikus legyen: kitalált cég, `.example` domainek, dokumentációs IP-tartományok,
   futtatható kártevő és működő exploit nélkül.
3. `python3 ctf/tools/build_index.py` – ha hibát ír, javítsd. Push után a GitHub Action is lefuttatja.

## A játék futtatása

A CTF-mód a `ctf/index.html` oldal; a főmenüben a „CTF – zászlószerzés” kártya nyitja meg.
A feladatokat a böngésző `fetch`-csel tölti be, ezért webszerverről kell futnia (GitHub Pages, vagy helyben
`python3 -m http.server` a repó gyökeréből, majd `http://localhost:8000/ctf/`). Közvetlenül fájlként megnyitva nem működik.

### Önálló, egyfájlos változat

`python3 ctf/tools/build_standalone.py RedVsBlue_CTF.html` minden feladatot beágyaz egyetlen HTML-fájlba.
Ez szerver és adatbázis nélkül, dupla kattintással is fut (mindig helyi próbamódban).
A feladatbank minden módosítása után újra kell generálni.

### Helyi próbamód

Ha a `ctf/config.js`-ben üres a Supabase URL és kulcs, a játék helyi próbamódban fut: a fiókok, játékok és
naplók csak az adott böngésző localStorage-ában vannak. Az oktatói felületet ilyenkor a `localInstructors`
listában szereplő felhasználónevek látják (alapból: `oktato`).

### Online mód (Supabase)

1. Hozz létre egy ingyenes projektet a [supabase.com](https://supabase.com) oldalon.
2. Authentication → Sign In / Providers → Email: kapcsold ki a „Confirm email” opciót.
3. SQL Editor: futtasd le a `ctf/supabase/schema.sql` teljes tartalmát.
4. Project Settings → API: másold a Project URL-t és az `anon` kulcsot a `ctf/config.js`-be.
5. Authentication → Policies / Rate Limits: a jelszó minimális hossza legyen 8 (a játék is ennyit kér),
   a regisztráció és a belépés rate limitjét hagyd bekapcsolva (alapértelmezett).
6. Oktatói jog: regisztrálj a játékban, majd az SQL Editorban:
   `update public.profiles set role = 'instructor' where username = '<név>';`

A játékosok regisztrációkor mindig `player` szerepkört kapnak; oktatóvá csak az adatbázisban lehet valakit tenni.

**Már működő adatbázis frissítése (migráció).** A `games.side` ellenőrzés most már három pályát enged
(`blue`, `red`, `osint`, valamint a döntési módhoz `dontes`). Ha a sémát korábban futtattad le (csak `blue`/`red` engedéllyel), az OSINT-játékok
online mentése addig hibát ad, amíg le nem futtatod az SQL Editorban:

```sql
alter table public.games drop constraint games_side_check,
  add constraint games_side_check check (side in ('blue', 'red', 'osint', 'dontes'));
create or replace view public.leaderboard as
  select p.username, g.side, g.mode, g.score, g.layer, g.closed, g.updated_at,
         case when g.side = 'dontes' then g.state->>'cid' end as cid
  from public.games g join public.profiles p on p.id = g.user_id;
grant select on public.leaderboard to authenticated;
revoke all on public.leaderboard from anon, public;
```

A `dontes` érték a döntési incidenskezelés-mód (`ctf/dontes/`) eredményeihez kell: a befejezett eset egy
lezárt sorként kerül a `games` táblába (`mode` = `hard`, ha időre ment), a `state.cid` mondja meg, melyik eset.
A ranglistán külön fülön jelennek meg. Amíg a migráció nem fut le, a döntési módban a mentés hibát jelez,
az eredmény pedig a böngészőben megmarad, és később újra menthető.

(A megszorítás neve eltérhet – nézd meg a `games` tábla megszorításait a Supabase felületén.)
Helyi próbamódot és az önálló, egyfájlos változatot ez nem érinti.

## Pontozás röviden

- A k-adik réteg legfeljebb 100 × k pont (nehéz módban × 1,5), 4 részzászló, egyenként 25%.
- 2 megoldott részzászló nyitja a következő réteget, és ekkor fejthető vissza a kulcs.
- Ha a játékos már megnyitott egy későbbi réteget, a korábbi rétegek maradék részzászlói fél pontot érnek.
- Tippek: 10%, 25%, 50% levonás az adott részzászló értékéből, összeadódva.
