# STAR DROP (스타 드롭)

별을 떨어뜨려 같은 숫자끼리 합치는 퍼즐 게임. Capacitor 8로 Android · iOS 앱을 함께 빌드합니다.

## v3.0 업데이트
- **시작 화면**: 음악·효과음 버튼, 오늘의 미션 3개(완료당 30코인), 별 도감(13종, 발견 시 코인), 최고 레벨
- **스킨 10종**: 스펙트럼·비눗방울·동물 친구들🐰·보석(다이아 모양)·바다 친구들🐬·행성(고리)·디저트🍩·오로라·잉걸불·황금 — 코인 + 레벨 조건으로 열림
- **배경음악**: Web Audio 실시간 합성(Cmaj7–Am7–Fmaj7–G7, 96BPM). 메뉴는 잔잔하게, 게임은 베이스·아르페지오, 레벨 3부터 드럼, 피버에선 빨라짐. 앱이 백그라운드로 가면 자동 정지
- **효과음 보강**: 버튼, 착지, 합체(콤보마다 음 상승), 운석 깨짐, 레벨업, 코인, 미션 완료, 구매, 신기록
- **레벨 난이도**: 점수에 따라 레벨업(+코인·망치). 레벨이 오를수록 큰 숫자가 섞이고, 레벨 3부터 합쳐지지 않는 **운석** 등장(옆에서 합체하면 부서짐)
- **광고**: 보상형(이어하기·코인 2배·도구·상점) + **전면 광고**(처음 2판 무료, 이후 2판마다, 최소 120초 간격, 보상형 본 판은 생략) · EU 동의(UMP) · iOS 추적 허용(ATT) · 광고 개인정보 설정 버튼

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

## 로컬 작업 폴더 (Windows)
```
C:\Project\star-drop\
├─ key_backup\          안드로이드 업로드 키(stardrop-upload.jks) + keystore.properties 백업 (git 밖)
└─ star-drop\           이 저장소
```

## 자동화 스크립트
| 파일 | 하는 일 |
|---|---|
| `release-config.json` + `configure.bat` | 앱 ID, 버전, AdMob ID, 개발자명·이메일을 한 곳에서 입력 → Android/iOS/웹/개인정보처리방침/Codemagic 전체에 반영. 다시 실행해도 안전 |
| `build-android.bat` / `build-android.bat release` | 디버그 APK(USB 연결된 폰에 자동 설치) / Play 업로드용 AAB (`stardrop-release.aab`) |
| `codemagic.yaml` | Mac 없이 Codemagic에서 iOS 빌드 → 서명 → TestFlight 업로드 |
| `.github/workflows/android.yml` | push마다 APK/AAB 빌드, `v*` 태그면 GitHub Releases에 첨부 |
| `.github/workflows/ios.yml` | push마다 iOS 컴파일 확인 (업로드는 Codemagic) |
| `docs/` | GitHub Pages: 소개, 웹 플레이(`docs/play`), 개인정보처리방침, 고객지원, app-ads.txt |

## iOS 배포 (Codemagic)
1. App Store Connect에 앱 생성 (번들 ID `com.morogohi.stardrop`) → 앱 정보의 **Apple ID(숫자)** 확인
2. [codemagic.io](https://codemagic.io) → GitHub로 로그인 → **Add application** → `morogohi/star-drop` → 설정 방식 `codemagic.yaml`
3. Teams → Integrations → **Developer Portal**에 App Store Connect API 키(Admin) 연결. 궤도 점프에서 만든 `OrbitHop ASC`를 그대로 써도 됩니다
4. `codemagic.yaml`의 ★ 두 곳(통합 이름, `APP_STORE_APPLE_ID`) 확인 후 push
5. Codemagic에서 **Start new build** → `ios-release` (또는 `v*` 태그 push 시 자동) → 약 15~25분 뒤 TestFlight에 업로드

## Android 배포
1. `C:\Project\star-drop\key_backup\keystore.properties`를 `android\keystore.properties`로 복사
2. `build-android.bat release` → `stardrop-release.aab`를 Play Console에 업로드
   (또는 GitHub Secrets 4개 등록 후 `v*` 태그 push → Releases에서 AAB 다운로드)

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
