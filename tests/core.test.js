// 핵심 로직 단위 테스트:  node tests/core.test.js
const assert = require('assert');
const R = require('../www/rules.js');
const C = require('../www/core.js');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ✓ ' + name); } catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + e.message); } }
const E = () => Array.from({ length: R.rows }, () => Array(R.cols).fill(null));
function setGrid(st, rows) { let id = 1000; st.grid = rows.map(row => row.map(v => v ? { v, id: id++ } : null)); st.uid = id; }

console.log('core');
t('5. 가득 찬 열(무효 투하)은 수를 차감하지 않음', () => {
  const st = C.newState(R, { mode: 'challenge', challengeId: 'c1', seed: 1 });
  setGrid(st, Array.from({ length: R.rows }, (_, r) => [r % 2 ? 4 : 8, 0, 0, 0, 0]));
  st.cur = 2; const before = st.movesLeft;
  const res = C.drop(R, st, 0);
  assert.strictEqual(res.ok, false); assert.strictEqual(res.reason, 'full'); assert.strictEqual(st.movesLeft, before); assert.strictEqual(st.drops, 0);
});
t('6. 연쇄 합치기(콤보 ×3)도 투하 1회당 1수만 차감', () => {
  const st = C.newState(R, { mode: 'challenge', challengeId: 'c3', seed: 2 });
  const g = E(); g[6][0] = 32; g[5][0] = 16; g[4][0] = 8; g[3][0] = 4; setGrid(st, g); st.cur = 4;
  const before = st.movesLeft; const res = C.drop(R, st, 0);
  assert.ok(res.ok); assert.ok(res.combo >= 3, 'combo ' + res.combo); assert.strictEqual(st.movesLeft, before - 1);
});
t('7. 마지막 수에서 목표 달성 → 성공', () => {
  const st = C.newState(R, { mode: 'challenge', challengeId: 'c1', seed: 3 });
  const g = E(); g[6][0] = 64; g[5][0] = 32; g[4][0] = 16; g[3][0] = 8; g[2][0] = 4; g[1][0] = 2; setGrid(st, g); st.cur = 2; st.movesLeft = 1;
  const res = C.drop(R, st, 0);
  assert.ok(res.ok); assert.strictEqual(st.movesLeft, 0); assert.strictEqual(st.result, 'success'); assert.ok(st.maxV >= 128);
});
t('마지막 수에서 미달 → 실패, +5수 제안 가능', () => {
  const st = C.newState(R, { mode: 'challenge', challengeId: 'c1', seed: 4 }); st.movesLeft = 1; st.cur = 2;
  C.drop(R, st, 2); assert.strictEqual(st.result, 'fail'); assert.ok(C.canOfferExtraMoves(R, st));
});
t('8. +5수는 판당 1회만', () => {
  const st = C.newState(R, { mode: 'challenge', challengeId: 'c1', seed: 5 }); st.movesLeft = 1; C.drop(R, st, 2);
  assert.ok(C.addExtraMoves(R, st)); assert.strictEqual(st.movesLeft, 5); assert.strictEqual(st.over, false);
  for (let i = 0; i < 5 && !st.over; i++) C.drop(R, st, i % 5);
  if (st.result === 'fail') { assert.strictEqual(C.canOfferExtraMoves(R, st), false); assert.strictEqual(C.addExtraMoves(R, st), false); }
});
t('투하가 불가능하고 도구도 없으면 +5수를 제안하지 않음', () => {
  const st = C.newState(R, { mode: 'challenge', challengeId: 'c1', seed: 6 });
  setGrid(st, Array.from({ length: R.rows }, (_, r) => Array.from({ length: R.cols }, (_, c) => ((r + c) % 2 ? 4 : 8))));
  st.cur = 2; st.hammers = 0; st.swaps = 0; st.over = true; st.result = 'fail'; st.endReason = 'moves';
  assert.strictEqual(C.canOfferExtraMoves(R, st), false);
});
t('도구 사용은 수를 차감하지 않음', () => {
  const st = C.newState(R, { mode: 'challenge', challengeId: 'c1', seed: 7 }); const g = E(); g[6][2] = 8; setGrid(st, g);
  const m = st.movesLeft; C.useHammer(R, st, 6, 2); C.useSwap(R, st); assert.strictEqual(st.movesLeft, m);
});
t('12. 일일 챌린지: 같은 날짜·규칙이면 같은 별 순서, 저장·복원 후에도 동일', () => {
  const seed = C.dailySeed(R, '2026-11-16');
  const a = C.newState(R, { mode: 'daily', seed }), b = C.newState(R, { mode: 'daily', seed });
  const seqA = [], seqB = [];
  for (let i = 0; i < 12; i++) { seqA.push(a.cur); C.drop(R, a, i % 5); }
  for (let i = 0; i < 6; i++) { seqB.push(b.cur); C.drop(R, b, i % 5); }
  const b2 = JSON.parse(JSON.stringify(b));          // 저장 → 복원
  for (let i = 6; i < 12; i++) { seqB.push(b2.cur); C.drop(R, b2, i % 5); }
  assert.deepStrictEqual(seqB, seqA); assert.deepStrictEqual(b2.grid, a.grid); assert.strictEqual(b2.score, a.score);
});
t('일일 챌린지 시드는 첫 판 여부·다른 날짜에 영향', () => {
  const x = C.newState(R, { mode: 'daily', seed: C.dailySeed(R, '2026-11-16'), firstGame: true });
  const y = C.newState(R, { mode: 'daily', seed: C.dailySeed(R, '2026-11-16'), firstGame: false });
  assert.strictEqual(x.easy, false); assert.deepStrictEqual([x.cur, x.nxt, x.rng], [y.cur, y.nxt, y.rng]);
  const z = C.newState(R, { mode: 'daily', seed: C.dailySeed(R, '2026-11-17') }); assert.notStrictEqual(z.rng, x.rng);
});
t('클래식 도구: 점수로는 늘지 않고 레벨업 때만 설정값만큼 지급, 상한 적용', () => {
  const L = R.tools.classic.perLevelUp, cap = R.tools.classic.cap;
  const st = C.newState(R, { mode: 'classic', seed: 9 }); st.hammers = 1; st.swaps = 1;
  st.score = R.levelK * 2 - 1; const g = E(); g[6][0] = 2; setGrid(st, g); st.cur = 2; C.drop(R, st, 0); // → 레벨 2
  assert.strictEqual(st.level, 2); assert.strictEqual(st.hammers, 1 + L.hammer); assert.strictEqual(st.swaps, 1 + L.swap);
  st.hammers = cap; st.score = C.lvTarget(R, 2) - 1; setGrid(st, g); st.cur = 2; C.drop(R, st, 0);
  assert.strictEqual(st.level, 3); assert.strictEqual(st.hammers, cap, 'cap');
});
t('운석: 옆에서 합체하면 부서짐, 합쳐지지 않음', () => {
  const st = C.newState(R, { mode: 'classic', seed: 10 }); const g = E(); g[6][1] = 'rock'; g[6][0] = 4; g[5][1] = 'rock'; setGrid(st, g); st.cur = 4;
  C.drop(R, st, 0);  // 4가 (5,0)에 → (6,0)과 합체 → 옆 (6,1) 운석 파괴
  assert.ok(st.rocksCleared >= 1); assert.ok(!st.grid[6][1] || st.grid[6][1].v !== 'rock' || st.grid[5][1] === null);
});
t('피버: 발동한 수에는 줄지 않고 다음 수부터 감소', () => {
  const st = C.newState(R, { mode: 'classic', seed: 11 }); st.fever = 99; const g = E(); g[6][0] = 2; setGrid(st, g); st.cur = 2;
  C.drop(R, st, 0); assert.strictEqual(st.feverLeft, R.fever.length); C.drop(R, st, 3); assert.strictEqual(st.feverLeft, R.fever.length - 1);
});
t('손상된 저장 데이터는 거부', () => {
  const st = C.newState(R, { mode: 'classic', seed: 12 });
  assert.ok(C.validate(R, JSON.parse(JSON.stringify(st))));
  assert.strictEqual(C.validate(R, { ...st, grid: [[1]] }), null);
  assert.strictEqual(C.validate(R, { ...st, score: -5 }), null);
  assert.strictEqual(C.validate(R, { ...st, v: 1 }), null);
  assert.strictEqual(C.validate(R, null), null);
  const bad = JSON.parse(JSON.stringify(st)); bad.grid[6][0] = { v: 3, id: 1 }; assert.strictEqual(C.validate(R, bad), null);
});
t('클래식 막힘 → 이어하기 1회만', () => {
  const st = C.newState(R, { mode: 'classic', seed: 13 }); setGrid(st, Array.from({ length: R.rows }, (_, r) => Array.from({ length: R.cols }, (_, c) => ((r + c) % 2 ? 4 : 8))));
  st.hammers = 0; st.swaps = 0; st.cur = 2; st.over = true; st.result = 'end'; st.endReason = 'stuck';
  assert.ok(C.canOfferContinue(R, st)); C.clearTopRows(R, st, 2); assert.ok(C.canPlace(st));
  st.over = true; st.endReason = 'stuck'; assert.strictEqual(C.canOfferContinue(R, st), false);
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
