# Red vs Blue CTF – feladatbank

Egyéni, jeopardy-stílusú CTF játékmód a Red vs Blue webapphoz. A szabályterv:
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

- `side`: `red` | `blue`, `mode`: `easy` | `hard`, réteg: 1–7.
- Minden réteg rögzített kulcstípust ad tovább, így bármelyik két változat összeilleszthető:
  1 `hostname` → 2 `account` → 3 `time` → 4 `domain` → 5 `subnet` → 6 `keyword` → 7 `final`.
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
