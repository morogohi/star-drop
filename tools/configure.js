#!/usr/bin/env node
/*
 * release-config.json 값을 프로젝트 전체 파일에 한 번에 반영합니다.
 * 여러 번 실행해도 안전합니다: 현재 앱 ID는 capacitor.config.json에서 읽어 바꿉니다.
 *
 *   node tools/configure.js        (Windows: configure.bat 더블클릭)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const p = (...a) => path.join(ROOT, ...a);
const read = f => fs.readFileSync(p(f), 'utf8');
const write = (f, s) => fs.writeFileSync(p(f), s);
const exists = f => fs.existsSync(p(f));

const cfg = JSON.parse(read('release-config.json'));
const errors = [], warnings = [], changed = [];

// ---------- 검사 ----------
const APP_ID_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){2,}$/;
const ADMOB_APP_RE = /^ca-app-pub-\d{16}~\d{10}$/;
const ADMOB_UNIT_RE = /^ca-app-pub-\d{16}\/\d{10}$/;
const PUB_RE = /^pub-\d{16}$/;

if (!APP_ID_RE.test(cfg.appId || '')) errors.push(`appId "${cfg.appId}" 형식 오류 (예: com.morogohi.stardrop)`);
if (!/^\d+\.\d+\.\d+$/.test(String(cfg.versionName))) errors.push(`versionName "${cfg.versionName}" 형식 오류 (예: 2.0.1)`);
if (!Number.isInteger(cfg.versionCode) || cfg.versionCode < 1) errors.push('versionCode는 1 이상의 정수여야 합니다.');

const ad = cfg.admob || {};
const ids = ['androidAppId', 'iosAppId', 'androidRewarded', 'iosRewarded', 'androidInterstitial', 'iosInterstitial'];
const allAd = ids.every(k => ad[k]);
if (ad.androidAppId && !ADMOB_APP_RE.test(ad.androidAppId)) errors.push('admob.androidAppId 형식 오류 (ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY)');
if (ad.iosAppId && !ADMOB_APP_RE.test(ad.iosAppId)) errors.push('admob.iosAppId 형식 오류 (ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY)');
for (const k of ['androidRewarded', 'iosRewarded', 'androidInterstitial', 'iosInterstitial']) if (ad[k] && !ADMOB_UNIT_RE.test(ad[k])) errors.push(`admob.${k} 형식 오류 (ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY)`);
if (ad.publisherId && !PUB_RE.test(ad.publisherId)) errors.push('admob.publisherId 형식 오류 (pub-XXXXXXXXXXXXXXXX)');
if (!allAd) warnings.push('AdMob 앱 ID 2개·광고 단위 ID 4개가 모두 채워지지 않아 테스트 광고 모드를 유지합니다.');

if (errors.length) {
  console.error('\n[오류] release-config.json을 고쳐 주세요:\n - ' + errors.join('\n - '));
  process.exit(1);
}

// ---------- 적용 ----------
function edit(file, fn) {
  if (!exists(file)) return;
  const before = read(file), after = fn(before);
  if (after !== before) { write(file, after); changed.push(file); }
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const oldId = JSON.parse(read('capacitor.config.json')).appId;
const newId = cfg.appId;
const swapId = s => s.split(oldId).join(newId);

// 앱 ID
edit('capacitor.config.json', swapId);
edit('android/app/build.gradle', s => swapId(s)
  .replace(/System\.getenv\("VERSION_CODE"\) \?: "\d+"/, `System.getenv("VERSION_CODE") ?: "${cfg.versionCode}"`)
  .replace(/versionName "[^"]*"/, `versionName "${cfg.versionName}"`));
edit('android/app/src/main/res/values/strings.xml', swapId);
edit('ios/App/App.xcodeproj/project.pbxproj', s => swapId(s)
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${cfg.versionName};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${cfg.versionCode};`));
edit('codemagic.yaml', swapId);
edit('build-android.bat', swapId);
edit('.github/workflows/android.yml', swapId);
edit('package.json', s => s.replace(/"version": "[^"]*"/, `"version": "${cfg.versionName}"`));

// Android: MainActivity 폴더는 패키지 이름과 같아야 함
if (oldId !== newId) {
  const javaRoot = p('android/app/src/main/java');
  const oldDir = path.join(javaRoot, ...oldId.split('.'));
  const newDir = path.join(javaRoot, ...newId.split('.'));
  const oldFile = path.join(oldDir, 'MainActivity.java');
  if (fs.existsSync(oldFile)) {
    fs.mkdirSync(newDir, { recursive: true });
    const src = fs.readFileSync(oldFile, 'utf8').replace(new RegExp(`^package ${esc(oldId)};`, 'm'), `package ${newId};`);
    fs.writeFileSync(path.join(newDir, 'MainActivity.java'), src);
    try { fs.unlinkSync(oldFile); } catch (e) { warnings.push(`기존 ${path.relative(ROOT, oldFile)} 를 지우지 못했습니다. 직접 삭제하세요.`); }
    let d = oldDir;
    while (d.startsWith(javaRoot) && d !== javaRoot) { try { fs.rmdirSync(d); } catch (e) { break; } d = path.dirname(d); }
    changed.push(path.relative(ROOT, path.join(newDir, 'MainActivity.java')));
  }
  warnings.push('앱 ID를 바꿨습니다. Apple Developer의 App ID와 Play Console의 패키지명도 새 값으로 만들어야 합니다.');
}

// AdMob
if (ad.androidAppId) edit('android/app/src/main/AndroidManifest.xml', s =>
  s.replace(/(android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value=")[^"]*(")/, `$1${ad.androidAppId}$2`));
if (ad.iosAppId) edit('ios/App/App/Info.plist', s =>
  s.replace(/(<key>GADApplicationIdentifier<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${ad.iosAppId}$2`));
if (allAd) edit('www/config.js', s => s
  .replace(/^(\s*)testing:\s*(true|false)/m, '$1testing: false')
  .replace(/(rewarded:\s*\{\s*ios:\s*')[^']*('\s*,\s*android:\s*')[^']*(')/, `$1${ad.iosRewarded}$2${ad.androidRewarded}$3`)
  .replace(/(interstitial:\s*\{\s*ios:\s*')[^']*('\s*,\s*android:\s*')[^']*(')/, `$1${ad.iosInterstitial}$2${ad.androidInterstitial}$3`));
if (ad.publisherId) edit('docs/app-ads.txt', s => s.replace(/^(google\.com, )pub-[X\d]{16}/m, `$1${ad.publisherId}`));

// 개인정보처리방침·지원 페이지 링크
if (cfg.developerName && cfg.contactEmail) edit('docs/privacy-policy.html', s => s
  .replace(/(<span class="dev">)[^<]*(<\/span>)/g, `$1${cfg.developerName}$2`)
  .replace(/(<span class="mail">)[^<]*(<\/span>)/g, `$1${cfg.contactEmail}$2`));
if (cfg.pagesUrl) edit('www/index.html', s => s
  .replace(/href="[^"]*#privacy"/, `href="${cfg.pagesUrl}/privacy-policy.html"`)
  .replace(/href="[^"]*#support"/, `href="${cfg.pagesUrl}/support.html"`)
  .replace(/href="[^"]*\/privacy-policy\.html"/, `href="${cfg.pagesUrl}/privacy-policy.html"`)
  .replace(/href="[^"]*\/support\.html"/, `href="${cfg.pagesUrl}/support.html"`)
  .replace(/버전 \d+\.\d+\.\d+/, `버전 ${cfg.versionName}`));

// GitHub Pages용 웹 플레이 사본 (docs/play)
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}
if (exists('docs')) { copyDir(p('www'), p('docs/play')); changed.push('docs/play/ (웹 플레이 사본)'); }

// ---------- 결과 ----------
console.log('\n=== 스타 드롭 출시 설정 적용 ===');
console.log(` 앱 ID     : ${oldId === newId ? newId : oldId + ' → ' + newId}`);
console.log(` 버전      : ${cfg.versionName} (Android versionCode / iOS Build ${cfg.versionCode})`);
console.log(` 광고 모드 : ${allAd ? '실제 광고' : '테스트 광고'}`);
console.log(` 바뀐 파일 : ${changed.length ? '\n   - ' + [...new Set(changed)].join('\n   - ') : '없음'}`);
if (warnings.length) console.log('\n[확인 필요]\n - ' + warnings.join('\n - '));
console.log('\n다음: npx cap sync  (configure.bat는 자동으로 실행합니다)\n');
