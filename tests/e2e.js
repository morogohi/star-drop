// 브라우저 회귀 테스트:  node tests/e2e.js   (Playwright, www/index.html?dev=1)
const { chromium } = require('playwright');
const path = require('path');
const R = require('../www/rules.js'), C = require('../www/core.js');
const URL = 'file://' + path.resolve(__dirname, '../www/index.html') + '?dev=1';
let pass = 0, fail = 0; const results = [];
async function t(name, fn) { try { await fn(); pass++; results.push('✓ ' + name); console.log('  ✓ ' + name); } catch (e) { fail++; results.push('✗ ' + name + ' — ' + e.message); console.log('  ✗ ' + name + '\n    ' + e.message); } }
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'not equal') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)); };
const ok = (v, m) => { if (!v) throw new Error(m || 'assert'); };
const E = () => Array.from({ length: R.rows }, () => Array(R.cols).fill(null));
function grid(rows) { let id = 500; return rows.map(row => row.map(v => v ? { v, id: id++ } : null)); }
const today = (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date());

let browser;
async function page(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.vp || { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.errors = []; p.on('pageerror', x => p.errors.push(x.message));
  // 시드 데이터는 한 번만 기록: 빈 페이지 로드 → 저장소 비우고 기록 → 새로고침 (이후 새로고침 때는 다시 쓰지 않음)
  await p.goto(URL); await p.evaluate(([ls, fresh, day]) => { localStorage.clear();
    if (!fresh) { localStorage.setItem('sd_schema', '3'); localStorage.setItem('sd_tutorialDone', 'true'); localStorage.setItem('sd_rockSeen', 'true'); localStorage.setItem('sd_bonusDay', JSON.stringify(day)); }
    for (const [k, v] of Object.entries(ls || {})) localStorage.setItem(k, JSON.stringify(v)); }, [opts.ls, !!opts.fresh, today]);
  await p.reload(); await p.waitForTimeout(700); return p;
}
const st = p => p.evaluate(() => window.__sd.state);
const idle = async p => { for (let i = 0; i < 80; i++) { if (!(await p.evaluate(() => window.__sd.busy))) return; await p.waitForTimeout(50); } };
async function col(p, c) { const b = await p.locator('.col').nth(c).boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + 40); await p.waitForTimeout(60); await idle(p); await p.waitForTimeout(80); }
const save = s => ({ sd_save: { sv: 1, app: 'test', at: Date.now(), state: s } });
const coins = p => p.evaluate(() => +localStorage.getItem('sd_coins'));
async function adChoose(p, r) { await p.waitForSelector('#ovAd.on'); await p.click(`#devAd button[data-r="${r}"]`); await p.waitForTimeout(250); }

