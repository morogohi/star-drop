// ===== STAR DROP 운영 설정 =====
// 보통은 release-config.json + configure.bat 로 채웁니다. 비워두면 해당 기능은 꺼집니다.
window.SD_CONFIG = {
  // GameAnalytics (https://gameanalytics.com) — 무료. D1/D7 리텐션, 플레이타임 측정용
  gameAnalytics: {
    ios:     { key: '', secret: '' },
    android: { key: '', secret: '' }
  },
  // AdMob 광고 단위 ID (configure.bat 가 release-config.json 값으로 채움).
  // 광고 노출 규칙·전면 광고 사용 여부는 www/rules.js 의 ads 에서 관리합니다.
  // 테스트할 때는 testing:true — 본인 광고를 직접 클릭하면 계정이 정지될 수 있습니다.
  admob: {
    testing: false,
    rewarded: {
      ios:     'ca-app-pub-8387477370861262/8343900506',
      android: 'ca-app-pub-8387477370861262/8264330257'
    },
    interstitial: {
      ios:     'ca-app-pub-8387477370861262/8251887816',
      android: 'ca-app-pub-8387477370861262/9760923956'
    }
  }
};
