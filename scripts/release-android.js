// Build Spartopf for Google Play: gate -> web build -> cap sync android ->
// a signed AAB (android/app/build/outputs/bundle/release/app-release.aab),
// and with --upload onto Play's internal test track. Publishing further stays
// a manual step in the Play Console.
//
// Usage: node scripts/release-android.js [--build N] [--upload] [--skip-check] [--dry-run]
//        node scripts/release-android.js --make-key      once: creates the upload key
//   --make-key    make the upload keystore with keytool (it asks for a password
//                 and your name) and note its path and alias in .env.release
//   --build N     a second upload of the same version: N (1–99) is added to the
//                 version code (1.2.7 -> 1020700, with --build 1 -> 1020701)
//   --upload      send the AAB to the internal track (needs the service account)
//   --skip-check  don't run `npm run check` first (it ran a moment ago)
//   --dry-run     print what would happen; nothing built or uploaded
//
// The version is package.json's — the iPhone release (scripts/release.js)
// bumps it; Android ships the same number.
//
// Credentials (never committed) come from the environment, optionally via the
// gitignored .env.release file (see .env.release.example):
//   ANDROID_KEYSTORE_PATH       the upload keystore (.jks / .keystore)
//   ANDROID_KEYSTORE_PASSWORD   its password; left out, the script asks for it
//   ANDROID_KEY_ALIAS           the key's alias in it
//   ANDROID_KEY_PASSWORD        optional; defaults to the keystore's
//   PLAY_SERVICE_ACCOUNT_JSON   only for --upload: path of the service
//                               account's JSON key (Play Console › API access)
//
// The --upload step has not run against Google Play yet (November 2026): the
// first AAB of a new app has to be uploaded in the Play Console by hand anyway.
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = path.join(rootDir, 'android');
const aab = path.join(androidDir, 'app/build/outputs/bundle/release/app-release.aab');
const PACKAGE = 'com.habboubah.spartopf';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const upload = args.includes('--upload');
const skipCheck = args.includes('--skip-check');
const buildArg = args.includes('--build') ? Number(args[args.indexOf('--build') + 1]) : 0;
if (!Number.isInteger(buildArg) || buildArg < 0 || buildArg > 99) throw new Error('--build takes a number from 1 to 99.');

// Load .env.release (KEY=VALUE lines) without overriding the shell.
const envFile = path.join(rootDir, '.env.release');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

/** Stops with a plain message — what is missing and what to do — instead of a stack trace. */
function stop(...lines) {
  console.error(`\n${lines.join('\n')}\n`);
  process.exit(1);
}

// Android Studio brings a JDK and the SDK; use them when the shell doesn't know either.
const studioJdk = ['/Applications/Android Studio.app/Contents/jbr/Contents/Home', path.join(os.homedir(), 'Applications/Android Studio.app/Contents/jbr/Contents/Home')]
  .find(dir => fs.existsSync(path.join(dir, 'bin', 'java')));
const onPath = cmd => spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;
// (macOS answers `which java` with a stub even when no JDK is installed, so ask it properly.)
const javaWorks = () => spawnSync('java', ['-version'], { stdio: 'ignore' }).status === 0;
if (!process.env.JAVA_HOME && studioJdk && !javaWorks()) process.env.JAVA_HOME = studioJdk;
const sdkGuess = path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Android/sdk' : 'Android/Sdk');
if (!process.env.ANDROID_HOME && !fs.existsSync(path.join(androidDir, 'local.properties')) && fs.existsSync(sdkGuess)) process.env.ANDROID_HOME = sdkGuess;

// ---- Once: the upload key ----
if (args.includes('--make-key')) {
  const keystore = process.env.ANDROID_KEYSTORE_PATH || path.join(os.homedir(), '.android-keys', 'spartopf-upload.jks');
  const alias = process.env.ANDROID_KEY_ALIAS || 'spartopf';
  if (fs.existsSync(keystore)) stop(`There is already a keystore at ${keystore} — nothing made.`, 'Losing an upload key means asking Google to reset it, so this never overwrites one.');
  const keytool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'keytool') : 'keytool';
  if (!process.env.JAVA_HOME && !onPath('keytool')) stop('keytool was not found. Install Android Studio (it brings a JDK), or set JAVA_HOME.');
  fs.mkdirSync(path.dirname(keystore), { recursive: true, mode: 0o700 });
  console.log(`Making the upload key at ${keystore}.\nkeytool now asks for a password (remember it — it is needed for every release) and for your name.\n`);
  const made = spawnSync(keytool, ['-genkeypair', '-v', '-keystore', keystore, '-alias', alias, '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10000'], { stdio: 'inherit' });
  if (made.status !== 0 || !fs.existsSync(keystore)) stop('keytool did not make the key.');
  fs.chmodSync(keystore, 0o600);
  const has = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  const lines = [];
  if (!/^ANDROID_KEYSTORE_PATH=/m.test(has)) lines.push(`ANDROID_KEYSTORE_PATH=${keystore}`);
  if (!/^ANDROID_KEY_ALIAS=/m.test(has)) lines.push(`ANDROID_KEY_ALIAS=${alias}`);
  if (lines.length) fs.appendFileSync(envFile, `${has && !has.endsWith('\n') ? '\n' : ''}# Android upload key (scripts/release-android.js --make-key)\n${lines.join('\n')}\n`, { mode: 0o600 });
  console.log(`\nDone. Its path and alias are in .env.release (gitignored); the password is not.`);
  console.log('Keep a copy of the keystore file and the password somewhere safe outside this computer.');
  console.log('Next: npm run release:android — it asks for the password (or add ANDROID_KEYSTORE_PASSWORD=… to .env.release).');
  process.exit(0);
}

