# Indulás előtti biztonsági ellenőrzőlista

> Vibe-codinggal készült alkalmazásokhoz. Másold a projekt gyökerébe (pl. `SECURITY_CHECKLIST.md` vagy `docs/` mappába), és pipáld ki a pontokat élesítés előtt.
> Forrás: @breakingbreach videója, kiegészítő magyarázatokkal.

**Projekt:** Red vs Blue (webapp + CTF, GitHub Pages + Supabase)  **Ellenőrizte:** Claude, Ákos kérésére  **Dátum:** 2026-11-06

---

## Hogyan használd Claude-dal

Másold be ezt a promptot (pl. Claude Code-ban a projekt mappájában):

```text
Nézd át ezt a projektet a SECURITY_CHECKLIST.md alapján. Minden pontnál:
1. ellenőrizd a kódban, hogy teljesül-e,
2. ha nem, javítsd ki (vagy írd le, miért nem lehet),
3. teszteld a javítást,
4. pipáld ki a pontot, és írd be az eredményt a „Jelentés” táblázatba
   (Javítva / Nyitott / Nem releváns / Ellenőrizve).
A végén adj összefoglaló jelentést a megállapításokról és a javításokról.
Ne commitolj titkos kulcsot, és ne töröld a Git-előzményeket engedély nélkül.
```

---

## 1. Hitelesítés és hozzáférés

- [x] **Rendes hitelesítés:** bevált auth-megoldás (kész könyvtár vagy szolgáltatás), nem saját fejlesztésű.
- [x] **Jelszavak hashelése:** Argon2id vagy bcrypt. Jelszó soha nem kerül tárolásra nyílt szövegként.
- [x] **Admin útvonalak lezárása:** a szerver minden kérésnél ellenőrzi a szerepkört (nem admin → `403`).
- [x] **Biztonságos session-sütik:** `HttpOnly`, `Secure`, `SameSite=Lax/Strict`.
- [x] **CSRF-védelem:** token vagy SameSite süti minden állapotot módosító kéréshez.
- [x] **Lejáró jelszó-visszaállító linkek:** rövid élettartam (pl. 15–60 perc), egyszer használható token.

## 2. Titkok és kulcsok

- [x] **API-kulcsok elrejtése:** titkos kulcs nem kerülhet a böngészőben futó kódba.
- [x] **Környezeti változók ellenőrzése:** mi jut ki a kliensre (`NEXT_PUBLIC_`, `VITE_`, `REACT_APP_` előtag)? A `.env` szerepel a `.gitignore`-ban?
- [x] **Git-előzmények átvizsgálása:** kiszivárgott titkok keresése (pl. `gitleaks`, `trufflehog`).
- [x] **Kompromittált kulcsok visszavonása és cseréje:** a törlés az előzményekből önmagában nem elég, a kulcsot le kell cserélni.

## 3. Adatok és bemenetek

- [x] **Adatbázis védelme:** minimális jogosultság, sorszintű hozzáférés-szabályok (pl. Supabase RLS), nem publikus elérés.
- [x] **Paraméterezett lekérdezések:** stringből összefűzött SQL helyett paraméterek vagy ORM.
- [x] **Szerveroldali űrlap-validáció:** a kliensoldali ellenőrzés csak kényelmi funkció, a szerver mindent újraellenőriz.
- [x] **XSS elleni védelem:** felhasználói tartalom escape-elése, nincs ellenőrizetlen `innerHTML` / `dangerouslySetInnerHTML`.
- [x] **Fájlfeltöltés korlátozása:** típus, méret és tényleges tartalom ellenőrzése (pl. csak kép, max. 10 MB), futtatható fájl elutasítása.
- [x] **Árak és fizetések ellenőrzése:** az árat a szerver számolja, a fizetést a szolgáltató webhookja igazolja. A kliens által küldött árban nem bízunk.

## 4. Szerver és hálózat

