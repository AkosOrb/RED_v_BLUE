/* Döntési incidenskezelés – tiszta játékmotor (nincs DOM). A böngészőben és a tesztben (Node) is fut. */
(function (root) {
  const METERS = ['ops', 'ev', 'trust'];
  const BONUS = { S: 400, A: 250, B: 150, C: 75, F: 0 };
  const MAX_STEPS = 40;          // safety net: no run may be longer than this
  const clamp = v => Math.max(0, Math.min(100, v));

  function newRun(c) {
    return { v: 2, cid: c.id, node: c.first, m: { ...c.meters }, flags: [], hist: [], t: 0, pts: 0, end: null, show: null };
  }
  function match(b, run) {
    if (b.any && !b.any.some(f => run.flags.includes(f))) return false;
    if (b.all && !b.all.every(f => run.flags.includes(f))) return false;
    if (b.none && b.none.some(f => run.flags.includes(f))) return false;
    if (b.min != null && METERS.some(k => run.m[k] < b.min)) return false;
    return true;
  }
  // Apply meter changes to run r; adds the real (clamped) change to delta.
  function applyD(r, d, delta) {
    for (const k of METERS) {
      const before = r.m[k];
      r.m[k] = clamp(before + ((d && d[k]) || 0));
      if (r.m[k] !== before) delta[k] = (delta[k] || 0) + r.m[k] - before;
    }
  }
  // Follow branch nodes until a decision or an ending. A branch may itself be a turn of the story:
  // kind 'back' sends the player back to an earlier stage, kind 'jump' skips ahead; it can also change
  // the meters (d), the score (pts), the clock (dt) and set flags. Returns the taken turns.
  function route(c, r, id, delta) {
    const turns = [];
    for (let guard = 0; c.nodes[id] && c.nodes[id].go; guard++) {
      if (guard > 50) throw new Error('branch loop at ' + id);
      const bi = c.nodes[id].go.findIndex(b => match(b, r));
      if (bi < 0) throw new Error('no branch matches at ' + id);
      const b = c.nodes[id].go[bi];
      for (const f of b.set || []) if (!r.flags.includes(f)) r.flags.push(f);
      if (b.d) applyD(r, b.d, delta);
      r.pts += b.pts || 0; r.t += b.dt || 0;
      if (b.kind) turns.push({ at: id, b: bi, kind: b.kind, to: b.to, pts: b.pts || 0 });
      id = b.to;
    }
    if (!c.nodes[id]) throw new Error('missing node ' + id);
    return { id, turns };
  }
  const resolve = (c, run, id) => route(c, JSON.parse(JSON.stringify(run)), id, {}).id;
  // Apply choice i at the current node; returns a new run (the old one is not changed).
  function choose(c, run, i, timedOut) {
    const n = c.nodes[run.node], ch = n.choices[i];
    // shallow copy is enough: history entries are never changed after they are pushed
    const r = { ...run, m: { ...run.m }, flags: run.flags.slice(), hist: run.hist.slice() };
    const delta = {};
    applyD(r, ch.d, delta);
    for (const f of ch.set || []) if (!r.flags.includes(f)) r.flags.push(f);
    r.t += ch.dt || 0;
    // a decision repeated after a step back earns no points again: redoing work is not progress
    const rep = run.hist.some(x => x.node === run.node);
    r.pts += rep ? 0 : ch.pts;
    const h = { node: run.node, i, pts: ch.pts, gain: rep ? 0 : ch.pts, rep, d: delta, t: r.t, timeout: !!timedOut, turns: [], rp: 0 };
    r.hist.push(h);
    r.show = { node: run.node, i, timeout: !!timedOut };
    const failed = () => METERS.find(k => r.m[k] <= 0);
    let zero = failed();
    if (!zero) {
      const before = r.pts, x = route(c, r, ch.to, delta);
      h.turns = x.turns; h.rp = r.pts - before; h.t = r.t;
      zero = failed();
      if (!zero) {
        if (c.nodes[x.id].end) { r.end = x.id; r.node = null; } else r.node = x.id;
        if (!r.end && r.hist.length >= MAX_STEPS) throw new Error('run too long in ' + c.id);
        return r;
      }
    }
    r.end = 'fail:' + zero; r.node = null; return r;
  }
  const ending = (c, run, fail) => run.end.startsWith('fail:') ? fail[run.end.slice(5)] : c.nodes[run.end];
  function finalScore(c, run, fail) {
    const e = ending(c, run, fail);
    const avg = Math.round(METERS.reduce((a, k) => a + run.m[k], 0) / METERS.length);
    return { pts: run.pts, bonus: BONUS[e.end], meters: avg, total: run.pts + BONUS[e.end] + avg, grade: e.end };
  }
  const bestPts = n => Math.max(...n.choices.map(ch => ch.pts));
  // Walk every possible path (memoised on node + flags + meters, so long cases stay fast):
  // maximum score, number of paths, reachable endings, visited nodes, and one best run.
  function explore(c, fail) {
    const memo = new Map();
    const key = r => `${r.node}|${[...r.flags].sort().join(',')}|${METERS.map(k => r.m[k]).join(',')}`;
    // returns { best: best future gain (choice/turn points + bonus + meters), paths, ends:Set, seen:Set, pick }
    const walk = r => {
      const k = key(r); if (memo.has(k)) return memo.get(k);
      const out = { best: -Infinity, paths: 0, ends: new Set(), seen: new Set([r.node]), kinds: new Set(), pick: 0 };
      c.nodes[r.node].choices.forEach((_, i) => {
        const nx = choose(c, r, i), gain = nx.pts - r.pts;
        nx.hist[nx.hist.length - 1].turns.forEach(t => out.kinds.add(t.kind));
        let fut, sub;
        if (nx.end) { const s = finalScore(c, nx, fail); fut = gain + s.bonus + s.meters; sub = { paths: 1, ends: new Set([nx.end]), seen: new Set(), kinds: new Set() }; }
        else { sub = walk(nx); fut = gain + sub.best; }
        out.paths += sub.paths; sub.ends.forEach(e => out.ends.add(e)); sub.seen.forEach(s => out.seen.add(s)); sub.kinds.forEach(k => out.kinds.add(k));
        if (fut > out.best) { out.best = fut; out.pick = i; }
      });
      memo.set(k, out); return out;
    };
    const r0 = newRun(c), res = walk(r0);
    let bestRun = r0;
    while (!bestRun.end) bestRun = choose(c, bestRun, walk(bestRun).pick);
    return { max: finalScore(c, bestRun, fail).total, paths: res.paths, ends: [...res.ends], seen: [...res.seen], kinds: [...res.kinds], bestRun };
  }
  // The line of best answers (the checker guarantees it gives the maximum score). Cheap enough for the browser,
  // where the full explore() of a long case would take seconds.
  function bestLine(c) {
    let r = newRun(c);
    while (!r.end) r = choose(c, r, c.nodes[r.node].choices.findIndex(ch => ch.pts === bestPts(c.nodes[r.node])));
    return r;
  }
  // What the page needs without exploring every path: maximum score and reachable endings (c.fails is
  // checked against explore() by ctf/tools/check_dontes.js).
  const reach = (c, fail) => ({ max: finalScore(c, bestLine(c), fail).total, ends: Object.keys(c.nodes).filter(id => c.nodes[id].end).concat((c.fails || []).map(k => 'fail:' + k)) });
  // All ending ids of a case in display order (case endings first, then the reachable meter failures).
  function endingIds(c, reach) {
    const own = Object.keys(c.nodes).filter(id => c.nodes[id].end);
    return own.concat(reach.filter(id => id.startsWith('fail:')).sort());
  }

  root.IR_ENGINE = { METERS, BONUS, MAX_STEPS, newRun, choose, resolve, match, ending, finalScore, explore, bestLine, reach, endingIds, bestPts };
})(typeof window !== 'undefined' ? window : globalThis);
