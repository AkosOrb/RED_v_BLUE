/* Döntési incidenskezelés – tiszta játékmotor (nincs DOM). A böngészőben és a tesztben (Node) is fut. */
(function (root) {
  const METERS = ['ops', 'ev', 'trust'];
  const BONUS = { S: 400, A: 250, B: 150, C: 75, F: 0 };
  const clamp = v => Math.max(0, Math.min(100, v));

  function newRun(c) {
    return { v: 1, cid: c.id, node: c.first, m: { ...c.meters }, flags: [], hist: [], t: 0, pts: 0, end: null, show: null };
  }
  function match(b, run) {
    if (b.any && !b.any.some(f => run.flags.includes(f))) return false;
    if (b.none && b.none.some(f => run.flags.includes(f))) return false;
    if (b.min != null && METERS.some(k => run.m[k] < b.min)) return false;
    return true;
  }
  // Follow branch nodes until a decision or an ending.
  function resolve(c, run, id) {
    for (let guard = 0; c.nodes[id] && c.nodes[id].go; guard++) {
      if (guard > 50) throw new Error('branch loop at ' + id);
      const br = c.nodes[id].go.find(b => match(b, run));
      if (!br) throw new Error('no branch matches at ' + id);
      id = br.to;
    }
    if (!c.nodes[id]) throw new Error('missing node ' + id);
    return id;
  }
  // Apply choice i at the current node; returns a new run (the old one is not changed).
  function choose(c, run, i, timedOut) {
    const n = c.nodes[run.node], ch = n.choices[i];
    const r = JSON.parse(JSON.stringify(run));
    const delta = {};
    for (const k of METERS) {
      const before = r.m[k];
      r.m[k] = clamp(before + ((ch.d && ch.d[k]) || 0));
      if (r.m[k] !== before) delta[k] = r.m[k] - before;
    }
    for (const f of ch.set || []) if (!r.flags.includes(f)) r.flags.push(f);
    r.t += ch.dt || 0;
    r.pts += ch.pts;
    r.hist.push({ node: run.node, i, pts: ch.pts, d: delta, t: r.t, timeout: !!timedOut });
    r.show = { node: run.node, i, timeout: !!timedOut };
    const zero = METERS.find(k => r.m[k] <= 0);
    if (zero) { r.end = 'fail:' + zero; r.node = null; return r; }
    const id = resolve(c, r, ch.to);
    if (c.nodes[id].end) { r.end = id; r.node = null; } else r.node = id;
    return r;
  }
  const ending = (c, run, fail) => run.end.startsWith('fail:') ? fail[run.end.slice(5)] : c.nodes[run.end];
  function finalScore(c, run, fail) {
    const e = ending(c, run, fail);
    const avg = Math.round(METERS.reduce((a, k) => a + run.m[k], 0) / METERS.length);
    return { pts: run.pts, bonus: BONUS[e.end], meters: avg, total: run.pts + BONUS[e.end] + avg, grade: e.end };
  }
  const bestPts = n => Math.max(...n.choices.map(ch => ch.pts));
  // Walk every possible path: maximum score, reachable endings, visited nodes.
  function explore(c, fail) {
    let max = 0, paths = 0, bestRun = null;
    const ends = new Set(), seen = new Set();
    const walk = run => {
      if (run.end) {
        paths++; ends.add(run.end);
        const s = finalScore(c, run, fail).total;
        if (s > max) { max = s; bestRun = run; }
        return;
      }
      seen.add(run.node);
      c.nodes[run.node].choices.forEach((_, i) => walk(choose(c, run, i)));
    };
    walk(newRun(c));
    return { max, paths, ends: [...ends], seen: [...seen], bestRun };
  }
  // All ending ids of a case in display order (case endings first, then the reachable meter failures).
  function endingIds(c, reach) {
    const own = Object.keys(c.nodes).filter(id => c.nodes[id].end);
    return own.concat(reach.filter(id => id.startsWith('fail:')).sort());
  }

  root.IR_ENGINE = { METERS, BONUS, newRun, choose, resolve, ending, finalScore, explore, endingIds, bestPts };
})(typeof window !== 'undefined' ? window : globalThis);
