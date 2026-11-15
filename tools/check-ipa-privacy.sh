#!/bin/bash
# 업로드 전에 IPA 안의 모든 PrivacyInfo.xcprivacy 를 검사합니다. 문제가 있으면 빌드를 실패시켜 Apple 반려를 막습니다.
IPA=$(ls build/ios/ipa/*.ipa 2>/dev/null | head -1)
[ -n "$IPA" ] || { echo "IPA 없음"; exit 1; }
T=$(mktemp -d); unzip -q "$IPA" -d "$T"
bad=0
while IFS= read -r -d '' f; do
  rel=${f#$T/}
  if /usr/libexec/PlistBuddy -c "Print :NSPrivacyTrackingDomains" "$f" >/dev/null 2>&1; then
    t=$(/usr/libexec/PlistBuddy -c "Print :NSPrivacyTracking" "$f" 2>/dev/null || echo missing)
    n=$(/usr/libexec/PlistBuddy -c "Print :NSPrivacyTrackingDomains" "$f" | grep -vc -E '^(Array \{|\})$')
    if [ "$n" = "0" ] || [ "$t" != "true" ]; then echo "BAD  ($t, domains=$n): $rel"; bad=1; else echo "OK   (tracking, domains=$n): $rel"; fi
  else
    echo "OK   (no domains key): $rel"
  fi
done < <(find "$T" -name "*.xcprivacy" -print0)
rm -rf "$T"; exit $bad
