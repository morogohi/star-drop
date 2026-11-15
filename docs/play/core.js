/*
 * STAR DROP 게임 로직 (화면과 분리된 순수 로직)
 * - 상태(state)는 전부 JSON 으로 저장·복원 가능한 평범한 객체입니다(난수 진행 상태 포함).
 * - drop/useHammer/useSwap 은 상태를 즉시 최종 상태로 바꾸고, 화면이 재생할 단계(steps)를 돌려줍니다.
 * - 브라우저(window.SDCore)와 Node(require) 양쪽에서 동작합니다.
 */
(function (root) {
  const STATE_VERSION = 2;

  // ---------- 난수: mulberry32, 상태를 숫자 하나로 저장 ----------
  function rngNext(st) {
    let a = (st.rng | 0) + 0x6D2B79F5 | 0;
    st.rng = a >>> 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function seedOf(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dailySeed(R, ymd) { return seedOf('stardrop:' + R.version + ':' + ymd); }

  const tierOf = v => Math.round(Math.log2(v)) - 1;
  const lvTarget = (R, n) => R.levelK * n * (n + 1);
  function levelFor(R, s) { let n = 1; while (s >= lvTarget(R, n)) n++; return n; }
  const clone = g => g.map(row => row.map(t => t ? { v: t.v, id: t.id } : null));

  function challengeOf(R, id) { return (R.challenges || []).find(c => c.id === id) || null; }
  function toolCfg(R, st) { return R.tools[st.mode === 'challenge' ? 'challenge' : st.mode === 'daily' ? 'daily' : 'classic']; }

  // ---------- 새 게임 ----------
  function newState(R, opt) {
    const mode = opt.mode || 'classic';
    const ch = mode === 'challenge' ? challengeOf(R, opt.challengeId) : null;
    if (mode === 'challenge' && !ch) throw new Error('unknown challenge ' + opt.challengeId);
    const tc = R.tools[mode === 'challenge' ? 'challenge' : mode === 'daily' ? 'daily' : 'classic'];
    const st = {
      v: STATE_VERSION, rulesVersion: R.version,
      gid: opt.gid || (Date.now().toString(36) + Math.floor((opt.seed || 0) % 1e6).toString(36)),
      mode, challengeId: ch ? ch.id : null, day: opt.day || null,
      rng: (opt.seed >>> 0),
      grid: Array.from({ length: R.rows }, () => Array(R.cols).fill(null)),
      uid: 1, score: 0, level: ch ? ch.level : 1, maxV: 2, maxCombo: 0,
      drops: 0, movesLeft: ch ? ch.moves : null,
      hammers: (ch && ch.tools ? ch.tools.hammer : tc.start.hammer), swaps: (ch && ch.tools ? ch.tools.swap : tc.start.swap),
      fever: 0, feverLeft: 0, feverCount: 0,
      merges: 0, rocksCleared: 0, chains: 0, toolsUsed: 0,
      easy: mode === 'classic' && !!opt.firstGame,
      cur: 2, nxt: 2,
      over: false, result: null, endReason: null,
      extraUsed: 0, continueUsed: 0, toolAds: 0, assisted: false, settled: false
    };
    st.cur = spawn(R, st); st.nxt = spawn(R, st);
    if (st.cur === 'rock') st.cur = 2;
    if (st.nxt === 'rock') st.nxt = 4;
    return st;
  }

  // 항상 난수를 2번 소비 → 저장·복원·모드와 무관하게 같은 시드면 같은 순서
  function spawn(R, st) {
    const rr = rngNext(st), rv = rngNext(st);
    const ch = st.mode === 'challenge' ? challengeOf(R, st.challengeId) : null;
    const lv = st.level;
    let rockP;
    if (ch && ch.rockChance != null) rockP = ch.rockChance;
    else rockP = lv < R.rocks.fromLevel ? 0 : Math.min(R.rocks.max, R.rocks.perLevel * (lv - R.rocks.fromLevel + 1));
    if (st.drops >= R.rocks.minDrops && rr < rockP) return 'rock';
    let top = Math.max(R.spawn.minTop, Math.min(R.spawn.maxTop, Math.max(Math.log2(st.maxV) - 2 | 0, 1 + Math.ceil(lv / 2))));
    if (st.easy && st.drops < R.spawn.firstGameEasyDrops) top = 2;
    const d = lv >= R.spawn.highFromLevel ? R.spawn.decayHigh : R.spawn.decay;
    const w = []; for (let k = 1; k <= top; k++) w.push([2 ** k, Math.pow(d, k - 1)]);
    const tot = w.reduce((a, b) => a + b[1], 0); let r = rv * tot;
    for (const [v, p] of w) { if ((r -= p) <= 0) return v; }
    return 2;
  }

  // ---------- 판 상태 질의 ----------
  function topFree(st, c) { for (let r = st.grid.length - 1; r >= 0; r--) if (!st.grid[r][c]) return r; return -1; }
  function canDrop(st, c) { if (topFree(st, c) >= 0) return true; return st.cur !== 'rock' && st.grid[0][c] && st.grid[0][c].v === st.cur; }
  function canPlace(st) { for (let c = 0; c < st.grid[0].length; c++) if (canDrop(st, c)) return true; return false; }
  function occupancy(st) { let n = 0; for (const row of st.grid) for (const t of row) if (t) n++; return n / (st.grid.length * st.grid[0].length); }

  function goalProgress(R, st) {
    const ch = challengeOf(R, st.challengeId); if (!ch) return null;
    const g = ch.goal; let cur;
    if (g.type === 'star') cur = st.maxV;
    else if (g.type === 'score') cur = st.score;
    else if (g.type === 'chains') cur = st.chains;
    else if (g.type === 'rocks') cur = st.rocksCleared;
    else cur = 0;
    return { type: g.type, cur, target: g.target, min: g.min, done: cur >= g.target };
  }
  function goalText(g) {
    if (g.type === 'star') return g.target + ' 별 만들기';
    if (g.type === 'score') return g.target.toLocaleString() + '점 달성';
    if (g.type === 'chains') return '콤보 ×' + g.min + ' 이상 ' + g.target + '번';
    if (g.type === 'rocks') return '운석 ' + g.target + '개 부수기';
    return '';
  }

  // ---------- 내부: 점수·연쇄 ----------
  function addPoints(R, st, base) { const pts = base * (st.feverLeft > 0 ? R.fever.mult : 1); st.score += pts; return pts; }
  function gravity(st) {
    const moved = []; const g = st.grid;
    for (let c = 0; c < g[0].length; c++) { let w = g.length - 1; for (let r = g.length - 1; r >= 0; r--) { const t = g[r][c]; if (t) { if (r !== w) { g[w][c] = t; g[r][c] = null; moved.push(t.id); } w--; } } }
    return moved;
  }
  function find(st, id) { for (let r = 0; r < st.grid.length; r++) for (let c = 0; c < st.grid[0].length; c++) if (st.grid[r][c] && st.grid[r][c].id === id) return [r, c]; return null; }

  // active 타일 id 들에서 시작해 연쇄가 끝날 때까지 합친다
  function resolve(R, st, active, steps, ev) {
    let combo = 0; const ROWS = st.grid.length, COLS = st.grid[0].length;
    while (active.length) {
      const merges = [];
      active.sort((a, b) => { const pa = find(st, a), pb = find(st, b); return (pb ? pb[0] : 0) - (pa ? pa[0] : 0); });
      for (const id of active) {
        const p = find(st, id); if (!p) continue; const [r, c] = p; const t = st.grid[r][c]; if (t.v === 'rock') continue;
        const nb = [[r + 1, c], [r, c - 1], [r, c + 1], [r - 1, c]].filter(([y, x]) => y >= 0 && y < ROWS && x >= 0 && x < COLS && st.grid[y][x] && st.grid[y][x].v !== 'rock' && st.grid[y][x].v === t.v);
        if (!nb.length) continue;
        const absorbed = nb.map(([y, x]) => ({ r: y, c: x, v: st.grid[y][x].v }));
        for (const [y, x] of nb) st.grid[y][x] = null;
        t.v *= 2 ** nb.length; combo++; st.merges += nb.length;
        const pts = addPoints(R, st, t.v * combo); st.maxV = Math.max(st.maxV, t.v);
        // 운석: 합체 지점 상하좌우의 운석이 부서짐
        const rocks = [];
        for (const [y, x] of [[r + 1, c], [r - 1, c], [r, c - 1], [r, c + 1]]) {
          if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
          if (st.grid[y][x] && st.grid[y][x].v === 'rock') { st.grid[y][x] = null; rocks.push({ r: y, c: x }); }
        }
        let rockPts = 0; if (rocks.length) { st.rocksCleared += rocks.length; rockPts = addPoints(R, st, R.rocks.points * rocks.length); }
        // 피버 게이지
        if (st.feverLeft <= 0) { st.fever = Math.min(100, st.fever + R.fever.base + combo * R.fever.perCombo); if (st.fever >= 100) { st.feverLeft = R.fever.length; st.fever = 100; st.feverCount++; ev.feverStarted = true; } }
        merges.push({ id: t.id, r, c, v: t.v, combo, pts: pts + rockPts, absorbed, rocks });
      }
      if (!merges.length) break;
      st.maxCombo = Math.max(st.maxCombo, combo);
      steps.push({ t: 'merge', combo, merges, grid: clone(st.grid), score: st.score });
      const moved = gravity(st);
      if (moved.length) steps.push({ t: 'fall', moved, grid: clone(st.grid) });
      active = [...new Set([...merges.map(m => m.id), ...moved])];
    }
    return combo;
  }

  function afterAction(R, st, ev, countsAsDrop) {
    // 레벨 (도전 모드는 레벨 고정)
    if (st.mode !== 'challenge') {
      const n = levelFor(R, st.score);
      if (n > st.level) {
        const tc = toolCfg(R, st); const gained = n - st.level; st.level = n; ev.levelUp = n;
        const h = Math.max(0, Math.min(tc.cap - st.hammers, tc.perLevelUp.hammer * gained));
        const s = Math.max(0, Math.min(tc.cap - st.swaps, tc.perLevelUp.swap * gained));
        st.hammers += h; st.swaps += s; ev.toolsGranted = { hammer: h, swap: s };
      }
    }
    // 판정: 연쇄가 모두 끝난 뒤
    if (st.mode === 'challenge') {
      const gp = goalProgress(R, st);
      if (gp.done) { st.over = true; st.result = 'success'; st.endReason = 'goal'; return; }
      if (st.movesLeft <= 0) { st.over = true; st.result = 'fail'; st.endReason = 'moves'; return; }
    }
    if (!canPlace(st) && st.hammers <= 0 && st.swaps <= 0) {
      st.over = true; st.result = st.mode === 'challenge' ? 'fail' : 'end'; st.endReason = 'stuck';
    }
  }

  // ---------- 행동 ----------
  function drop(R, st, c) {
    if (st.over) return { ok: false, reason: 'over' };
    if (c < 0 || c >= st.grid[0].length) return { ok: false, reason: 'range' };
    if (!canDrop(st, c)) return { ok: false, reason: 'full' };
    if (st.mode === 'challenge' && st.movesLeft <= 0) return { ok: false, reason: 'nomoves' };
    const steps = [], ev = {}; let r = topFree(st, c), active;
    const isRock = st.cur === 'rock';
    if (r < 0) {           // 맨 위 같은 숫자에 바로 합치기
      r = 0; const t = st.grid[0][c]; t.v *= 2; st.maxV = Math.max(st.maxV, t.v); st.merges++;
      const pts = addPoints(R, st, t.v);
      steps.push({ t: 'place', r, c, id: t.id, v: t.v, top: true, pts, grid: clone(st.grid) });
      active = [t.id];
    } else {
      const t = { v: st.cur, id: st.uid++ }; st.grid[r][c] = t;
      steps.push({ t: 'place', r, c, id: t.id, v: t.v, rock: isRock, grid: clone(st.grid) });
      active = isRock ? [] : [t.id];
    }
    st.drops++; if (st.mode === 'challenge') st.movesLeft--;
    const feverBefore = st.feverLeft;
    const combo = resolve(R, st, active, steps, ev);
    if (st.mode === 'challenge') { const ch = challengeOf(R, st.challengeId); if (ch.goal.type === 'chains' && combo >= ch.goal.min) st.chains++; }
    else if (combo >= 3) st.chains++;
    // 피버는 "발동한 다음 수부터" 1수씩 줄어듦
    if (feverBefore > 0) { st.feverLeft--; if (st.feverLeft === 0) { st.fever = 0; ev.feverEnded = true; } }
    st.cur = st.nxt; st.nxt = spawn(R, st);
    afterAction(R, st, ev, true);
    return { ok: true, steps, ev, combo, row: r, col: c };
  }

  function useHammer(R, st, r, c) {
    if (st.over && st.result !== 'end') return { ok: false, reason: 'over' };
    if (st.hammers <= 0) return { ok: false, reason: 'notool' };
    if (!st.grid[r] || !st.grid[r][c]) return { ok: false, reason: 'empty' };
    const removed = st.grid[r][c]; st.grid[r][c] = null; st.hammers--; st.toolsUsed++;
    if (removed.v === 'rock') st.rocksCleared++;
    st.over = false; st.result = null; st.endReason = null;
    const steps = [{ t: 'remove', r, c, v: removed.v, grid: clone(st.grid) }], ev = {};
    const moved = gravity(st); if (moved.length) steps.push({ t: 'fall', moved, grid: clone(st.grid) });
    const combo = resolve(R, st, moved, steps, ev);
    if (combo >= 3 && st.mode !== 'challenge') st.chains++;
    afterAction(R, st, ev, false);
    return { ok: true, steps, ev, combo };
  }

  function useSwap(R, st) {
    if (st.over && st.result !== 'end') return { ok: false, reason: 'over' };
    if (st.swaps <= 0) return { ok: false, reason: 'notool' };
    st.swaps--; st.toolsUsed++; st.cur = st.nxt; st.nxt = spawn(R, st);
    if (st.cur === 'rock' && st.nxt !== 'rock') { const t = st.cur; st.cur = st.nxt; st.nxt = t; }
    st.over = false; st.result = null; st.endReason = null;
    const ev = {}; afterAction(R, st, ev, false);
    return { ok: true, steps: [], ev };
  }

  // ---------- 광고 보상 등 외부 조정 ----------
  function canOfferExtraMoves(R, st) {
    return st.mode === 'challenge' && st.over && st.result === 'fail' && st.extraUsed < R.ads.extraMovesPerGame && (canPlace(st) || st.hammers > 0 || st.swaps > 0);
  }
  function addExtraMoves(R, st) {
    if (!canOfferExtraMoves(R, st)) return false;
    st.extraUsed++; st.movesLeft += R.ads.extraMoves; st.over = false; st.result = null; st.endReason = null; st.assisted = true; return true;
  }
  function canOfferContinue(R, st) { return st.mode !== 'challenge' && st.over && st.endReason === 'stuck' && st.continueUsed < R.ads.continuePerGame; }
  function clearTopRows(R, st, n) {
    const cleared = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < st.grid[0].length; c++) { if (st.grid[r][c]) cleared.push({ r, c, v: st.grid[r][c].v }); st.grid[r][c] = null; }
    st.continueUsed++; st.over = false; st.result = null; st.endReason = null; st.assisted = true; return cleared;
  }
  function grantTool(R, st, kind) {
    if (kind === 'hammer') st.hammers++; else st.swaps++;
    st.toolAds++; st.assisted = st.assisted || st.mode !== 'classic';
    if (st.over && st.endReason === 'stuck') { st.over = false; st.result = null; st.endReason = null; }
  }
  function toolAdAllowed(R, st) { return st.toolAds < toolCfg(R, st).adPerGame; }
  function finish(R, st) { if (!st.over) { st.over = true; st.result = st.mode === 'challenge' ? 'fail' : 'end'; st.endReason = 'quit'; } }

  // 종료 코인 (도전은 별도 보상표)
  function endCoins(R, st) {
    if (st.mode === 'challenge') { const ch = challengeOf(R, st.challengeId); return st.result === 'success' ? ch.reward : 0; }
    return Math.floor(st.score / R.endCoinDiv) + st.maxCombo * 2 + st.level * 5 + (st.mode === 'daily' ? 20 : 0);
  }

  // ---------- 저장 데이터 검증·마이그레이션 ----------
  function validate(R, o) {
    try {
      if (!o || typeof o !== 'object') return null;
      if (o.v !== STATE_VERSION) return null;
      if (!Array.isArray(o.grid) || o.grid.length !== R.rows) return null;
      for (const row of o.grid) { if (!Array.isArray(row) || row.length !== R.cols) return null; for (const t of row) if (t && !(t.v === 'rock' || (Number.isFinite(t.v) && t.v >= 2 && (t.v & (t.v - 1)) === 0))) return null; }
      for (const k of ['score', 'level', 'hammers', 'swaps', 'drops', 'uid', 'rng', 'maxV']) if (!Number.isFinite(o[k]) || o[k] < 0) return null;
      if (!(o.cur === 'rock' || Number.isFinite(o.cur)) || !(o.nxt === 'rock' || Number.isFinite(o.nxt))) return null;
      if (!['classic', 'daily', 'challenge'].includes(o.mode)) return null;
      if (o.mode === 'challenge' && (!challengeOf(R, o.challengeId) || !Number.isFinite(o.movesLeft))) return null;
      return o;
    } catch (e) { return null; }
  }

  const API = { STATE_VERSION, rngNext, seedOf, dailySeed, tierOf, lvTarget, levelFor, newState, spawn, drop, useHammer, useSwap, canDrop, canPlace, occupancy,
    goalProgress, goalText, challengeOf, canOfferExtraMoves, addExtraMoves, canOfferContinue, clearTopRows, grantTool, toolAdAllowed, finish, endCoins, validate, clone };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SDCore = API;
})(this);
