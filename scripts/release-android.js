// Build Spartopf for Google Play: gate -> web build -> cap sync android ->
// a signed AAB (android/app/build/outputs/bundle/release/app-release.aab),
// and with --upload onto Play's internal test track. Publishing further stays
// a manual step in the Play Console.
//
// Usage: node scripts/release-android.js [--build N] [--upload] [--skip-check] [--dry-run]
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
//   ANDROID_KEYSTORE_PASSWORD   its password
//   ANDROID_KEY_ALIAS           the key's alias in it
//   ANDROID_KEY_PASSWORD        optional; defaults to the keystore's
//   PLAY_SERVICE_ACCOUNT_JSON   only for --upload: path of the service
//                               account's JSON key (Play Console › API access)
//
// The --upload step has not run against Google Play yet (November 2026): the
// first AAB of a new app has to be uploaded in the Play Console by hand anyway.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

const { version } = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 1_000_000 + minor * 10_000 + patch * 100 + buildArg;
const env = { ...process.env, ANDROID_BUILD: String(buildArg) };
const run = (cmd, cwd = rootDir) => execSync(cmd, { stdio: 'inherit', cwd, env });

console.log(`Spartopf ${version} for Android, version code ${versionCode}${dryRun ? ' (dry run)' : ''}`);

for (const key of ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS']) {
  if (!process.env[key]) throw new Error(`${key} not set — copy .env.release.example to .env.release (see docs/ANDROID_RELEASE.md).`);
}
if (!fs.existsSync(process.env.ANDROID_KEYSTORE_PATH)) throw new Error('The keystore at ANDROID_KEYSTORE_PATH is not there.');
if (upload && !process.env.PLAY_SERVICE_ACCOUNT_JSON) throw new Error('--upload needs PLAY_SERVICE_ACCOUNT_JSON (see docs/ANDROID_RELEASE.md).');

if (dryRun) {
  console.log(`Would: ${skipCheck ? '' : 'npm run check, '}vite build, cap sync android, gradlew bundleRelease${upload ? ', upload to the internal track' : ''}.`);
  process.exit(0);
}

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
