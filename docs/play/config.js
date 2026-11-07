// ===== STAR DROP 운영 설정 =====
// 출시 전에 아래 값을 실제 값으로 교체하세요. 비워두면 해당 기능은 꺼집니다(테스트 광고/로그만 동작).
window.SD_CONFIG = {
  // GameAnalytics (https://gameanalytics.com) — 무료. D1/D7 리텐션, 플레이타임 측정용
  gameAnalytics: {
    ios:     { key: '', secret: '' },
    android: { key: '', secret: '' }
  },
  // AdMob 보상형 광고 단위 ID. 아래는 Google 공식 "테스트" ID입니다 (실제 수익 없음).
  // 실제 ID로 바꾸기 전까지 testing:true 유지 — 본인 광고를 직접 클릭하면 계정이 정지될 수 있습니다.
  admob: {
    testing: true,
    rewarded: {
      ios:     'ca-app-pub-3940256099942544/1712485313',
      android: 'ca-app-pub-3940256099942544/5224354917'
    }
  }
};
