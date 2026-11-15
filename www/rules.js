/*
 * STAR DROP 게임 규칙 설정 (한 곳에서 관리)
 * 난이도·등장 확률·도구 공급·도전 목표·광고 제한을 여기서만 바꿉니다.
 * version 을 올리면 일일 챌린지 시드가 바뀝니다(같은 날짜·같은 버전끼리만 같은 별 순서).
 */
(function (root) {
  const RULES = {
    version: 4,
    rows: 7,
    cols: 5,

    // 레벨: 레벨 n 을 벗어나는 데 필요한 누적 점수 = levelK × n × (n+1)
    levelK: 400,
    levelCoins: 10,                    // 레벨업 보상 코인 = levelCoins × 새 레벨

    // 별 등장 확률
    spawn: {
      decay: 0.62,                     // 2^k 별의 가중치 = decay^(k-1)
      decayHigh: 0.70,                 // highFromLevel 이상에서 큰 별 비중
      highFromLevel: 6,
      minTop: 3, maxTop: 7,            // 등장 가능한 최대 별 = 2^top
      firstGameEasyDrops: 30           // 클래식 첫 판은 처음 30수 동안 2·4만
    },

    // 운석: 합쳐지지 않음. 바로 옆에서 합체가 일어나면 부서짐(+50점)
    rocks: { fromLevel: 3, perLevel: 0.035, max: 0.22, minDrops: 3, points: 50 },

    fever: { base: 5, perCombo: 4, length: 10, mult: 2 },

    // 도구 공급. cap = 보유 상한(자동 지급 시)
    tools: {
      classic:   { start: { hammer: 1, swap: 1 }, perLevelUp: { hammer: 1, swap: 1 }, cap: 3, adPerGame: 99 },
      daily:     { start: { hammer: 1, swap: 1 }, perLevelUp: { hammer: 0, swap: 0 }, cap: 3, adPerGame: 1 },
      challenge: { start: { hammer: 1, swap: 1 }, perLevelUp: { hammer: 0, swap: 0 }, cap: 3, adPerGame: 1 }
    },

    // 게임 종료 코인 = score/endCoinDiv + 최대콤보×2 + 레벨×5 (+일일 20)
    endCoinDiv: 50,

    ads: {
      extraMoves: 5,                   // 도전 실패 후 광고 +5수
      extraMovesPerGame: 1,
      continuePerGame: 1,              // 클래식: 가득 찼을 때 광고로 위 2줄 비우기
      interstitial: { enabled: false, freeGames: 2, everyGames: 3, minGapSec: 180 }
    },

    // 40수 도전. goal.type: star(별 만들기) | score | chains(콤보 ×min 이상을 n번) | rocks(운석 n개 제거)
    // level: 별 등장 난이도 기준 레벨(도전 중 고정), rockChance: 운석 확률(지정 시 레벨 규칙 대신 사용)
    // 목표 수치는 tests/sim.js 결과로 정함(합체우선/단순반복 전략 성공률, 300시드): c1 81/66% · c3 82/63% · c2 65/37%
    //   · c4 53/51% · c5 26/12% · c6 13/4%  — 사람이 도구를 전략적으로 쓰면 더 높아짐
    challenges: [
      { id: 'c1', name: '첫 별자리',   diff: '쉬움',   moves: 40, level: 1, goal: { type: 'star',   target: 64 },         reward: 30, firstClear: 50 },
      { id: 'c3', name: '연쇄 반응',   diff: '쉬움',   moves: 40, level: 2, goal: { type: 'chains', min: 3, target: 2 },  reward: 30, firstClear: 50 },
      { id: 'c2', name: '점수 사냥',   diff: '보통',   moves: 40, level: 2, goal: { type: 'score',  target: 1000 },       reward: 40, firstClear: 60 },
      { id: 'c4', name: '운석 정리',   diff: '보통',   moves: 40, level: 3, rockChance: 0.15, goal: { type: 'rocks', target: 3 }, reward: 40, firstClear: 60 },
      { id: 'c5', name: '거성 탄생',   diff: '어려움', moves: 40, level: 5, goal: { type: 'star',   target: 128 },        reward: 60, firstClear: 100 },
      { id: 'c6', name: '초거성 도전', diff: '최고',   moves: 40, level: 8, rockChance: 0.05, goal: { type: 'star', target: 256 }, reward: 80, firstClear: 150 }
    ],



    // 확장용(아직 콘텐츠 없음): 별자리 조각·배경 해금
    collections: { constellations: [], backgrounds: [] }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = RULES;
  else root.SD_RULES = RULES;
})(this);
