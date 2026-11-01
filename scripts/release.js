// Release Spartopf to App Store Connect (lands in TestFlight), the same way
// pizza-driver-log ships Fahrtwerk and shopping-list ships Korb: lint+test
// gate -> bump version + build number -> web build -> cap sync -> xcodebuild
// archive -> upload -> commit + tag. Submitting for App Review stays a
// manual click in App Store Connect.
//
// Usage: node scripts/release.js [patch|minor|major] [--keep-version] [--dry-run]
//   patch (default)  1.0.0 -> 1.0.1
//   --keep-version   ship the current version again with a new build number
//                    (use it for the very first upload, 1.0.0, and to re-upload
//                    a build TestFlight/App Review rejected)
//   --dry-run        print what would happen; nothing written, built or uploaded
//
// Credentials (never committed) come from the environment, optionally via the
// gitignored .env.release file (see .env.release.example):
//   ASC_KEY_ID / ASC_ISSUER_ID  App Store Connect API key id + issuer id
//   ASC_KEY_PATH                optional .p8 path; defaults to
//                               ~/.appstoreconnect/private_keys/AuthKey_<ASC_KEY_ID>.p8
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = path.join(rootDir, 'package.json');
const pbxprojPath = path.join(rootDir, 'ios/App/App.xcodeproj/project.pbxproj');
const exportOptions = path.join(rootDir, 'ios/App/ExportOptions.plist');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const keepVersion = args.includes('--keep-version');
const bumpType = args.find(a => ['patch', 'minor', 'major'].includes(a)) || 'patch';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', cwd: rootDir, ...opts });

// Load .env.release (KEY=VALUE lines) without overriding the shell.
const envFile = path.join(rootDir, '.env.release');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

// ---- Preflight: anything missing must fail BEFORE a version is bumped ----
if (process.platform !== 'darwin' && !dryRun) {
  throw new Error('iOS builds need macOS with Xcode — run this on the Mac.');
}
let ascKeyPath;
if (!dryRun) {
  const { ASC_KEY_ID, ASC_ISSUER_ID } = process.env;
  if (!ASC_KEY_ID || !ASC_ISSUER_ID) {
    throw new Error('ASC_KEY_ID / ASC_ISSUER_ID not set — copy .env.release.example to .env.release (see APP_STORE_RELEASE.md).');
  }
  ascKeyPath = process.env.ASC_KEY_PATH
    || path.join(os.homedir(), `.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8`);
  if (!fs.existsSync(ascKeyPath)) {
    throw new Error(`App Store Connect API key not found at ${ascKeyPath}`);
  }
}
let pbxproj = fs.readFileSync(pbxprojPath, 'utf8');
if (!/DEVELOPMENT_TEAM = \w+;/.test(pbxproj)) {
  throw new Error('No DEVELOPMENT_TEAM in the Xcode project — open it once in Xcode and pick your team under Signing & Capabilities.');
}
// Built with the iOS 27 SDK, an app without the UIScene lifecycle is killed
// by UIKit at launch. Korb's build 2 shipped that way; never repeat it.
const infoPlist = fs.readFileSync(path.join(rootDir, 'ios/App/App/Info.plist'), 'utf8');
if (!infoPlist.includes('UIApplicationSceneManifest') || !fs.existsSync(path.join(rootDir, 'ios/App/App/SceneDelegate.swift'))) {
  throw new Error('ios/App/App is missing the UIScene setup (SceneDelegate.swift + UIApplicationSceneManifest) — the app would crash on launch. See CLAUDE.md, "Native iOS".');
}
if (!/MARKETING_VERSION = /.test(pbxproj) || !/CURRENT_PROJECT_VERSION = /.test(pbxproj)) {
  throw new Error(`Could not find version settings in ${pbxprojPath}`);
}

// ---- Gate: never bump or ship on red ----
if (!dryRun) {
  run('npm run lint');
  run('npm test');
}

// ---- Version: package.json and the Xcode project move together ----
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
let [major, minor, patch] = oldVersion.split('.').map(Number);
if (!keepVersion) {
  if (bumpType === 'major') [major, minor, patch] = [major + 1, 0, 0];
  else if (bumpType === 'minor') [minor, patch] = [minor + 1, 0];
  else patch += 1;
}
const newVersion = `${major}.${minor}.${patch}`;
// The build number only ever goes up — App Store Connect refuses a reused one.
const oldBuild = Math.max(...[...pbxproj.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map(m => Number(m[1])));
const newBuild = oldBuild + 1;
pbxproj = pbxproj.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${newVersion};`);
pbxproj = pbxproj.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${newBuild};`);

console.log(`Version: ${oldVersion} -> ${newVersion}${keepVersion ? ' (kept)' : ` (${bumpType})`}`);
console.log(`Build:   ${oldBuild} -> ${newBuild}`);
if (dryRun) {
  console.log('\nDry run — nothing written, built or uploaded.');
  process.exit(0);
}

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(pbxprojPath, pbxproj);

// ---- Build web, sync the native shell ----
run('npx vite build');
run('npx cap sync ios');

// ---- Archive -> upload to App Store Connect (TestFlight) ----
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

// ---- Record the release ----
run('git add package.json ios/App/App.xcodeproj/project.pbxproj');
run(`git commit -m "Prepare release v${newVersion} (build ${newBuild})"`);
run(`git tag -f v${newVersion}`);
console.log(`\nDone: Spartopf v${newVersion} (build ${newBuild}) uploaded to App Store Connect.`);
console.log('It shows up in TestFlight after Apple finishes processing (usually 5–30 min).');
console.log('Then submit it for review in App Store Connect — see APP_STORE_RELEASE.md, step 9.');
