// 난이도 시뮬레이션:  node tests/sim.js [seeds]
// 자동 플레이 결과는 "지나치게 쉽거나 불가능한 설정"을 찾는 용도로만 사용 (재미·재방문율 근거 아님)
const R = require('../www/rules.js');
const C = require('../www/core.js');
const N = +process.argv[2] || 300;
const clone = s => JSON.parse(JSON.stringify(s));
const STRATS = {
  repeat: (st, i) => { for (let k = 0; k < 5; k++) { const c = (i + k) % 5; if (C.canDrop(st, c)) return c; } return -1; },
  random: (st, i, rnd) => { const v = [0, 1, 2, 3, 4].filter(c => C.canDrop(st, c)); return v.length ? v[Math.floor(rnd() * v.length)] : -1; },
  greedy: (st) => { let best = -1, bs = -1e9; for (let c = 0; c < 5; c++) { if (!C.canDrop(st, c)) continue; const s = clone(st); const r = C.drop(R, s, c);
      const val = (s.score - st.score) + (r.combo || 0) * 50 - C.occupancy(s) * 400 + (s.maxV > st.maxV ? 200 : 0) + (s.rocksCleared - st.rocksCleared) * 150;
      if (val > bs) { bs = val; best = c; } } return best; }
};
function play(st, strat, seed, useTools) {
  let i = 0; const rnd = (() => { let a = seed * 7919 + 1; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  let gained = 0; const h0 = st.hammers + st.swaps;
  while (!st.over && i < 400) {
    const c = STRATS[strat](st, i, rnd);
    if (c < 0) {
      if (useTools && st.hammers > 0) { let tr = 0; for (let r = 0; r < 7; r++) if (st.grid[r][2]) { tr = r; break; } C.useHammer(R, st, tr, 2); continue; }
      if (useTools && st.swaps > 0) { C.useSwap(R, st); continue; }
      break;
    }
    const before = st.hammers + st.swaps; C.drop(R, st, c); if (st.hammers + st.swaps > before) gained += st.hammers + st.swaps - before; i++;
  }
  return { gained, used: st.toolsUsed };
}
const pct = x => (x * 100).toFixed(0) + '%';
console.log(`seeds=${N}  (도구는 막혔을 때만 사용)\n`);
console.log('도전            전략    성공률  평균투하  끝점유율  도구사용');
for (const ch of R.challenges) {
  for (const s of Object.keys(STRATS)) {
    let ok = 0, drops = 0, occ = 0, used = 0;
    for (let k = 0; k < N; k++) { const st = C.newState(R, { mode: 'challenge', challengeId: ch.id, seed: 1000 + k }); const r = play(st, s, k, true);
      if (st.result === 'success') ok++; drops += st.drops; occ += C.occupancy(st); used += r.used; }
    console.log(`${(ch.id + ' ' + C.goalText(ch.goal)).padEnd(22)} ${s.padEnd(7)} ${pct(ok / N).padStart(5)}  ${(drops / N).toFixed(1).padStart(7)}  ${pct(occ / N).padStart(7)}  ${(used / N).toFixed(2).padStart(6)}`);
  }
}
console.log('\n클래식 (도구는 막혔을 때만 사용)');
console.log('전략    평균점수  평균레벨  평균투하  도구획득  도구사용  끝점유율');
for (const s of Object.keys(STRATS)) {
  let sc = 0, lv = 0, dr = 0, g = 0, u = 0, occ = 0;
  for (let k = 0; k < N; k++) { const st = C.newState(R, { mode: 'classic', seed: 5000 + k, firstGame: false }); const r = play(st, s, k, true);
    sc += st.score; lv += st.level; dr += st.drops; g += r.gained; u += r.used; occ += C.occupancy(st); }
  console.log(`${s.padEnd(7)} ${(sc / N).toFixed(0).padStart(8)}  ${(lv / N).toFixed(1).padStart(7)}  ${(dr / N).toFixed(0).padStart(7)}  ${(g / N).toFixed(2).padStart(7)}  ${(u / N).toFixed(2).padStart(7)}  ${pct(occ / N).padStart(7)}`);
}

// ---- 이전 버전(v3.0) 도구 공급과 비교: 1,000점마다 망치·교체 번갈아 +1, 레벨업마다 망치 +1(상한 없음)
console.log('\n클래식 도구 공급 비교 (같은 시드·같은 전략, 막혔을 때만 도구 사용)');
console.log('전략    공급방식  평균투하  평균점수  도구획득');
for (const s of ['repeat', 'greedy']) for (const legacy of [true, false]) {
  let dr = 0, sc = 0, g = 0;
  for (let k = 0; k < N; k++) {
    const R2 = JSON.parse(JSON.stringify(R)); R2.challenges = R.challenges; if (legacy) { R2.tools.classic.perLevelUp = { hammer: 1, swap: 0 }; R2.tools.classic.cap = 999; }
    const st = C.newState(R2, { mode: 'classic', seed: 5000 + k }); let i = 0, nextAt = 1000, gained = 0; const rnd = () => 0.5;
    while (!st.over && i < 600) { const c = STRATS[s](st, i, rnd);
      if (c < 0) { if (st.hammers > 0) { let tr = 0; for (let r = 0; r < 7; r++) if (st.grid[r][2]) { tr = r; break; } C.useHammer(R2, st, tr, 2); continue; } if (st.swaps > 0) { C.useSwap(R2, st); continue; } break; }
      const b = st.hammers + st.swaps; C.drop(R2, st, c); gained += Math.max(0, st.hammers + st.swaps - b);
      if (legacy) while (st.score >= nextAt) { nextAt += 1000; if (nextAt % 2000 === 0) st.swaps++; else st.hammers++; gained++; if (st.over && st.endReason === 'stuck') { st.over = false; st.result = null; } }
      i++; }
    dr += st.drops; sc += st.score; g += gained; }
  console.log(`${s.padEnd(7)} ${(legacy ? 'v3.0' : '신규').padEnd(8)} ${(dr / N).toFixed(0).padStart(7)}  ${(sc / N).toFixed(0).padStart(8)}  ${(g / N).toFixed(2).padStart(7)}`);
}
