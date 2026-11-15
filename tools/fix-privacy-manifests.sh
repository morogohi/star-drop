#!/bin/bash
# ITMS-91064 대응: 앱·SDK에 들어가는 모든 PrivacyInfo.xcprivacy 를 정리합니다.
#  - NSPrivacyTrackingDomains 가 비어 있으면 키 자체를 삭제 (Apple DTS 권고)
#  - 도메인이 있는데 NSPrivacyTracking 이 false/없음이면 true 로 설정
# 사용: bash fix-privacy-manifests.sh <검사할 폴더들...>
# 서명된 xcframework 안의 파일을 고치면 Xcode 서명 검증이 실패하므로, 해당 xcframework 의 서명 정보를 제거합니다(앱에 포함될 때 Xcode가 다시 서명).
strip_sig() {
  local xcf
  xcf=$(printf "%s" "$1" | sed -n "s#\(.*\.xcframework\)/.*#\1#p")
  if [ -n "$xcf" ]; then rm -rf "$xcf/_CodeSignature" "$xcf/Signatures"; echo "  -> 서명 제거: $xcf"; fi
}
for ROOT in "$@"; do
  [ -d "$ROOT" ] || continue
  find "$ROOT" -name "PrivacyInfo.xcprivacy" -print0 2>/dev/null | while IFS= read -r -d '' f; do
    chmod u+w "$f" 2>/dev/null
    if /usr/libexec/PlistBuddy -c "Print :NSPrivacyTrackingDomains" "$f" >/dev/null 2>&1; then
      n=$(/usr/libexec/PlistBuddy -c "Print :NSPrivacyTrackingDomains" "$f" | grep -vc -E '^(Array \{|\})$')
      t=$(/usr/libexec/PlistBuddy -c "Print :NSPrivacyTracking" "$f" 2>/dev/null || echo missing)
      if [ "$n" = "0" ]; then
        /usr/libexec/PlistBuddy -c "Delete :NSPrivacyTrackingDomains" "$f" && echo "FIXED (빈 도메인 키 삭제): $f" && strip_sig "$f"
      elif [ "$t" != "true" ]; then
        /usr/libexec/PlistBuddy -c "Delete :NSPrivacyTracking" "$f" 2>/dev/null
        /usr/libexec/PlistBuddy -c "Add :NSPrivacyTracking bool true" "$f" && echo "FIXED (Tracking=true): $f" && strip_sig "$f"
      else
        echo "OK: $f"
      fi
    else
      echo "OK (도메인 키 없음): $f"
    fi
  done
done