- [x] **HTTPS kikényszerítése:** HTTP → HTTPS átirányítás + HSTS.
- [ ] **Biztonsági fejlécek:** `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` / `frame-ancestors`, `Referrer-Policy`.
- [x] **Szigorú CORS:** csak a saját domain(ek) engedélyezése, nincs `*` hitelesített kéréseknél.
- [ ] **Rate limiting:** főleg a bejelentkezésen, a regisztráción, a jelszó-visszaállításon és az API-végpontokon.
- [x] **Éles debug mód kikapcsolása:** a felhasználó nem kap részletes hibaüzenetet és stack trace-t.
- [x] **Kitett fájlok keresése:** nyilvánosan elérhető-e a `.env`, a `.git/`, egy biztonsági mentés vagy egy source map?

## 5. Függőségek

- [x] **Sérülékeny függőségek frissítése:** `npm audit` / `pnpm audit` / `pip-audit`, Dependabot vagy Renovate bekapcsolása.
- [x] **Nem használt csomagok eltávolítása:** minden felesleges csomag növeli a támadási felületet (pl. `depcheck`).

## 6. Monitorozás és lezárás

- [ ] **Gyanús tevékenység naplózása és figyelése:** sikertelen belépések, jogosultsági hibák, szokatlan forgalom, riasztással. Jelszó és token ne kerüljön a naplóba.
- [x] **Alapos biztonsági átvizsgálás:** a teljes kódbázis átnézése a fenti szempontok szerint.
- [x] **A védelmek tesztelése:** minden javítás újratesztelése (pl. nem admin felhasználóval az admin útvonal, rossz fájltípus feltöltése, módosított ár a kérésben).

---

## Jelentés

**Mit néztem át:** `index.html` (a fő webapp, és a régebbi `1.3.html`, `2.0.html`, `csapat.html`), `ctf/index.html`, `ctf/config.js`,
`ctf/supabase/schema.sql`, `ctf/tools/*.py`, `.github/workflows/ctf-index.yml`, a teljes Git-előzmény (74 commit).

**Felépítés röviden:** statikus oldalak a GitHub Pagesen, saját szerver nélkül. A kártyajáték online módja nyilvános MQTT-brókereken
(wss) fut, a házigazda böngészője a játékállapot gazdája. A CTF a Supabase-t használja (Supabase Auth + REST + RLS).
Fizetés, fájlfeltöltés, e-mail nincs.

