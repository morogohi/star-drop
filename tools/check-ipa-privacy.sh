#!/bin/bash
# 업로드 전에 IPA 안의 모든 PrivacyInfo.xcprivacy 를 Apple TN3181 기준으로 검사합니다. 문제가 있으면 빌드를 실패시켜 반려를 막습니다.
#  - NSPrivacyTracking=true 인데 NSPrivacyTrackingDomains 가 없거나 비어 있음 → ITMS-91064
#  - NSPrivacyTracking=false 인데 NSPrivacyTrackingDomains 에 항목이 있음 → ITMS-91064
# SDK(xcframework) 파일은 고치지 않습니다. 고치면 SDK 서명이 깨져 ITMS-91065(Missing signature)로 반려됩니다.
IPA=$(ls build/ios/ipa/*.ipa 2>/dev/null | head -1)
[ -n "$IPA" ] || { echo "IPA 없음"; exit 1; }
T=$(mktemp -d); unzip -q "$IPA" -d "$T"
bad=0
while IFS= read -r -d '' f; do
  rel=${f#$T/Payload/*.app/}
  t=$(/usr/libexec/PlistBuddy -c "Print :NSPrivacyTracking" "$f" 2>/dev/null || echo missing)
  if /usr/libexec/PlistBuddy -c "Print :NSPrivacyTrackingDomains" "$f" >/dev/null 2>&1; then
    n=$(/usr/libexec/PlistBuddy -c "Print :NSPrivacyTrackingDomains" "$f" | grep -vc -E '^(Array \{|\})$')
  else n=0; fi
  if [ "$t" = "true" ] && [ "$n" = "0" ]; then echo "BAD  (tracking=true, 도메인 없음): $rel"; bad=1
  elif [ "$t" != "true" ] && [ "$n" != "0" ]; then echo "BAD  (tracking=$t, 도메인 $n개): $rel"; bad=1
  else echo "OK   (tracking=$t, 도메인 $n개): $rel"; fi
done < <(find "$T" -name "*.xcprivacy" -print0)
# SDK 서명 유지 확인 (ITMS-91065 예방)
for fw in Capacitor Cordova; do
  d=$(find "$T" -path "*Frameworks/$fw.framework" -type d | head -1)
  [ -n "$d" ] && { codesign -dv "$d" >/dev/null 2>&1 && echo "OK   서명: $fw" || { echo "BAD  서명 없음: $fw"; bad=1; }; }
done
rm -rf "$T"; exit $bad
