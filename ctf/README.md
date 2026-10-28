# Red vs Blue CTF – feladatbank

Egyéni, jeopardy-stílusú CTF játékmód a Red vs Blue webapphoz. A játék kizárólag az incidenskezelésről szól
(riasztástól a helyreállításig); a támadói módszerek csak a bizonyítékokban, felismerendő nyomként jelennek meg. A szabályterv:
[Red vs Blue CTF – szabályterv és játékmenet](https://claude.ai/artifact/3EzsQwQ324WrNDFcFgay5K).

## Szerkezet

```
ctf/
  tasks/<side>/<mode>/L<réteg>/<feladat-id>/
    task.json   leírás, kulcsok, 4 részzászló hash-sel, 3 fokozatú tippek (HU/EN)
    files/      a feladat szintetikus anyagai
  index.json    automatikusan generált lista (ne kézzel szerkeszd)
  tools/build_index.py   ellenőrzés + index generálás
```

- `side`: mindig `blue` (incidenskezelés), `mode`: `easy` | `hard`, réteg: 1–7.
- Minden réteg rögzített kulcstípust ad tovább, így bármelyik két változat összeilleszthető:
  1 `hostname` → 2 `account` → 3 `time` → 4 `domain` → 5 `subnet` → 6 `keyword` → 7 `final`.
- Sorsoláskor a játék egy teljes, azonos történetű láncot választ (az azonosítók csak a réteg számában térnek el,
  pl. `blue-easy-L1-kfl` … `blue-easy-L7-kfl`); ha nincs teljes lánc, rétegenként sorsol.
- Nyílt válasz soha nem kerül a repóba. A megoldókulcs az oktatónál van.

## Zászló-ellenőrzés

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
5. Oktatói jog: regisztrálj a játékban, majd az SQL Editorban:
   `update public.profiles set role = 'instructor' where username = '<név>';`

A játékosok regisztrációkor mindig `player` szerepkört kapnak; oktatóvá csak az adatbázisban lehet valakit tenni.

## Pontozás röviden

- A k-adik réteg legfeljebb 100 × k pont (nehéz módban × 1,5), 4 részzászló, egyenként 25%.
- 2 megoldott részzászló nyitja a következő réteget, és ekkor fejthető vissza a kulcs.
- Ha a játékos már megnyitott egy későbbi réteget, a korábbi rétegek maradék részzászlói fél pontot érnek.
- Tippek: 10%, 25%, 50% levonás az adott részzászló értékéből, összeadódva.
