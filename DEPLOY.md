# 스타 드롭 — 안드로이드 · 아이폰 배포 가이드

이 프로젝트는 **Capacitor 8**로 웹 게임(`www/index.html`)을 안드로이드·iOS 네이티브 앱으로 감싼 구조입니다.
게임을 수정할 때는 `www/index.html`만 고치고 `npx cap sync`를 실행하면 두 앱에 모두 반영됩니다.

```
stardrop-app/
├─ www/index.html            ← 게임 본체 (여기만 수정)
├─ capacitor.config.json     ← 앱 ID: com.morogohi.stardrop / 앱 이름: 스타 드롭
├─ android/                  ← 안드로이드 스튜디오 프로젝트
├─ ios/App/App.xcodeproj     ← Xcode 프로젝트 (Swift Package Manager, CocoaPods 불필요)
├─ assets/                   ← 아이콘·스플래시 원본 (npm run assets 로 재생성)
├─ store/                    ← 스토어 등록 문구, 스크린샷, 개인정보처리방침
└─ .github/workflows/        ← GitHub Actions 자동 빌드 (Android / iOS)
```

> ⚠️ **앱 ID 확인**: `com.morogohi.stardrop`은 한 번 스토어에 올리면 바꿀 수 없습니다. 바꾸려면 출시 전에
> `capacitor.config.json`, `android/app/build.gradle`(namespace, applicationId), Xcode의 Bundle Identifier,
> `android/app/src/main/java/...` 폴더 경로를 함께 바꾸세요.

---

## 0. 준비물 & 비용

| 항목 | 안드로이드 | 아이폰 |
|---|---|---|
| 개발자 계정 | Google Play Console — **$25 1회** | Apple Developer Program — **연 $99** (한화 약 12~13만 원) |
| 빌드 환경 | 아무 PC (또는 GitHub Actions) | **Mac + Xcode 16 이상** (또는 GitHub Actions의 macOS 러너) |
| 심사 기간 | 신규 개인 계정: **테스터 12명 × 14일 비공개 테스트 의무** 후 프로덕션 신청 | 보통 1~3일 |
| 사업자 | 개인 가능. 유료/인앱결제 시 판매자 정보 필요 | 개인 가능. 회사 명의는 D-U-N-S 번호 필요 |

> 💡 **Google Play 신규 개인 계정의 "12명·14일" 규정**이 일정에서 가장 오래 걸립니다. 계정을 오늘 만들고 바로 비공개 테스트부터 시작하는 것을 권장합니다.
> (조직 계정으로 등록하면 이 규정이 적용되지 않습니다.)

---

## 1. 로컬에서 실행해 보기

```bash
npm ci
npx cap sync

# 안드로이드: Android Studio에서 열고 ▶ Run
npx cap open android

# 아이폰 (Mac): Xcode에서 열고 Signing & Capabilities → Team 선택 → ▶ Run
npx cap open ios
```

---

## 2. GitHub Actions 자동 빌드 (Mac 없이도 가능)

1. GitHub에 새 저장소(예: `morogohi/stardrop`, **Private 권장**)를 만들고 이 폴더를 push 합니다.
   ```bash
   git init && git add . && git commit -m "STAR DROP 1.0.0"
   git branch -M main
   git remote add origin https://github.com/morogohi/stardrop.git
   git push -u origin main
   ```
2. **Actions** 탭에서 `Android Build`, `iOS Build`가 자동 실행됩니다.
   - 서명 정보(Secrets)가 없으면: 안드로이드는 **테스트용 APK**(폰에 바로 설치 가능)를 만들고, iOS는 컴파일만 검증합니다.
   - 완료 후 Actions 실행 화면 하단 **Artifacts → stardrop-android**에서 APK/AAB를 내려받을 수 있습니다.
3. 아래 3·4단계에서 Secrets를 등록하면 **출시용 서명 빌드**가 자동으로 만들어집니다.
4. 출시할 때는 태그를 붙여 push 합니다: `git tag v1.0.0 && git push --tags`
   (빌드 번호는 GitHub 실행 번호로 자동 증가합니다.)

---

## 3. 안드로이드 (Google Play)

### 3-1. 업로드 키 만들기 (최초 1회, 아무 PC에서)
```bash
keytool -genkey -v -keystore stardrop-release.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias stardrop
```
> 🔐 이 `.jks` 파일과 비밀번호를 잃어버리면 업데이트가 어려워집니다. 안전한 곳에 **두 군데 이상** 백업하세요.
> Play Console에서 **Play 앱 서명(Play App Signing)** 을 사용하면 이 키는 "업로드 키"가 되어, 분실 시 재설정할 수 있습니다.

### 3-2. 로컬 서명 빌드를 하려면
`android/keystore.properties` 파일 생성 (git에 올라가지 않음):
```
storeFile=/절대경로/stardrop-release.jks
storePassword=****
keyAlias=stardrop
keyPassword=****
```
```bash
cd android && ./gradlew bundleRelease
# 결과: android/app/build/outputs/bundle/release/app-release.aab
```

### 3-3. GitHub Actions로 서명 빌드를 하려면 — Settings → Secrets and variables → Actions
| Secret 이름 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 stardrop-release.jks` 결과 (Mac: `base64 -i stardrop-release.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | 키스토어 비밀번호 |
| `ANDROID_KEY_ALIAS` | `stardrop` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 |
| `PLAY_SERVICE_ACCOUNT_JSON` | (선택) Play Console API 서비스 계정 JSON — 등록하면 `v*` 태그 push 시 내부 테스트 트랙에 자동 업로드 |

