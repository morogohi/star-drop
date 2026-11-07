# STAR DROP (스타 드롭)

별을 떨어뜨려 같은 숫자끼리 합치는 퍼즐 게임. Capacitor 8로 Android · iOS 앱을 함께 빌드합니다.

## v2.0 디자인
- **별의 일생을 따라가는 타일**: 적색왜성(2) → 주황별 → 노란별 → … → 초신성(2048) → 중성자별 → 블랙홀. 실제 별의 색 순서(M·K·G·F·A·B·O형)를 따릅니다.
- **천체 관측 차트 보드**, 전용 글꼴(Jua · Fredoka), 타이틀 화면, 일시정지·설정(효과음/진동/알림)
- **합체 연출**: 별 모양 파티클, 충격파, 화면 번쩍임·흔들림이 콤보마다 커짐, 단계별 칭찬 문구, 점수판으로 날아가는 반짝이
- **피버 모드**: 합칠 때마다 게이지가 차고, 가득 차면 10수 동안 점수 2배
- **초신성 폭발**: 2048 이상을 만들면 화면 전체 폭발 연출
- 처음 플레이하면 손가락 안내, 새 별 등급 발견 알림 배너

## 폴더 구조
| 경로 | 내용 |
|---|---|
| `www/index.html` | 게임 본체 (여기만 고치면 두 앱에 반영) |
| `www/config.js` | 광고(AdMob)·분석(GameAnalytics) 설정 |
| `www/fonts/` | 앱에 포함된 글꼴 (오프라인 동작) |
| `android/`, `ios/` | 네이티브 프로젝트 |
| `assets/` | 아이콘·스플래시 원본 (`npm run assets`로 재생성) |
| `store/` | 스토어 등록 문구, 스크린샷, 개인정보·지원 페이지 |
| `ads/` | CPI 테스트용 광고 영상 |
| `.github/workflows/` | 자동 빌드 (Android AAB/APK, iOS TestFlight) |

## 실행
```bash
npm ci && npx cap sync
npx cap open android   # Android Studio
npx cap open ios       # Xcode (Mac)
```
웹 브라우저로 `www/index.html`을 열어도 플레이할 수 있습니다 (광고는 가짜 미리보기).

## 문서
- 배포 가이드: [DEPLOY.md](DEPLOY.md) · 출시 체크리스트: [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
- 성장 계획(CPI·리텐션·수익화·퍼블리셔): [GROWTH.md](GROWTH.md)