| # | Pont | Állapot | Megjegyzés / javítás |
|---|------|---------|----------------------|
| 1 | Hitelesítés | 🔍 Ellenőrizve | CTF: Supabase Auth (nem saját). A webapp nem használ fiókot. Helyi próbamódban (Supabase nélkül) saját, csak böngészőn belüli fiók van: ez demó, valódi védelmet nem ad, és nem is kell neki. |
| 2 | Jelszó-hashelés | 🔍 Ellenőrizve | Supabase Auth bcrypttel tárol. Helyi próbamódban sózott SHA-256 a localStorage-ban (csak demó, nem éles). |
| 3 | Admin útvonalak | 🔍 Ellenőrizve | Oktatói jog = `profiles.role`, amit a játékos nem írhat (nincs update policy). Törlés csak oktatóval (`games_delete`). Tesztelve: sima játékos nem lát, nem módosít, nem töröl más játszmát, és nem teheti magát oktatóvá. |
| 4 | Session-sütik | ➖ Nem releváns | Nincs süti. A Supabase tokenek a localStorage-ban vannak (mint a supabase-js-nél); XSS ellen az escape-elés és az új CSP véd. |
| 5 | CSRF | ➖ Nem releváns | A kérések `Authorization: Bearer` fejléccel mennek, nem sütivel, így CSRF nem alkalmazható. |
| 6 | Jelszó-visszaállító linkek | ➖ Nem releváns | Nincs jelszó-visszaállítás (kitalált e-mail-címek). Elfelejtett jelszót az oktató a Supabase felületen állít vissza. |
| 7 | API-kulcsok | 🔍 Ellenőrizve | A böngészőben csak a nyilvános `sb_publishable_…` kulcs van, ami szándékosan nyilvános; a védelmet az RLS adja. Titkos (`service_role`/`sb_secret_`) kulcs sehol. Figyelmeztető megjegyzés került a `config.js`-be. |
| 8 | Környezeti változók | ✅ Javítva | Nincs build és `.env`. Új `.gitignore`: `.env*`, kulcsfájlok és a `megoldokulcs*.json` megoldókulcsok nem kerülhetnek a repóba (a Pages mindent kiszolgál). |
| 9 | Git-előzmények | 🔍 Ellenőrizve | Mind a 74 commit átnézve mintakereséssel (JWT, `service_role`, `sb_secret_`, privát kulcs, GitHub/AWS/OpenAI token, jelszó-literál): nincs találat. Nyílt CTF-válasz sincs a repóban (csak hash). gitleaks nem volt telepíthető, ezért regex-keresés. |
| 10 | Kulcscsere | ➖ Nem releváns | Nem szivárgott ki titkos kulcs, nincs mit cserélni. |
| 11 | Adatbázis | ✅ Javítva | RLS mindhárom táblán. Új: `anon` szerepkörtől minden táblajog visszavonva; eseményt csak a saját játszmához lehet írni (eddig bármelyik játszma azonosítójával lehetett). Helyi Postgresen, Supabase-szerű szerepkörökkel tesztelve. **Teendő:** a `schema.sql`-t újra le kell futtatni a Supabase SQL Editorban. |
| 12 | Paraméterezett lekérdezések | 🔍 Ellenőrizve | Nincs saját SQL a kliensben, csak PostgREST URL-szűrők; az értékek a saját uid és UUID-k. |
| 13 | Szerveroldali validáció | ✅ Javítva (részben) | Új triggerek: pontszám 0 és az elérhető maximum (könnyű 2800, nehéz 4208) között, nem csökkenhet; réteg 1–7; tulajdonos, oldal, mód, kezdés nem írható át; állapot ≤ 64 KB; eseménytípus csak az ismert 9 közül, adat ≤ 2 KB, időbélyeget a szerver adja. **Marad:** a zászlókat a böngésző ellenőrzi, így egy ügyes játékos a REST API-n át a maximumig felírhatja a pontját. Teljes megoldás egy szerveroldali `submit_flag` függvény lenne (lásd lent). |
| 14 | XSS | ✅ Javítva | Minden `innerHTML`-be kerülő felhasználói/hálózati adat `esc()`-en megy át (nevek, játékkód, napló, felhasználónév, eseményadat) – ellenőrizve. Új: Content-Security-Policy minden oldalon (csak saját szkript, `object-src 'none'`, `base-uri 'none'`, kimenő kapcsolat csak a 4 MQTT-brókerhez, ill. a Supabase-hez). Javítva még: CSV-export képletinjekció (`=`, `+`, `-`, `@` kezdetű cella semlegesítve) az oktató gépének védelmére. |
| 15 | Fájlfeltöltés | ➖ Nem releváns | Nincs feltöltés. |
| 16 | Árak és fizetések | ➖ Nem releváns | Nincs fizetés. |
| 17 | HTTPS | 🔍 Ellenőrizve | A `*.github.io` címen a GitHub Pages kötelezően HTTPS-t ad, és a domain HSTS-preload listán van. MQTT: csak `wss://`. Az éles oldalt a felhős környezet hálózati tiltása miatt nem tudtam lekérni. |
| 18 | Biztonsági fejlécek | ⚠️ Nyitott (részben javítva) | A GitHub Pages nem enged saját fejlécet. Javítva meta tagként: CSP és `Referrer-Policy`. `X-Content-Type-Options: nosniff`-et a Pages magától küld. **Marad:** `frame-ancestors` / `X-Frame-Options` meta tagként nem működik; ehhez CDN (pl. Cloudflare) kell a Pages elé. Kockázat alacsony (nincs pénz vagy érzékeny adat). |
| 19 | CORS | 🔍 Ellenőrizve | Nincs saját API. A Supabase REST mindenhonnan elérhető, de csak érvényes tokennel és RLS mellett ad adatot. |
| 20 | Rate limiting | ⚠️ Nyitott | Saját szerver nincs, a Supabase Auth beépített korlátai védik a belépést és a regisztrációt (README-be került, hogy maradjanak bekapcsolva, és a jelszó min. hossza 8 legyen a dashboardon). A REST-írásokra (játszma, esemény) nincs korlát; diákcsoportnál elfogadható. Az MQTT-brókerek nyilvánosak, ott a házigazda minden lépést szabály szerint ellenőriz. |
| 21 | Debug mód | 🔍 Ellenőrizve | Nincs debug kimenet; a felhasználó rövid hibaüzenetet kap. Javítva: hibás, hálózatról jövő lépés eddig kivételt dobhatott a házigazdánál, most „Érvénytelen lépés.” választ kap. |
| 22 | Kitett fájlok | 🔍 Ellenőrizve | A Pages a `.git/`-et nem szolgálja ki; nincs `.env`, mentés vagy source map. A `schema.sql` és a Python-eszközök nyilvánosak, de titkot nem tartalmaznak. A régi `1.3.html`, `2.0.html`, `csapat.html` is nyilvános – javaslat: töröld őket, ha már nem kellenek (CSP-t kaptak). |
| 23 | Sérülékeny függőségek | ✅ Javítva | Nincs npm/pip függőség (a Python-eszközök csak a standard könyvtárat használják). Új `.github/dependabot.yml` a GitHub Actions verzióihoz. |
| 24 | Nem használt csomagok | ➖ Nem releváns | Nincs csomag. Külső erőforrás csak a Google Fonts. |
| 25 | Naplózás és monitorozás | ⚠️ Nyitott | A CTF eseménynaplója (beküldések, tippek) az oktatói felületen látszik, jelszó és token nem kerül bele. Riasztás nincs; a Supabase dashboard Auth/API naplóiból kézzel nézhető. |
| 26 | Biztonsági átvizsgálás | 🔍 Ellenőrizve | Ez a jelentés. |
| 27 | Védelmek tesztelése | 🔍 Ellenőrizve | Lásd lent. |

