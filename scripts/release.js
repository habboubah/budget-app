// Release Spartopf to both stores on one version, the way pizza-driver-log
// ships Fahrtwerk: gate -> one version for both -> web build -> Android (signed
// AAB -> Play's internal test track) -> iOS (xcodebuild archive -> App Store
// Connect, lands in TestFlight) -> commit + tag. Submitting for App Review and
// promoting to production on Google Play stay manual clicks in the consoles.
//
// Usage: node scripts/release.js [patch|minor|major] [--ios] [--android] [--keep-version] [--skip-check] [--dry-run]
//   no platform flag  both stores                       npm run release
//   --ios             the App Store only                npm run release:ios
//   --android         Google Play only                  npm run release:android
//   patch (default)   1.0.0 -> 1.0.1
//   --keep-version    ship the current version again: a new build number on iOS,
//                     the next free version code on Android (the very first
//                     upload, or a build TestFlight/App Review rejected)
//   --skip-check      don't run `npm run check` first (it ran a moment ago)
//   --dry-run         print what would happen; nothing written, built or uploaded
//   Android's own:    --build N, --track T, --no-upload (scripts/release-android.js)
//
// One version for both stores. A run takes a new version — unless none of the
// stores it ships to has the current one yet: then it ships that one, so a
// store that was left out (release:ios today, release:android tomorrow) or a
// run that broke off catches up instead of opening a gap. Naming patch, minor
// or major always takes a new version.
//
// The starting version and build come from the highest of the Xcode project,
// the v* git tags and what the stores already hold, so a release commit that
// dropped out of main can't make the next upload re-use a build number.
//
// Credentials (never committed) come from the environment, optionally via the
// gitignored .env.release file (see .env.release.example):
//   ASC_KEY_ID / ASC_ISSUER_ID  App Store Connect API key id + issuer id
//   ASC_KEY_PATH                optional .p8 path; defaults to
//                               ~/.appstoreconnect/private_keys/AuthKey_<ASC_KEY_ID>.p8
//   Android's: see scripts/release-android.js
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { androidBuild, keystorePassword, playHasVersion, playVersions, prepareAndroid, shipAndroid, versionCode } from './release-android.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = path.join(rootDir, 'package.json');
const pbxprojPath = path.join(rootDir, 'ios/App/App.xcodeproj/project.pbxproj');
const exportOptions = path.join(rootDir, 'ios/App/ExportOptions.plist');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const keepVersion = args.includes('--keep-version');
const skipCheck = args.includes('--skip-check');
const namedBump = args.find(a => ['patch', 'minor', 'major'].includes(a));
const bumpType = namedBump || 'patch';
// No platform flag means both.
const doAndroid = args.includes('--android') || !args.includes('--ios');
const doIos = args.includes('--ios') || !args.includes('--android');
const targets = [doAndroid && 'android', doIos && 'ios'].filter(Boolean);
const storeName = { android: 'Google Play', ios: 'App Store Connect' };

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', cwd: rootDir, ...opts });

// Load .env.release (KEY=VALUE lines) without overriding the shell.
const envFile = path.join(rootDir, '.env.release');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