(async () => {
  browser = await chromium.launch();
  console.log('e2e');

  await t('1. 진행 중 홈 복귀 후 이어하기: 보드·점수·다음 별·난수 상태 일치', async () => {
    const p = await page(); await p.click('#playBtn'); await p.waitForTimeout(300);
    for (let i = 0; i < 7; i++) await col(p, i % 5);
    const a = await st(p); await p.click('#pauseBtn'); await p.click('#homeBtn'); await p.waitForTimeout(300);
    ok(await p.isVisible('#resumeBtn'), '이어하기 버튼'); await p.click('#resumeBtn'); await p.waitForTimeout(300);
    const b = await st(p); eq([b.grid, b.score, b.cur, b.nxt, b.rng, b.level, b.hammers, b.swaps], [a.grid, a.score, a.cur, a.nxt, a.rng, a.level, a.hammers, a.swaps]);
    eq(await p.textContent('#score'), a.score.toLocaleString(), '화면 점수'); eq(p.errors, []);
  });

  await t('2. 새로고침 후 보드·점수·다음 별·남은 수 일치 (40수 도전)', async () => {
    const p = await page({ ls: save(C.newState(R, { mode: 'challenge', challengeId: 'c2', seed: 2026 })) }); await p.click('#resumeBtn'); await p.waitForTimeout(300);
    for (let i = 0; i < 6; i++) await col(p, (i * 2) % 5);
    ok(!(await st(p)).over, '시드 2026은 6수 안에 끝나지 않아야 함');
    const a = await st(p); await p.reload(); await p.waitForTimeout(700);
    ok(await p.isVisible('#resumeBtn'), 'resume 없음: ' + JSON.stringify({ over: a.over, result: a.result, drops: a.drops, settled: a.settled, save: (await p.evaluate(() => localStorage.getItem('sd_save') || '')).slice(0, 80) })); await p.click('#resumeBtn'); await p.waitForTimeout(300);
    const b = await st(p); eq([b.grid, b.score, b.cur, b.nxt, b.movesLeft, b.rng], [a.grid, a.score, a.cur, a.nxt, a.movesLeft, a.rng]);
    eq(await p.textContent('#movesLeft'), String(a.movesLeft), '화면 남은 수');
  });

  await t('3. 1,500점 미션 즉시 반영·보상 중복 없음', async () => {
    const s = C.newState(R, { mode: 'classic', seed: 3 }); s.grid = grid([[], [], [], [], [], [], [64, 0, 0, 0, 0]].map(r => Array.from({ length: 5 }, (_, i) => r[i] || 0))); s.uid = 900; s.cur = 64; s.score = 1450; s.level = 2;
    const m = { day: today, list: [{ id: 'score', goal: 1500, text: '한 판에 1,500점', prog: 0, done: false }, { id: 'games', goal: 3, text: '게임 3판 완료', prog: 0, done: false }, { id: 'combo', goal: 5, text: '콤보 ×5 달성', prog: 0, done: false }] };
    const p = await page({ ls: { ...save(s), sd_missions: m, sd_coins: 0 } }); await p.click('#resumeBtn'); await p.waitForTimeout(300);
    await col(p, 0);   // 64+64 → 128점 → 1578점
    const ms = await p.evaluate(() => JSON.parse(localStorage.getItem('sd_missions')));
    ok(ms.list[0].done, '점수 미션 즉시 완료'); eq(ms.list[1].prog, 0, '게임 판수 미션은 종료 전 미반영');
    const c1 = await coins(p); ok(c1 >= 30, '보상 지급 ' + c1);
    await p.reload(); await p.waitForTimeout(700); await p.click('#resumeBtn'); await p.waitForTimeout(300); await col(p, 2);
    eq(await coins(p), c1, '새로고침 후 재지급 없음');
    eq(await p.evaluate(() => +localStorage.getItem('sd_best')), (await st(p)).score, '최고점 즉시 반영');
  });

  await t('4. 새 게임에 이전 콤보·피버·타이머·팝업이 남지 않음', async () => {
    const s = C.newState(R, { mode: 'classic', seed: 4 });
    s.grid = grid([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [4, 0, 0, 0, 0], [8, 0, 0, 0, 0], [16, 0, 0, 0, 0], [32, 0, 0, 0, 0]]); s.uid = 900; s.cur = 4; s.fever = 90;
    const p = await page({ ls: save(s) }); await p.click('#resumeBtn'); await p.waitForTimeout(300);
    const b = await p.locator('.col').nth(0).boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + 40);
    for (let i = 0; i < 60; i++) { if ((await p.getAttribute('#combo', 'class')).includes('show')) break; await p.waitForTimeout(30); }
    await idle(p); const g0 = await p.evaluate(() => window.__sd.gen);
    ok((await p.getAttribute('#combo', 'class')).includes('show'), '콤보 연출 발생');
    await p.click('#pauseBtn'); await p.click('#homeBtn'); await p.waitForTimeout(100); await p.click('#dailyBtn');
    await p.waitForSelector('#ovConfirm.on'); await p.click('#cfYes'); await p.waitForTimeout(200);
    const r = await p.evaluate(() => ({ combo: document.getElementById('combo').className, txt: document.getElementById('combo').textContent, floats: document.querySelectorAll('.float').length, fever: document.getElementById('feverTag').className, gauge: document.getElementById('gFill').style.width, board: document.getElementById('board').className, score: document.getElementById('score').textContent }));
    eq(r.combo, 'combo'); eq(r.txt, ''); eq(r.floats, 0); ok(!r.fever.includes('go')); eq(r.gauge, '0%'); ok(!r.board.includes('fever')); eq(r.score, '0');
    ok(await p.evaluate(() => window.__sd.gen) > g0, '세대 토큰 증가');
    await p.waitForTimeout(1200); eq((await st(p)).score, 0, '이전 판 예약 콜백이 새 판을 바꾸지 않음');
  });

  await t('5. 가득 찬 열 클릭은 수를 차감하지 않음', async () => {
    const s = C.newState(R, { mode: 'challenge', challengeId: 'c1', seed: 5 });
    s.grid = grid(Array.from({ length: 7 }, (_, r) => [r % 2 ? 4 : 8, 0, 0, 0, 0])); s.uid = 900; s.cur = 2;
    const p = await page({ ls: save(s) }); await p.click('#resumeBtn'); await p.waitForTimeout(300);
    const m0 = (await st(p)).movesLeft; await col(p, 0); await col(p, 0);
    eq((await st(p)).movesLeft, m0); ok((await p.textContent('#toast')).includes('수는 줄지 않아요'));
  });

  await t('6. 연쇄 합치기(콤보 ×3+)도 투하 1회에 1수', async () => {
    const s = C.newState(R, { mode: 'challenge', challengeId: 'c3', seed: 6 });
    s.grid = grid([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [4, 0, 0, 0, 0], [8, 0, 0, 0, 0], [16, 0, 0, 0, 0], [32, 0, 0, 0, 0]]); s.uid = 900; s.cur = 4;
    const p = await page({ ls: save(s) }); await p.click('#resumeBtn'); await p.waitForTimeout(300);
    const m0 = (await st(p)).movesLeft; await col(p, 0); const a = await st(p);
    eq(a.movesLeft, m0 - 1); ok(a.maxCombo >= 3, 'combo ' + a.maxCombo);
  });

  await t('7. 마지막 수에서 목표 달성 → 성공 처리', async () => {
    const s = C.newState(R, { mode: 'challenge', challengeId: 'c1', seed: 7 });
    s.grid = grid([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [4, 0, 0, 0, 0], [8, 0, 0, 0, 0], [16, 0, 0, 0, 0], [32, 0, 0, 0, 0]]); s.uid = 900; s.cur = 4; s.movesLeft = 1;
    const p = await page({ ls: { ...save(s), sd_maxEver: 8192, sd_missions: { day: today, list: [{ id: 'merges', goal: 999, text: 'x', prog: 0, done: false }, { id: 'games', goal: 99, text: 'y', prog: 0, done: false }, { id: 'level', goal: 99, text: 'z', prog: 0, done: false }] }, sd_coins: 0 } }); await p.click('#resumeBtn'); await p.waitForTimeout(300); await col(p, 0);
    await p.waitForSelector('#ovResult.on'); ok((await p.textContent('#rTitle')).includes('성공')); eq((await st(p)).movesLeft, 0);
    const def = R.challenges.find(c => c.id === 'c1'); eq(await coins(p), def.reward + def.firstClear, '기본+첫 성공 보상');
  });

  await t('8. +5수 광고는 판당 1회만', async () => {
    const s = C.newState(R, { mode: 'challenge', challengeId: 'c1', seed: 8 }); s.movesLeft = 1; s.cur = 2;
    const p = await page({ ls: save(s) }); await p.click('#resumeBtn'); await p.waitForTimeout(300); await col(p, 2);
    await p.waitForSelector('#ovResult.on'); ok(await p.isVisible('#rExtra'), '+5수 제안');
    await p.click('#rExtra'); await adChoose(p, 'completed'); eq((await st(p)).movesLeft, 5); ok(!(await p.isVisible('#ovResult')));
    for (let i = 0; i < 5; i++) await col(p, i);
    await p.waitForSelector('#ovResult.on'); ok(!(await p.isVisible('#rExtra')), '두 번째 실패에서는 제안 없음'); eq((await st(p)).extraUsed, 1);
  });

  await t('9. 광고 취소·미제공·오류: 보상 없음, 입력 정상 복귀', async () => {
    const s = C.newState(R, { mode: 'classic', seed: 9 }); s.hammers = 0;
    const p = await page({ ls: save(s) }); await p.click('#resumeBtn'); await p.waitForTimeout(300);
    for (const r of ['cancelled', 'no_fill', 'error']) {
      await p.click('#hammer'); await p.waitForSelector('#ovTool.on'); await p.click('#tAd'); await adChoose(p, r);
      eq((await st(p)).hammers, 0, r + ' 무보상'); ok((await p.textContent('#tStatus')).length > 0, r + ' 안내문'); await p.click('#tClose');
    }
    const d0 = (await st(p)).drops; await col(p, 1); eq((await st(p)).drops, d0 + 1, '광고 후 입력 정상');
  });

  await t('10. 광고 완료 콜백이 중복돼도 보상 1회', async () => {
    const s = C.newState(R, { mode: 'classic', seed: 10 }); s.hammers = 0;
    const p = await page({ ls: save(s) }); await p.click('#resumeBtn'); await p.waitForTimeout(300);
    await p.click('#hammer'); await p.click('#tAd'); await adChoose(p, 'dup'); await p.waitForTimeout(300);
    eq((await st(p)).hammers, 1);
    const twice = await p.evaluate(() => { let n = 0; const L = window.__sd.Ledger; L.once('t:x', () => n++); L.once('t:x', () => n++); return n; }); eq(twice, 1, '장부 1회');
  });

  await t('11. 기본 보상과 광고 추가 보상 각각 1회 (도전 2배)', async () => {
    const s = C.newState(R, { mode: 'challenge', challengeId: 'c3', seed: 11 });
    s.grid = grid([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [4, 0, 0, 0, 0], [8, 0, 0, 0, 0], [16, 0, 0, 0, 0], [32, 0, 0, 0, 0]]); s.uid = 900; s.cur = 4; s.chains = 1;
    const p = await page({ ls: { ...save(s), sd_maxEver: 8192, sd_missions: { day: today, list: [{ id: 'merges', goal: 999, text: 'x', prog: 0, done: false }, { id: 'games', goal: 99, text: 'y', prog: 0, done: false }, { id: 'level', goal: 99, text: 'z', prog: 0, done: false }] }, sd_coins: 0, sd_ledger: ['first:c3'] } }); await p.click('#resumeBtn'); await p.waitForTimeout(300); await col(p, 0);
    await p.waitForSelector('#ovResult.on'); const def = R.challenges.find(c => c.id === 'c3');
    eq(await coins(p), def.reward, '기본 보상'); ok((await p.textContent('#rDouble')).includes('총 ' + def.reward * 2));
    await p.click('#rDouble'); await adChoose(p, 'completed'); eq(await coins(p), def.reward * 2, '광고 추가 보상');
    await p.evaluate(() => document.getElementById('rDouble').click()); await p.waitForTimeout(400);
    eq(await coins(p), def.reward * 2, '두 번째 시도 무지급');
    await p.click('#rHome'); await p.waitForTimeout(300); eq(await coins(p), def.reward * 2, '홈 이동 시 재정산 없음');
  });

  await t('12. 일일 챌린지: 같은 시드·같은 순서, 새로고침 복원 후에도 재현', async () => {
    const seq = async (reloadAt) => { const p = await page(); await p.click('#dailyBtn'); await p.waitForTimeout(300); const out = [];
      for (let i = 0; i < 10; i++) { if (i === reloadAt) { await p.reload(); await p.waitForTimeout(700); await p.click('#resumeBtn'); await p.waitForTimeout(300); }
        out.push((await st(p)).cur); await col(p, (i * 3) % 5); }
      const f = await st(p); return { out, grid: f.grid, score: f.score }; };
    const a = await seq(-1), b = await seq(5); eq(b.out, a.out, '별 순서'); eq(b.grid, a.grid, '보드'); eq(b.score, a.score, '점수');
  });

  await t('13. 기존(v3.0) 코인·스킨·도감·미션·기록 보존', async () => {
    const m = { day: today, list: [{ id: 'fever', goal: 1, text: '피버 1번 발동', prog: 1, done: true }, { id: 'score', goal: 1500, text: '한 판에 1,500점', prog: 0, done: false }, { id: 'daily', goal: 1, text: '오늘의 챌린지 1판', prog: 0, done: false }] };
    const legacy = { sd_coins: 1234, sd_skins: ['classic', 'bubble', 'animals'], sd_skin: 'animals', sd_maxEver: 512, sd_best: 9000, sd_bestLevel: 4, sd_missions: m, sd_coached: true, sd_games: 7, sd_bonusDay: today };
    const p = await page({ fresh: true, ls: legacy });
    const ls = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('sd_')).map(k => [k, JSON.parse(localStorage.getItem(k))])));
    eq([ls.sd_coins, ls.sd_skins, ls.sd_skin, ls.sd_maxEver, ls.sd_best, ls.sd_bestLevel, ls.sd_games], [1234, ['classic', 'bubble', 'animals'], 'animals', 512, 9000, 4, 7]);
    eq(ls.sd_missions.list[0].done, true, '미션 보존'); eq(ls.sd_schema, 3); eq(ls.sd_tutorialDone, true, '기존 이용자 튜토리얼 생략');
    eq(await p.textContent('#hBest'), '9,000'); eq(await p.textContent('#hCoins'), '1,234');
  });

  await t('14. 모바일 화면(320·360·390): 가로 넘침·HUD 겹침 없음', async () => {
    for (const vp of [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 844 }]) {
      const p = await page({ vp }); const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= vp.width, vp.width + ' 홈 넘침 ' + sw);
      await p.click('#chalBtn'); await p.click('.ch >> nth=4'); await p.waitForTimeout(300);
      const box = await p.evaluate(() => Object.fromEntries(['goalRow', 'movesBox', 'n1', 'hammer', 'swap', 'board', 'pauseBtn', 'coinPill'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [id, [r.left, r.top, r.right, r.bottom]]; })));
      for (const [id, [l, tp, r, bt]] of Object.entries(box)) ok(l >= 0 && r <= vp.width + 0.5 && tp >= 0 && bt <= vp.height + 0.5, `${vp.width}x${vp.height} ${id} 화면 밖 ${[l, tp, r, bt].map(Math.round)}`);
      const ov = (a, b) => !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);
      for (const [a, b] of [['goalRow', 'n1'], ['goalRow', 'hammer'], ['n1', 'hammer'], ['hammer', 'swap'], ['board', 'hammer'], ['movesBox', 'coinPill']]) ok(!ov(box[a], box[b]), `${vp.width} ${a}/${b} 겹침`);
      const sw2 = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw2 <= vp.width, vp.width + ' 게임 넘침');
      await p.screenshot({ path: path.resolve(__dirname, `shot-${vp.width}.png`) });
    }
  });

  await t('추가. 클래식에서 점수만으로는 도구가 늘지 않음 (관찰 2 재발 방지)', async () => {
    const s = C.newState(R, { mode: 'classic', seed: 12 }); s.score = 1950; s.level = 2; s.hammers = 1; s.swaps = 1;
    s.grid = grid([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [64, 0, 0, 0, 0]]); s.uid = 900; s.cur = 64;
    const p = await page({ ls: save(s) }); await p.click('#resumeBtn'); await p.waitForTimeout(300); await col(p, 0);  // 1950 → 2078 (2,000점 경계 통과, 레벨 2 유지 — v3.0은 여기서 도구 지급)
    const a = await st(p); eq([a.level, a.hammers, a.swaps], [2, 1, 1]);
  });

  await t('추가. 홈 최고점·최고 레벨 일관 (관찰 4·5 재발 방지)', async () => {
    const s = C.newState(R, { mode: 'classic', seed: 13 }); s.score = 2380; s.level = 2;
    s.grid = grid([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [32, 0, 0, 0, 0]]); s.uid = 900; s.cur = 32;
    const p = await page({ ls: { ...save(s), sd_best: 0, sd_bestLevel: 1 } }); await p.click('#resumeBtn'); await p.waitForTimeout(300); await col(p, 0);
    await p.waitForTimeout(400); await p.click('#pauseBtn'); await p.click('#homeBtn'); await p.waitForTimeout(300);
    eq([await p.textContent('#hBest'), await p.textContent('#hLvl')], [(await p.evaluate(() => JSON.parse(localStorage.getItem('sd_save')).state.score)).toLocaleString(), '3']);
    await p.click('#resumeBtn'); await p.waitForTimeout(300); ok(+(await p.textContent('#score')).replace(/,/g, '') > 2400, '이어하기 점수 유지');
  });

  await t('추가. 손상된 저장 데이터는 안전하게 폐기하고 게임 계속', async () => {
    const p = await page({ ls: { sd_save: { sv: 1, state: { v: 2, grid: [[1]] } } } });
    ok(!(await p.isVisible('#resumeBtn'))); eq(await p.evaluate(() => localStorage.getItem('sd_save')), null); await p.click('#playBtn'); await p.waitForTimeout(300); eq(p.errors, []);
  });

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  require('fs').writeFileSync(path.resolve(__dirname, 'e2e-result.txt'), results.join('\n') + `\n\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
