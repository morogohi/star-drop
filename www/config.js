// ===== STAR DROP 운영 설정 =====
// 보통은 release-config.json + configure.bat 로 채웁니다. 비워두면 해당 기능은 꺼집니다.
window.SD_CONFIG = {
  // GameAnalytics (https://gameanalytics.com) — 무료. D1/D7 리텐션, 플레이타임 측정용
  gameAnalytics: {
    ios:     { key: '', secret: '' },
    android: { key: '', secret: '' }
  },
  // AdMob 광고 단위 ID. 아래는 Google 공식 "테스트" ID입니다 (실제 수익 없음).
  // 실제 ID로 바꾸기 전까지 testing:true 유지 — 본인 광고를 직접 클릭하면 계정이 정지될 수 있습니다.
  admob: {
    testing: false,
    rewarded: {
      ios:     'ca-app-pub-8387477370861262/8343900506',
      android: 'ca-app-pub-8387477370861262/8264330257'
    },
    interstitial: {
      ios:     'ca-app-pub-8387477370861262/8251887816',
      android: 'ca-app-pub-8387477370861262/9760923956'
    },
    // 전면 광고 노출 규칙: 처음 N판은 광고 없음, 이후 M판마다 1회, 최소 간격(초)
    interstitialRule: { freeGames: 2, everyGames: 2, minGapSec: 120 }
  }
};
