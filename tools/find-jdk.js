#!/usr/bin/env node
/*
 * Finds a JDK that Gradle 8.14 can run on (Java 17–24) and prints its path on stdout.
 * Diagnostics go to stderr. Exit code 1 if none is found.
 *   node tools/find-jdk.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MIN = 17, MAX = 24, PREFER = 21;
const win = process.platform === 'win32';
const javaExe = d => path.join(d, 'bin', win ? 'java.exe' : 'java');
const env = k => process.env[k] || '';

function children(dir){
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => path.join(dir, e.name)); }
  catch(e){ return []; }
}

// candidate JDK homes
const cands = [];
const add = d => { if (d && !cands.includes(path.resolve(d))) cands.push(path.resolve(d)); };
add(env('STARDROP_JAVA_HOME'));
const PF = [env('ProgramFiles'), env('ProgramFiles(x86)'), env('ProgramW6432')].filter(Boolean);
const LAD = env('LOCALAPPDATA'), HOME = env('USERPROFILE') || env('HOME');
for (const pf of PF){
  for (const as of children(path.join(pf, 'Android'))) add(path.join(as, 'jbr'));        // Android Studio*\jbr
  for (const vendor of ['Java', 'Eclipse Adoptium', 'Microsoft', 'Zulu', 'Amazon Corretto', 'BellSoft', 'OpenJDK', 'Semeru'])
    children(path.join(pf, vendor)).forEach(add);
  for (const jb of children(path.join(pf, 'JetBrains'))) add(path.join(jb, 'jbr'));
}
if (LAD){
  add(path.join(LAD, 'Programs', 'Android Studio', 'jbr'));
  for (const t of children(path.join(LAD, 'JetBrains', 'Toolbox', 'apps'))) children(t).forEach(c => add(path.join(c, 'jbr')));
}
if (HOME){
  children(path.join(HOME, '.jdks')).forEach(add);
  children(path.join(HOME, '.gradle', 'jdks')).forEach(add);
}
if (!win){ ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines'].forEach(r => children(r).forEach(d => { add(d); add(path.join(d, 'Contents', 'Home')); })); }
add(env('JAVA_HOME'));

function versionOf(home){
  const exe = javaExe(home);
  if (!fs.existsSync(exe)) return null;
  // -XshowSettings and -version both print to stderr, so read both streams
  const r = spawnSync(exe, ['-XshowSettings:properties', '-version'], { encoding: 'utf8', timeout: 20000, windowsHide: true });
  return parse(String(r.stderr || '') + String(r.stdout || ''));
}
function parse(text){
  const m = /java\.specification\.version\s*=\s*([\d.]+)/.exec(text) || /version "([\d._]+)/.exec(text);
  if (!m) return null;
  const v = m[1];
  return v.startsWith('1.') ? Number(v.split('.')[1]) : Number(v.split('.')[0]);
}

const found = [];
for (const c of cands){
  const v = versionOf(c);
  if (v) found.push({ home: c, v });
}
const ok = found.filter(f => f.v >= MIN && f.v <= MAX)
  .sort((a, b) => (a.v === PREFER ? -1 : 0) - (b.v === PREFER ? -1 : 0) || b.v - a.v);

process.stderr.write('  찾은 JDK:\n' + (found.length ? found.map(f => `   - Java ${f.v}  ${f.home}${f.v > MAX ? '   (너무 최신, 사용 불가)' : f.v < MIN ? '   (너무 오래됨)' : ''}`).join('\n') : '   (없음)') + '\n');
if (!ok.length){
  process.stderr.write(`  [오류] Gradle 8.14 는 Java ${MIN}~${MAX} 가 필요합니다.\n`);
  process.exit(1);
}
process.stdout.write(ok[0].home);
