#!/usr/bin/env node
// Ellenőrzi a döntési incidenskezelés eseteit (ctf/dontes/scenarios.js):
// minden hivatkozott csomópont létezik, minden szöveg megvan magyarul és angolul,
// minden döntési pont és befejezés elérhető, és kiírja az elérhető legtöbb pontot.
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
    if (n.go) { n.go.forEach(b => need(c.nodes[b.to], `${at}: ismeretlen cél ${b.to}`)); need(!n.go[n.go.length - 1].any && !n.go[n.go.length - 1].none && n.go[n.go.length - 1].min == null, `${at}: az utolsó ágnak feltétel nélkülinek kell lennie`); continue; }
    need(PHASES.includes(n.phase), `${at}: ismeretlen szakasz ${n.phase}`);
    need(both(n.title) && both(n.text) && both(n.lesson), `${at}: hiányzó szöveg`);
    need(n.feed.every(m => KINDS.includes(m.k) && both(m.from) && both(m.text)), `${at}: hibás üzenet`);
    need(n.choices.length >= 1 && n.choices.length <= 3, `${at}: 1–3 választás kell`);
    if (n.urgent) need(n.choices[n.timeout], `${at}: hiányzó timeout-választás`);
    n.choices.forEach((ch, i) => {
      need(both(ch.text) && both(ch.fb), `${at}.${i}: hiányzó szöveg`);
      need(c.nodes[ch.to], `${at}.${i}: ismeretlen cél ${ch.to}`);
      need(ch.pts >= 0 && ch.pts <= 100, `${at}.${i}: a pont 0–100 között legyen`);
    });
  }
  if (errors.length) continue;
  const x = E.explore(c, IR_FAIL);
  Object.keys(c.nodes).filter(id => c.nodes[id].choices).forEach(id => need(x.seen.includes(id), `${c.id}.${id}: elérhetetlen döntési pont`));
  Object.keys(c.nodes).filter(id => c.nodes[id].end).forEach(id => need(x.ends.includes(id), `${c.id}.${id}: elérhetetlen befejezés`));
  console.log(`${c.id}: ${x.paths} útvonal, ${E.endingIds(c, x.ends).length} befejezés, legtöbb ${x.max} pont`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('OK');