### Elvégzett tesztek

- **Adatbázis** (helyi PostgreSQL 16, Supabase-szerű `anon`/`authenticated` szerepkörök, `auth.uid()` utánzat): a séma kétszer egymás után lefut;
  normál mentés és upsert működik; 99999 pont, pontcsökkentés, módváltás, 4209 pont nehéz módban, ismeretlen eseménytípus, túl nagy eseményadat
  elutasítva; másik játékos játszmájába eseményt írni, azt olvasni, módosítani, törölni nem lehet; magát oktatóvá tenni nem lehet; `anon` semmit nem olvas.
- **Böngésző** (Chromium): mind az 5 oldal CSP-hiba nélkül betölt és kattintható; engedélyezett MQTT-bróker és a Supabase-cím átmegy,
  idegen cím (`evil.example.com`) blokkolva. CTF helyi módban: regisztráció, játék, hibás válasz, oktatói CSV-export működik; `=`-vel kezdődő cella semlegesítve.
- **Házigazda:** rosszul formázott hálózati lépés nem dob kivételt, hanem elutasítja.

### Mi marad a te teendőd

1. A Supabase SQL Editorban futtasd le újra a teljes `ctf/supabase/schema.sql`-t (újrafuttatható).
2. Supabase → Authentication: jelszó minimális hossza 8, rate limitek maradjanak bekapcsolva.
3. Ha nem kellenek, töröld a régi `1.3.html`, `2.0.html`, `csapat.html` oldalakat.

### Tudatos kompromisszumok

- **CTF-zászlók a böngészőben:** a válaszok sózott SHA-256 hashként vannak a nyilvános `task.json`-okban. Rövid válasz (pl. gépnév) visszafejthető
  próbálgatással, de a válasz amúgy is a bizonyítékfájlokban van; a pontszám-ellenőrzés így csak korlátoz. Ha a ranglista tétje nő,
  a következő lépés egy `security definer` `submit_flag(game, task, flag, answer)` függvény, amely a hasht privát táblából ellenőrzi és a pontot is ő írja.
- **Nyilvános MQTT-brókerek:** aki ismeri a 6 karakteres játékkódot, nézheti a játékot; lépést csak a házigazda által ellenőrzött módon tehet. A játékban nincs érzékeny adat.
- **CSP `'unsafe-inline'`:** az oldalak egyfájlos, beágyazott szkripttel készülnek, ezért a szkript-hash helyett ez kell; a kimenő kapcsolatok és külső szkriptek tiltása így is véd az adatkiszivárgás ellen.

**Állapotkódok:** ✅ Javítva · ⚠️ Nyitott · ➖ Nem releváns · 🔍 Ellenőrizve