/** Asks for a secret on the terminal without showing it. */
function askHidden(question) {
  if (!process.stdin.isTTY) stop('ANDROID_KEYSTORE_PASSWORD is not set, and there is no terminal to ask on.');
  return new Promise(resolve => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    let typed = '';
    const onData = chunk => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(typed);
          return;
        }
        if (ch === '\u0003') { process.stdin.setRawMode(false); process.stdout.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') typed = typed.slice(0, -1);
        else typed += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

const { version } = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 1_000_000 + minor * 10_000 + patch * 100 + buildArg;
const run = (cmd, cwd = rootDir) => execSync(cmd, { stdio: 'inherit', cwd, env: { ...process.env, ANDROID_BUILD: String(buildArg) } });

console.log(`Spartopf ${version} for Android, version code ${versionCode}${dryRun ? ' (dry run)' : ''}`);

if (dryRun) {
  console.log(`Would: ${skipCheck ? '' : 'npm run check, '}vite build, cap sync android, gradlew bundleRelease${upload ? ', upload to the internal track' : ''}.`);
  if (!process.env.ANDROID_KEYSTORE_PATH) console.log('(No upload key yet: npm run android:key.)');
  process.exit(0);
}
if (!process.env.ANDROID_KEYSTORE_PATH || !process.env.ANDROID_KEY_ALIAS) {
  stop(
    'There is no upload key yet — Google Play only takes a signed bundle.',
    '',
    'Make it once:   npm run android:key',
    '(keytool asks for a password and your name; the key goes to ~/.android-keys/, its path into .env.release.)',
    '',
    'Already have a keystore? Add to .env.release:',
    '  ANDROID_KEYSTORE_PATH=/path/to/your.jks',
    '  ANDROID_KEY_ALIAS=the-alias-in-it',
    '',
    'More: docs/ANDROID_RELEASE.md',
  );
}
if (!fs.existsSync(process.env.ANDROID_KEYSTORE_PATH)) stop(`The keystore at ANDROID_KEYSTORE_PATH is not there: ${process.env.ANDROID_KEYSTORE_PATH}`);
if (upload && !process.env.PLAY_SERVICE_ACCOUNT_JSON) stop('--upload needs PLAY_SERVICE_ACCOUNT_JSON in .env.release (see docs/ANDROID_RELEASE.md).');
if (!process.env.JAVA_HOME && !javaWorks()) stop('No Java found. Install Android Studio (it brings a JDK), or set JAVA_HOME.');
if (!process.env.ANDROID_HOME && !fs.existsSync(path.join(androidDir, 'local.properties'))) {
  stop('The Android SDK was not found. Install Android Studio and open the android/ folder in it once, or set ANDROID_HOME.');
}


if (!process.env.ANDROID_KEYSTORE_PASSWORD) process.env.ANDROID_KEYSTORE_PASSWORD = await askHidden('Keystore password: ');
if (!process.env.ANDROID_KEYSTORE_PASSWORD) stop('No password given.');

// The same gate as the iPhone release: lint, tests, privacy, performance, contrast.
if (!skipCheck) run('npm run check');
run('npx vite build');
run('npx cap sync android');
run(process.platform === 'win32' ? 'gradlew.bat bundleRelease' : './gradlew bundleRelease', androidDir);
if (!fs.existsSync(aab)) throw new Error(`No bundle at ${aab}.`);
console.log(`\nSigned bundle: ${path.relative(rootDir, aab)} (${(fs.statSync(aab).size / 1e6).toFixed(1)} MB)`);

if (!upload) {
  console.log('Upload it in the Play Console (Testing › Internal testing › Create new release), or run again with --upload.');
  process.exit(0);
}

// ---- Google Play Developer API: one edit — upload, put on "internal", commit ----
const account = JSON.parse(fs.readFileSync(process.env.PLAY_SERVICE_ACCOUNT_JSON, 'utf8'));
const b64 = v => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
  iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
  aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 600,
})}`;
const assertion = `${unsigned}.${crypto.createSign('RSA-SHA256').update(unsigned).sign(account.private_key).toString('base64url')}`;

const call = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Play said ${res.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
};
const { access_token: token } = await call('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
});
const auth = { Authorization: `Bearer ${token}` };
const api = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const edit = await call(`${api}/edits`, { method: 'POST', headers: auth });
const sent = await call(
  `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${edit.id}/bundles?uploadType=media`,
  { method: 'POST', headers: { ...auth, 'Content-Type': 'application/octet-stream' }, body: fs.readFileSync(aab) },
);
await call(`${api}/edits/${edit.id}/tracks/internal`, {
  method: 'PUT',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ track: 'internal', releases: [{ name: version, versionCodes: [String(sent.versionCode)], status: 'completed' }] }),
});
await call(`${api}/edits/${edit.id}:commit`, { method: 'POST', headers: auth });
console.log(`Version code ${sent.versionCode} is on the internal test track.`);