### 3-4. Play Console 등록 순서
1. https://play.google.com/console → **앱 만들기**: 이름 `스타 드롭 - 별 합치기 퍼즐`, 게임, 무료
2. **앱 콘텐츠** 작성 — 답변은 `store/listing.md`에 정리돼 있습니다
   - 개인정보처리방침 URL (4-5 참고) · 광고 포함 여부: **아니요** · 데이터 보안: **수집 없음**
   - 콘텐츠 등급 설문 → 전체이용가 · 타겟층: 13세 이상 권장 (아동 대상 선택 시 가족 정책 심사가 추가됨)
3. **스토어 등록정보**: `store/listing.md` 문구 + `store/icon-1024.png`(512×512로 축소) + `feature-graphic-1024x500.png` + `screens/android-phone/*.png`
4. **테스트 → 비공개 테스트** 트랙에 `app-release.aab` 업로드 → 테스터 12명 이상 초대 → **14일 유지**
5. 14일 후 **프로덕션 액세스 신청** → 심사 통과 후 출시

---

## 4. 아이폰 (App Store)

### 4-1. Apple 쪽 준비 (https://developer.apple.com, https://appstoreconnect.apple.com)
1. Apple Developer Program 가입 (연 $99)
2. **Certificates, IDs & Profiles → Identifiers**에서 App ID `com.morogohi.stardrop` 등록
3. **App Store Connect → 앱 → +신규 앱**: 플랫폼 iOS, 이름 `스타 드롭 - 별 합치기 퍼즐`, 기본 언어 한국어, 번들 ID 선택, SKU `stardrop001`

### 4-2. 방법 A — Mac에서 직접 올리기
```bash
npm ci && npx cap sync ios && npx cap open ios
```
Xcode에서:
1. App 타깃 → **Signing & Capabilities** → Team 선택 (Automatically manage signing 체크)
2. 상단 기기를 **Any iOS Device (arm64)** 로 선택
3. **Product → Archive** → Organizer → **Distribute App → App Store Connect → Upload**
4. 10~30분 뒤 App Store Connect **TestFlight**에 빌드가 나타납니다

### 4-3. 방법 B — Mac 없이 GitHub Actions로 올리기
App Store Connect → **사용자 및 액세스 → 통합 → App Store Connect API** 에서 키 생성 (역할: **App Manager** 이상), `.p8` 파일 다운로드.

| Secret 이름 | 값 |
|---|---|
| `ASC_KEY_P8_BASE64` | `base64 -w0 AuthKey_XXXX.p8` 결과 |
| `ASC_KEY_ID` | 키 ID (10자리) |
| `ASC_ISSUER_ID` | Issuer ID (UUID 형식) |
| `APPLE_TEAM_ID` | developer.apple.com → Membership의 Team ID (10자리) |

등록 후 `main`에 push 하면 **Archive → 서명 → TestFlight 업로드**까지 자동으로 진행됩니다.
> 처음 한 번은 자동 서명 인증서 생성 때문에 실패할 수 있습니다. 그럴 경우 Actions를 한 번 더 실행하거나, Mac이 있다면 Xcode에서 한 번 Archive 해 두면 이후로는 안정적입니다.

### 4-4. App Store Connect 제출 정보
- 스크린샷: `store/screens/ios-6.9/*.png` (1320×2868, 6.9" — 이것만 올리면 작은 화면용은 자동 축소)
- 이 앱은 **iPhone 전용**으로 설정되어 있어 iPad 스크린샷은 필요 없습니다
- 부제·키워드·설명: `store/listing.md`
- **앱 개인정보 보호**: "데이터를 수집하지 않음"
- 연령 등급 설문: 전부 "없음" → **4+**
- 수출 규정(암호화): Info.plist에 `ITSAppUsesNonExemptEncryption = NO`가 들어 있어 묻지 않습니다
- 가격: 무료 / 배포 국가: 대한민국 + 원하는 국가
- 심사 메모 예시: `로그인 없이 바로 플레이할 수 있는 오프라인 퍼즐 게임입니다.`

### 4-5. ⚠️ 심사 거절을 피하는 체크리스트
- **가이드라인 4.2 (최소 기능)**: "웹사이트를 감싼 앱"으로 보이면 거절될 수 있습니다. 이 앱은 오프라인 동작, 네이티브 햅틱, 네이티브 공유 시트를 사용해 대응해 두었지만, 출시 전에 **효과음·배경음, 게임 센터 리더보드, 스킨** 같은 기능을 하나 더 넣으면 훨씬 안전합니다.
- 개인정보처리방침 URL은 실제로 열려야 합니다 → `store/privacy.html`을 GitHub Pages에 올리고 이메일 주소를 채우세요.
- 앱 이름에 "2048" 같은 다른 게임 이름을 넣지 마세요 (키워드에만 사용).

---

## 5. 출시 후 업데이트 방법
1. `www/index.html` 수정
2. 버전 올리기: `android/app/build.gradle`의 `versionName`, Xcode `MARKETING_VERSION` (예: 1.0.1)
3. `git commit` → `git tag v1.0.1` → `git push --tags` → 두 스토어에 새 빌드가 올라감 → 각 콘솔에서 제출

## 6. 다음 단계 추천 (수익화 · 순위)
| 순서 | 작업 | 관련 |
|---|---|---|
| 1 | 보상형 광고로 망치/교체 지급 | `@capacitor-community/admob` — 추가하면 개인정보 응답·방침 갱신 필수 |
| 2 | 광고 제거 인앱결제 (₩3,300) | RevenueCat 또는 `cordova-plugin-purchase` |
| 3 | Game Center / Play 게임즈 리더보드 | 오늘의 챌린지 순위 경쟁 |
| 4 | 분석 도구 (Firebase Analytics) | D1/D7 재방문율 측정 — 소프트 런칭 판단 기준 |
