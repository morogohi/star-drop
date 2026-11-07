# 스타 드롭 출시 체크리스트 (v2.0.0)

✅ = 준비 완료 · 👤 = Austin님이 직접 해야 함 (계정·결제·약관·비밀번호)

## 공통
| | 항목 | 값 / 위치 |
|---|---|---|
| ✅ | 앱 이름 | 스타 드롭 - 별 합치기 퍼즐 / Star Drop - Merge Puzzle |
| ✅ | 번들 ID / 패키지명 | `com.morogohi.stardrop` (출시 후 변경 불가) |
| ✅ | 버전 | 2.0.0 (빌드 번호는 GitHub 실행 번호로 자동 증가) |
| ✅ | 설명·키워드·부제 (한/영) | `store/listing.md` |
| ✅ | 아이콘 1024 · 스크린샷 · 그래픽 이미지 | `store/` |
| ✅ | 개인정보처리방침·지원 페이지 | `docs/` 폴더 (GitHub Pages) |
| 👤 | GitHub 저장소 Settings → Pages → Branch `main` / 폴더 `/docs` → Save | 1회 |
| ✅ | 개인정보처리방침 URL | https://morogohi.github.io/star-drop/privacy-policy.html |
| ✅ | 지원 URL | https://morogohi.github.io/star-drop/support.html |
| ✅ | 문의 이메일 | morogohi@gmail.com |
| ⚠️ | 광고 | 현재 **Google 테스트 광고 ID**로 설정됨 → 수익 0. AdMob 가입 후 교체 (GROWTH.md 1-2) |
| ⚠️ | 분석 | GameAnalytics 키 미입력 → 측정 꺼짐 (`www/config.js`) |

## Google Play
| | 항목 | 비고 |
|---|---|---|
| 👤 | Play Console 개발자 등록 ($25) | 개인 계정이면 신원 인증 + **테스터 12명 × 14일** 비공개 테스트가 필수 |
| ✅ | 업로드 서명키 | `stardrop-upload.jks` (대화로 전달됨) |
| 👤 | GitHub Secrets 4개 등록 | `STARDROP_SIGNING_KEY.txt`에 적힌 값 그대로 |
| ✅ | 출시용 빌드 자동화 | `git tag v2.0.0 && git push --tags` → GitHub **Releases**에 `*-play.aab`, `*-test.apk` 첨부 |
| ✅ | target SDK 36, 세로 고정, 정확 알람 권한 제거 | Play 정책 충족 |
| ✅ | 데이터 보안·광고 포함·콘텐츠 등급 응답 | `store/listing.md` v1.1 응답 |
| 👤 | 앱 만들기 → 앱 콘텐츠 작성 → 비공개 테스트 트랙에 AAB 업로드 → 테스터 초대 | Play App Signing 사용 (기본값) |
| 👤 | 14일 후 프로덕션 액세스 신청 → 출시 | |

## Apple App Store
| | 항목 | 비고 |
|---|---|---|
| 👤 | Apple Developer Program 가입 (연 $99) | 개인으로 가입 시 판매자명이 실명으로 표시 |
| 👤 | App ID `com.morogohi.stardrop` 등록, App Store Connect에 앱 생성 | SKU 예: `stardrop001` |
| ✅ | 개인정보 매니페스트 `PrivacyInfo.xcprivacy` | 광고·분석 데이터 신고, 추적 안 함 |
| ✅ | 수출 규정(암호화 없음) | Info.plist에 설정 → 제출 시 질문 생략 |
| ✅ | iPhone 전용, 세로 고정 | iPad 스크린샷 불필요 |
| ✅ | 6.9" 스크린샷 3장 | `store/screens/ios-6.9/` |
| ✅ | Codemagic 설정 | `codemagic.yaml` (iOS → TestFlight) |
| 👤 | Codemagic에 저장소 연결, API 키 통합 이름·Apple ID 숫자 확인 후 빌드 시작 | 배포 가이드 2단계 |
| ✅ | 앱 개인정보 응답(App Privacy) | `store/listing.md` v1.1 |
| ✅ | 연령 등급 | 4+ (광고 포함이지만 내용상 4+) |
| 👤 | 심사 제출 | 심사 메모: "로그인 없이 바로 플레이하는 오프라인 퍼즐 게임. 보상형 광고는 Google 테스트 광고입니다." |

## 심사 거절 위험 점검
| 위험 | 대응 상태 |
|---|---|
| Apple 4.2 최소 기능 ("웹 감싼 앱") | 오프라인 동작, 네이티브 햅틱·공유·로컬 알림, 보상형 광고, 스킨 상점 → 대응함 |
| 개인정보처리방침 URL이 열리지 않음 | 👤 페이지 공개 전환 필요 |
| 개인정보 응답과 실제 SDK 불일치 | AdMob·GameAnalytics 기준으로 맞춰 둠 |
| 테스트 광고로 제출 | 심사상 문제는 없지만 수익이 없음 → AdMob 교체 권장 |