// ---- Where the last shipped version and build live ----
function maxOf(nums) {
  return Math.max(0, ...nums.filter(Number.isFinite));
}
function normVersion(v) {
  const m = String(v).trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  return m ? [m[1], m[2] || 0, m[3] || 0].map(Number).join('.') : null;
}
function newestVersion(versions) {
  const cmp = (a, b) => {
    const [x, y] = [a, b].map(v => v.split('.').map(Number));
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  };
  return versions.map(normVersion).filter(Boolean).reduce((a, b) => (cmp(a, b) >= 0 ? a : b));
}
// Every v* tag is a release: its version is in the name, its build in the
// project file of the commit it points at.
function taggedReleases() {
  const quiet = { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] };
  const versions = [], builds = [];
  let tags = [];
  try {
    tags = execSync('git tag -l "v*"', quiet).toString().split('\n').filter(Boolean);
  } catch { /* not a git checkout */ }
  for (const tag of tags) {
    if (normVersion(tag)) versions.push(tag);
    try {
      const text = execSync(`git show "${tag}:ios/App/App.xcodeproj/project.pbxproj"`, quiet).toString();
      builds.push(...[...text.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map(m => Number(m[1])));
    } catch { /* tag from before the iOS app existed */ }
  }
  return { versions, builds };
}
// Every build App Store Connect holds for this bundle id (still processing,
// expired or failed included) and the version each was uploaded under.
// Read-only, so the dry run asks too when the key is on this machine.
async function uploadedReleases() {
  const none = { versions: [], builds: [], known: false };
  if (!ascKeyPath || !ASC_ISSUER_ID || !bundleId || !fs.existsSync(ascKeyPath)) {
    if (dryRun) console.log('(No App Store Connect key on this machine — the dry run goes by the project and the git tags.)');
    return none;
  }
  try {
    const now = Math.floor(Date.now() / 1000);
    const part = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsigned = `${part({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' })}.${part({ iss: ASC_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`;
    const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: fs.readFileSync(ascKeyPath, 'utf8'), dsaEncoding: 'ieee-p1363' }).toString('base64url');
    const get = async url => {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${unsigned}.${signature}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).pathname}: ${(await res.text()).slice(0, 300)}`);
      return res.json();
    };
    const api = 'https://api.appstoreconnect.apple.com/v1';
    const apps = await get(`${api}/apps?${new URLSearchParams({ 'filter[bundleId]': bundleId, 'fields[apps]': 'bundleId' })}`);
    const app = apps.data.find(a => a.attributes.bundleId === bundleId);
    if (!app) return { ...none, known: true }; // no app record yet, so nothing uploaded
    const versions = [], builds = [];
    let url = `${api}/builds?${new URLSearchParams({
      'filter[app]': app.id,
      'fields[builds]': 'version,preReleaseVersion',
      include: 'preReleaseVersion',
      'fields[preReleaseVersions]': 'version',
      limit: '200',
    })}`;
    while (url) {
      const page = await get(url);
      builds.push(...page.data.map(b => Number(b.attributes.version)));
      versions.push(...(page.included || []).map(v => v.attributes.version));
      url = page.links?.next;
    }
    console.log(`App Store Connect: highest build so far ${maxOf(builds) || '(none)'}, newest version ${versions.length ? newestVersion(versions) : '(none)'}.`);
    return { versions, builds, known: true };
  } catch (err) {
    console.warn(`Could not ask App Store Connect for its last build (${err.message}) — going by the project and the git tags.`);
    return none;
  }
}

// ---- Preflight: anything missing must fail BEFORE a version is bumped ----
if (doIos && process.platform !== 'darwin' && !dryRun) {
  throw new Error('iOS builds need macOS with Xcode — run this on the Mac (or npm run release:android for Google Play alone).');
}
const { ASC_KEY_ID, ASC_ISSUER_ID } = process.env;
const ascKeyPath = ASC_KEY_ID && (process.env.ASC_KEY_PATH
  || path.join(os.homedir(), `.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8`));
if (doIos && !dryRun) {
  if (!ASC_KEY_ID || !ASC_ISSUER_ID) {
    throw new Error('ASC_KEY_ID / ASC_ISSUER_ID not set — copy .env.release.example to .env.release (see docs/APP_STORE_RELEASE.md).');
  }
  if (!fs.existsSync(ascKeyPath)) {
    throw new Error(`App Store Connect API key not found at ${ascKeyPath}`);
  }
}
// The Xcode project carries the version for both stores' sake: an Android-only
// release moves its MARKETING_VERSION too, so the two never drift apart.
let pbxproj = fs.readFileSync(pbxprojPath, 'utf8');
if (doIos) {
  if (!/DEVELOPMENT_TEAM = \w+;/.test(pbxproj)) {
    throw new Error('No DEVELOPMENT_TEAM in the Xcode project — open it once in Xcode and pick your team under Signing & Capabilities.');
  }
  // Built with the iOS 27 SDK, an app without the UIScene lifecycle is killed
  // by UIKit at launch. Korb's build 2 shipped that way; never repeat it.
  const infoPlist = fs.readFileSync(path.join(rootDir, 'ios/App/App/Info.plist'), 'utf8');
  if (!infoPlist.includes('UIApplicationSceneManifest') || !fs.existsSync(path.join(rootDir, 'ios/App/App/SceneDelegate.swift'))) {
    throw new Error('ios/App/App is missing the UIScene setup (SceneDelegate.swift + UIApplicationSceneManifest) — the app would crash on launch. See docs/CLAUDE.md, "Native iOS".');
  }
}
if (!/MARKETING_VERSION = /.test(pbxproj) || !/CURRENT_PROJECT_VERSION = /.test(pbxproj)) {
  throw new Error(`Could not find version settings in ${pbxprojPath}`);
}
const bundleId = pbxproj.match(/PRODUCT_BUNDLE_IDENTIFIER = "?([^";]+)"?;/)?.[1];
// The upload key, Java and the SDK, the Play service account — and what Play has.
const android = doAndroid ? await prepareAndroid(args, { dryRun }) : null;

// ---- Version: one for both stores; package.json and the Xcode project move together ----
// The project file alone can't be trusted to hold the last numbers shipped: the
// "Prepare release v1.2.1 (build 5)" commit dropped out of main, the project
// still said build 4, and the next run re-used build 5, which App Store Connect
// refused. So start from the highest of the project, every v* tag (a tag
// outlives a lost commit) and what the stores actually hold.
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const projectBuild = maxOf([...pbxproj.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map(m => Number(m[1])));
const tagged = taggedReleases();
const uploaded = doIos ? await uploadedReleases() : { versions: [], builds: [], known: false };
const oldVersion = newestVersion([pkg.version, ...tagged.versions, ...uploaded.versions, ...(android ? playVersions(android) : [])]);
// Does each store this run ships to have that version already? null = it could not be asked.
const onStore = {
  android: doAndroid ? playHasVersion(android, oldVersion) : undefined,
  ios: !doIos ? undefined : uploaded.known ? uploaded.versions.map(normVersion).includes(oldVersion) : null,
};
// None of them has it: this run brings them up to it instead of taking a new one.
const catchUp = !keepVersion && !namedBump && targets.every(t => onStore[t] === false);
let [major, minor, patch] = oldVersion.split('.').map(Number);
if (!keepVersion && !catchUp) {
  if (bumpType === 'major') [major, minor, patch] = [major + 1, 0, 0];
  else if (bumpType === 'minor') [minor, patch] = [minor + 1, 0];
  else patch += 1;
}
const newVersion = `${major}.${minor}.${patch}`;
// The iOS build number only ever goes up — App Store Connect refuses a reused one.
const oldBuild = maxOf([projectBuild, ...tagged.builds, ...uploaded.builds]);
const newBuild = doIos ? oldBuild + 1 : projectBuild;
// Android's version code follows from the version; the same version again takes the next free one.
const androidBuildNumber = doAndroid ? androidBuild(android, newVersion) : 0;
pbxproj = pbxproj.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${newVersion};`);
if (doIos) pbxproj = pbxproj.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${newBuild};`);

const lacking = targets.map(t => storeName[t]).join(' and ');
if (keepVersion) console.log(`Version: ${newVersion} (kept)`);
else if (catchUp && doAndroid && !android.upload && !doIos) console.log(`Version: ${newVersion} (stays — a bundle-only build is not a release)`);
else if (catchUp) console.log(`Version: ${newVersion} (not a new one — ${lacking} ${targets.length > 1 ? 'do' : 'does'} not have it yet)`);
else console.log(`Version: ${oldVersion} -> ${newVersion} (${bumpType})`);
if (!keepVersion && !catchUp && !namedBump && targets.some(t => onStore[t] === null)) {
  const unseen = targets.filter(t => onStore[t] === null).map(t => storeName[t]);
  console.log(`         (could not see whether ${unseen.join(' and ')} ${unseen.length > 1 ? 'have' : 'has'} ${oldVersion} — a new version is always safe)`);
}
if (doIos) console.log(`iOS:     build ${oldBuild} -> ${newBuild}`);
if (doAndroid) console.log(`Android: version code ${versionCode(newVersion, androidBuildNumber)}${android.upload ? `, ${android.track} track` : ', bundle only (--no-upload)'}`);
if (normVersion(oldVersion) !== normVersion(pkg.version) || (doIos && oldBuild !== projectBuild)) {
  console.log(`         (the project said ${pkg.version}, build ${projectBuild} — the git tags / the stores are further on)`);
}
console.log(`Stores:  ${targets.map(t => storeName[t]).join(' + ')}`);
if (dryRun) {
  console.log('\nDry run — nothing written, built or uploaded.');
  process.exit(0);
}

// Asked once, then remembered — and before the long part, so the run can be left alone.
if (doAndroid) await keystorePassword();

// ---- Gate: never bump or ship on red ----
// lint, tests (money rules, old payloads, the golden year), the privacy check
// (no request leaves the app), the performance budgets and the contrast audit.
if (!skipCheck) run('npm run check');

if (pkg.version !== newVersion) {
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}
fs.writeFileSync(pbxprojPath, pbxproj);

// ---- Record the release: one commit and the tag, for whatever reached a store ----
const shipped = [];
let play = null;
function record() {
  const notes = fs.existsSync(path.join(rootDir, 'release-notes')) ? ' release-notes' : '';
  run(`git add package.json ios/App/App.xcodeproj/project.pbxproj${notes}`);
  const quiet = { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] };
  const staged = execSync('git diff --cached --name-only', quiet).toString().trim();
  // An Android release that only caught up with the iPhone's version changes no file.
  if (staged) run(`git commit -m "Prepare release v${newVersion} (${shipped.includes('ios') ? `build ${newBuild}` : `Android ${play.versionCode}`})"`);
  if (staged || !execSync(`git tag -l v${newVersion}`, quiet).toString().trim()) run(`git tag -f v${newVersion}`);
}

// ---- Build web once, then each store ----
run('npx vite build');
try {
  // Android first: it is the quicker one to say no.
  if (doAndroid) {
    play = await shipAndroid(android, newVersion, androidBuildNumber);
    if (play.uploaded) shipped.push('android');
  }
  if (doIos) {
    run('npx cap sync ios');
    // Archive -> upload to App Store Connect (TestFlight)
    // If xcode-select points at the Command Line Tools, DEVELOPER_DIR gets
    // xcodebuild to full Xcode without `sudo xcode-select -s`.
    const env = { ...process.env };
    if (!execSync('xcode-select -p').toString().includes('Xcode.app')) {
      env.DEVELOPER_DIR = '/Applications/Xcode.app/Contents/Developer';
    }
    const auth = `-allowProvisioningUpdates -authenticationKeyPath "${ascKeyPath}" -authenticationKeyID ${process.env.ASC_KEY_ID} -authenticationKeyIssuerID ${process.env.ASC_ISSUER_ID}`;
    const archive = path.join(rootDir, 'ios/build/App.xcarchive');
    run(`xcodebuild archive -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath "${archive}" ${auth}`, { env });
    // ExportOptions.plist says destination=upload, so this step uploads.
    run(`xcodebuild -exportArchive -archivePath "${archive}" -exportOptionsPlist "${exportOptions}" -exportPath ios/build/export ${auth}`, { env });
    shipped.push('ios');
  }
} catch (error) {
  if (shipped.length) {
    record();
    console.error(`\nSpartopf v${newVersion} is on ${shipped.map(t => storeName[t]).join(' and ')}, but the iPhone build did not go through.`);
    console.error(`Fix the error below, then: npm run release:ios — it ships ${newVersion} there too.`);
  } else {
    console.error(`\nNothing was released. package.json and the Xcode project already say ${newVersion}; the next run ships that version.`);
  }
  throw error;
}

if (!shipped.length) {
  console.log('\nNothing was uploaded, so nothing was committed or tagged.');
  process.exit(0);
}
record();
const where = [
  shipped.includes('ios') && `App Store Connect (build ${newBuild})`,
  shipped.includes('android') && `Google Play (version code ${play.versionCode}, ${android.track} track${play.status === 'draft' ? ', as a draft' : ''})`,
].filter(Boolean).join(' + ');
console.log(`\nDone: Spartopf v${newVersion} uploaded to ${where}.`);
if (shipped.includes('ios')) {
  console.log('iPhone: it shows up in TestFlight after Apple finishes processing (usually 5–30 min).');
  console.log('        Then submit it for review in App Store Connect — see docs/APP_STORE_RELEASE.md, step 9.');
}
if (shipped.includes('android')) console.log('Android: promoting it to production stays a manual step in the Play Console.');
// A new version on one store only: the other is one command behind.
if (!catchUp && !keepVersion && doAndroid && !doIos) console.log(`The App Store does not have ${newVersion} yet: npm run release:ios ships the same version there.`);
if (!catchUp && !keepVersion && doIos && !doAndroid) console.log(`Google Play does not have ${newVersion} yet: npm run release:android ships the same version there.`);
