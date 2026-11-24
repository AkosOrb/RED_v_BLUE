#!/usr/bin/env node
// Ellenőrzi a döntési incidenskezelés eseteit (ctf/dontes/scenarios.js):
// minden hivatkozott csomópont létezik, minden szöveg megvan magyarul és angolul,
// minden döntési pont és befejezés elérhető, és kiírja az elérhető legtöbb pontot.
// Játéktervezési szabályok (Ákos, 2026-11-24): minden választásnak ára és haszna is van (legalább egy mérő
// nő és legalább egy csökken), döntési pontonként pontosan egy legjobb (100 pontos) válasz van, a legjobb
// útvonal legalább 8 döntésből áll, és minden esetben van visszalépés és előreugrás is. A legjobb pontszámot
// mindig a legjobb válaszok sorozata adja, és ebben nincs visszalépés.
// Futtatás a repó gyökeréből: node ctf/tools/check_dontes.js
const path = require('path');
globalThis.window = globalThis;
require(path.join(__dirname, '..', 'dontes', 'scenarios.js'));
require(path.join(__dirname, '..', 'dontes', 'engine.js'));
const E = globalThis.IR_ENGINE, errors = [];
const need = (ok, msg) => { if (!ok) errors.push(msg); };
const both = o => o && o.hu && o.en;
const PHASES = ['det', 'cont', 'erad', 'rec', 'comm', 'post'], KINDS = ['phone', 'mail', 'chat', 'alert', 'news', 'memo'];
for (const k of E.METERS) need(both(IR_FAIL[k].title) && both(IR_FAIL[k].text), `IR_FAIL.${k}: hiányzó szöveg`);
for (const c of IR_CASES) {
  for (const k of ['title', 'org', 'role', 'real', 'blurb', 'level']) need(both(c[k]), `${c.id}.${k}: hiányzó szöveg`);
  need(c.nodes[c.first], `${c.id}: hiányzó kezdő csomópont`);
  for (const [id, n] of Object.entries(c.nodes)) {
    const at = `${c.id}.${id}`;
    if (n.end) { need('SABCF'.includes(n.end) && both(n.title) && both(n.text), `${at}: hibás befejezés`); continue; }
    if (n.go) {
      n.go.forEach((b, bi) => {
        need(c.nodes[b.to], `${at}: ismeretlen cél ${b.to}`);
        if (b.kind) need(['back', 'jump'].includes(b.kind) && both(b.note), `${at}.${bi}: a fordulathoz (back/jump) magyarázat kell`);
        if (b.kind === 'back') need((b.set || []).some(f => (b.none || []).includes(f)), `${at}.${bi}: a visszalépést egyszeri jelző védje (set + none)`);
        if (b.kind === 'back') need((b.pts || 0) < 0, `${at}.${bi}: a visszalépésnek pontlevonással kell járnia`);
      }); need(!n.go[n.go.length - 1].any && !n.go[n.go.length - 1].none && n.go[n.go.length - 1].min == null, `${at}: az utolsó ágnak feltétel nélkülinek kell lennie`); continue; }
    need(PHASES.includes(n.phase), `${at}: ismeretlen szakasz ${n.phase}`);
    need(both(n.title) && both(n.text) && both(n.lesson), `${at}: hiányzó szöveg`);
    need(n.feed.every(m => KINDS.includes(m.k) && both(m.from) && both(m.text)), `${at}: hibás üzenet`);
    need(n.choices.length >= 3 && n.choices.length <= 4, `${at}: 3–4 választás kell`);
    need(n.choices.filter(ch => ch.pts === 100).length === 1, `${at}: pontosan egy 100 pontos (legjobb) válasz kell`);
    if (n.urgent) need(n.choices[n.timeout], `${at}: hiányzó timeout-választás`);
    n.choices.forEach((ch, i) => {
      need(both(ch.text) && both(ch.fb), `${at}.${i}: hiányzó szöveg`);
      need(c.nodes[ch.to], `${at}.${i}: ismeretlen cél ${ch.to}`);
      need(ch.pts >= 20 && ch.pts <= 100, `${at}.${i}: a pont 20–100 között legyen (nincs egyértelműen rossz válasz)`);
      const vals = E.METERS.map(k => (ch.d && ch.d[k]) || 0);
      need(vals.some(v => v > 0) && vals.some(v => v < 0), `${at}.${i}: minden választásnak ára és haszna is legyen (egy mérő nő, egy csökken)`);
    });
  }
  if (errors.length) continue;
  const x = E.explore(c, IR_FAIL);
  Object.keys(c.nodes).filter(id => c.nodes[id].choices).forEach(id => need(x.seen.includes(id), `${c.id}.${id}: elérhetetlen döntési pont`));
  Object.keys(c.nodes).filter(id => c.nodes[id].end).forEach(id => need(x.ends.includes(id), `${c.id}.${id}: elérhetetlen befejezés`));
  // greedy: always the 100-point answer
  let g = E.newRun(c);
  while (!g.end) g = E.choose(c, g, c.nodes[g.node].choices.findIndex(ch => ch.pts === 100));
  const gs = E.finalScore(c, g, IR_FAIL), turns = g.hist.flatMap(h => h.turns.map(t => t.kind));
  need(gs.total === x.max, `${c.id}: a legjobb válaszok sorozata ${gs.total} pont, de ${x.max} is elérhető`);
  need(g.hist.length >= 8, `${c.id}: a legjobb útvonal csak ${g.hist.length} döntés (legalább 8 kell)`);
  need(!turns.includes('back'), `${c.id}: a legjobb útvonalon nem lehet visszalépés`);
  need(gs.grade === 'S', `${c.id}: a legjobb útvonal nem S befejezéshez vezet (${g.end})`);
  need(x.kinds.includes('back') && x.kinds.includes('jump'), `${c.id}: kell elérhető visszalépés és előreugrás is`);
  const fails = x.ends.filter(e => e.startsWith('fail:')).map(e => e.slice(5)).sort();
  need(JSON.stringify(fails) === JSON.stringify([...(c.fails || [])].sort()), `${c.id}: a fails mező legyen ${JSON.stringify(fails)}`);
  need(E.reach(c, IR_FAIL).max === x.max, `${c.id}: a reach() maximuma eltér`);
  console.log(`${c.id}: ${x.paths} útvonal, ${E.endingIds(c, x.ends).length} befejezés, legtöbb ${x.max} pont, legjobb út ${g.hist.length} döntés (${E.METERS.map(k => g.m[k]).join('/')}), fordulatok: ${turns.join(',') || '–'}`);
}
// The best option must not be recognisable by its length: it may be the longest or the shortest
// in at most half of the decision points (per language).
for (const lang of ['hu', 'en']) {
  let multi = 0, longest = 0, shortest = 0;
  for (const c of IR_CASES) for (const n of Object.values(c.nodes)) {
    if (!n.choices || n.choices.length < 2) continue;
    const len = n.choices.map(ch => ch.text[lang].length), best = E.bestPts(n), bi = n.choices.findIndex(ch => ch.pts === best);
    multi++; if (len[bi] === Math.max(...len)) longest++; if (len[bi] === Math.min(...len)) shortest++;
  }
  console.log(`${lang}: a legjobb válasz ${longest}/${multi} helyen a leghosszabb, ${shortest}/${multi} helyen a legrövidebb`);
  need(longest * 2 <= multi && shortest * 2 <= multi, `${lang}: a válaszok hossza elárulja a legjobbat (leghosszabb ${longest}, legrövidebb ${shortest} / ${multi})`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('OK');
