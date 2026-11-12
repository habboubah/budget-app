// The Android half of the release — scripts/release.js drives it: a signed AAB
// (android/app/build/outputs/bundle/release/app-release.aab) -> Play's
// internal test track through the Play Developer API, the way
// pizza-driver-log's scripts/upload-play.mjs does it. Promoting the release to
// production stays a manual step in the Play Console.
//
//   npm run release            both stores, one version
//   npm run release:android    Google Play only (node scripts/release.js --android)
// Android's own flags, after `--`:
//   --build N     force the build number: N (0–99) is added to the version code
//                 (1.2.7 -> 1020700, with --build 1 -> 1020701). Left out, the
//                 first code Play has not seen is taken.
//   --track T     the test track to release on: internal (default), alpha (the
//                 closed test) or beta (the open test). PLAY_TRACK sets it too.
//   --no-upload   only build and sign the AAB; nothing is sent to Google Play
// Run by itself, this file only makes the upload key:
//   node scripts/release-android.js --make-key      (npm run android:key)
//                 keytool asks for a password and your name; the key's path and
//                 alias are noted in .env.release
//
// The version is package.json's — release.js decides it, for both stores.
//
// Credentials (never committed) come from the environment, optionally via the
// gitignored .env.release file (see .env.release.example):
//   ANDROID_KEYSTORE_PATH       the upload keystore (.jks / .keystore)
//   ANDROID_KEYSTORE_PASSWORD   its password; left out, the script asks for it
//                               once and writes it into .env.release itself
//   ANDROID_KEY_ALIAS           the key's alias in it
//   ANDROID_KEY_PASSWORD        optional; defaults to the keystore's
//   PLAY_SERVICE_ACCOUNT_JSON   path of the Play service account's JSON key.
//                               A service account belongs to the developer
//                               account, not to one app: the one that ships
//                               pizza-driver-log works here once it has been
//                               given Spartopf in the Play Console.
//
// Release notes: release-notes/<version>/<language>.txt, else
// release-notes/default/ — only the languages the store listing has are sent.
//
// The very first AAB of a new app has to be uploaded in the Play Console by
// hand; the API only knows the app after that.
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
function makeKey() {
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
  console.log(`\nDone. Its path and alias are in .env.release (gitignored).`);
  console.log('Keep a copy of the keystore file and the password somewhere safe outside this computer.');
  console.log('Next: npm run release (or release:android) — it asks for the password once and then keeps it in .env.release.');
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

// ---- What this release is: set by prepareAndroid() and shipAndroid() ----
let account = null;      // the Play service account's key
let track = 'internal';
let version = '';
let build = 0;           // added to the version code

/** 1.2.7 -> 1020700; a second upload of the same version adds its build number (1–99). */
export function versionCode(v, n = 0) {
  const [major, minor, patch] = v.split('.').map(Number);
  return major * 1_000_000 + minor * 10_000 + patch * 100 + n;
}
const codeFor = n => versionCode(version, n);
const run = (cmd, cwd = rootDir) => execSync(cmd, { stdio: 'inherit', cwd, env: { ...process.env, ANDROID_BUILD: String(build) } });

// ---- Google Play Developer API (no dependency: a JWT signed with node:crypto) ----
const PLAY = 'https://androidpublisher.googleapis.com';
const api = `${PLAY}/androidpublisher/v3/applications/${PACKAGE}`;

/** The service account's key, or a plain message about what is wrong with it. */
function serviceAccount() {
  const file = process.env.PLAY_SERVICE_ACCOUNT_JSON;
  const onlyBuild = 'To only build the bundle: npm run release:android -- --no-upload';
  if (!file) stop('PLAY_SERVICE_ACCOUNT_JSON is not set in .env.release — it is the path of the Play service account\'s JSON key (docs/ANDROID_RELEASE.md).', onlyBuild);
  if (!fs.existsSync(file)) stop(`The service account key at PLAY_SERVICE_ACCOUNT_JSON is not there: ${file}`, onlyBuild);
  let key;
  try { key = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { key = null; }
  if (!key || !key.client_email || !key.private_key) {
    stop(`PLAY_SERVICE_ACCOUNT_JSON does not point at a service account key: ${file}`, 'It has to be the .json file Google Cloud gave you for the service account (not the keystore).', onlyBuild);
  }
  return key;
}

const call = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Play said ${res.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
};

async function playToken() {
  const b64 = v => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 600,
  })}`;
  const assertion = `${unsigned}.${crypto.createSign('RSA-SHA256').update(unsigned).sign(account.private_key).toString('base64url')}`;
  const { access_token: token } = await call('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  return token;
}

/** What Play has now: the version codes it has seen and the store listing's languages. Changes nothing. */
async function playState() {
  const auth = { Authorization: `Bearer ${await playToken()}` };
  const edit = await call(`${api}/edits`, { method: 'POST', headers: auth });
  try {
    const [bundles, tracks, listings] = await Promise.all(
      ['bundles', 'tracks', 'listings'].map(what => call(`${api}/edits/${edit.id}/${what}`, { headers: auth })),
    );
    const taken = new Set([
      ...(bundles.bundles ?? []).map(b => Number(b.versionCode)),
      ...(tracks.tracks ?? []).flatMap(t => (t.releases ?? []).flatMap(r => (r.versionCodes ?? []).map(Number))),
    ]);
    return { taken, languages: (listings.listings ?? []).map(l => l.language) };
  } finally {
    await call(`${api}/edits/${edit.id}`, { method: 'DELETE', headers: auth }).catch(() => {});
  }
}

/** release-notes/<version>/<language>.txt, else release-notes/default/ — in the listing's languages only. */
function releaseNotes(languages) {
  for (const dir of [path.join(rootDir, 'release-notes', version), path.join(rootDir, 'release-notes', 'default')]) {
    if (!fs.existsSync(dir)) continue;
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.txt'))
      .map(f => ({ language: path.basename(f, '.txt'), text: fs.readFileSync(path.join(dir, f), 'utf8').trim() }))
      .filter(note => note.text && (!languages.length || languages.includes(note.language)));
  }
  return [];
}

/** One edit: upload the bundle, put it on the track, commit. */
async function sendToPlay(languages) {
  const auth = { Authorization: `Bearer ${await playToken()}` };
  const edit = await call(`${api}/edits`, { method: 'POST', headers: auth });
  try {
    const sent = await call(
      `${PLAY}/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${edit.id}/bundles?uploadType=media`,
      { method: 'POST', headers: { ...auth, 'Content-Type': 'application/octet-stream' }, body: fs.readFileSync(aab) },
    );
    const notes = releaseNotes(languages);
    const finish = async status => {
      await call(`${api}/edits/${edit.id}/tracks/${track}`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track,
          releases: [{ name: build ? `${version} (${build})` : version, versionCodes: [String(sent.versionCode)], status, releaseNotes: notes }],
        }),
      });
      const commit = query => call(`${api}/edits/${edit.id}:commit${query}`, { method: 'POST', headers: auth });
      try {
        await commit('');
      } catch (error) {
        // An app with a rejected update open: Play wants to be told the change is not sent for review by itself.
        if (!/changesNotSentForReview/.test(error.message)) throw error;
        await commit('?changesNotSentForReview=true');
      }
    };
    let status = 'completed';
    try {
      await finish(status);
    } catch (error) {
      // An app that has never been published only takes a draft release.
      if (!/draft app/i.test(error.message)) throw error;
      status = 'draft';
      await finish(status);
    }
    return { versionCode: sent.versionCode, status, notes: notes.map(note => note.language) };
  } catch (error) {
    await call(`${api}/edits/${edit.id}`, { method: 'DELETE', headers: auth }).catch(() => {});
    throw error;
  }
}

/** The versions Play has seen, read back out of its version codes. */
export function playVersions(ctx) {
  return [...(ctx.taken ?? [])].filter(code => code >= 1_000_000)
    .map(code => `${Math.floor(code / 1_000_000)}.${Math.floor(code / 10_000) % 100}.${Math.floor(code / 100) % 100}`);
}

/** Does Play have this version? null when it could not be asked; a bundle-only run has nothing to ask. */
export function playHasVersion(ctx, v) {
  if (!ctx.taken) return ctx.upload ? null : false;
  for (let n = 0; n < 100; n += 1) if (ctx.taken.has(versionCode(v, n))) return true;
  return false;
}

/**
 * Everything that can be known before a version is bumped or anything is built:
 * the flags, the upload key, Java and the SDK, and what Play already has.
 * A dry run only looks (and only when the service account's key is on this machine).
 */
export async function prepareAndroid(args, { dryRun }) {
  const ctx = {
    // Uploading is the default; --upload is still accepted from before it was.
    upload: !args.includes('--no-upload'),
    explicitBuild: args.includes('--build'),
    buildArg: args.includes('--build') ? Number(args[args.indexOf('--build') + 1]) : 0,
    track: (args.includes('--track') ? args[args.indexOf('--track') + 1] : process.env.PLAY_TRACK) || 'internal',
    taken: null,      // the version codes Play has seen; null = not asked
    languages: [],    // the store listing's languages
  };
  if (!Number.isInteger(ctx.buildArg) || ctx.buildArg < 0 || ctx.buildArg > 99) stop('--build takes a number from 0 to 99.');
  if (ctx.upload && !['internal', 'alpha', 'beta'].includes(ctx.track)) {
    stop(`Unknown track "${ctx.track}". This script releases to a test track: internal, alpha (closed test) or beta (open test).`, 'Production is promoted by hand in the Play Console.');
  }
  track = ctx.track;
  const seen = state => {
    ctx.taken = state.taken;
    ctx.languages = state.languages;
    const highest = Math.max(0, ...state.taken);
    console.log(`Google Play: highest version code so far ${highest || '(none)'}.`);
  };

  if (dryRun) {
    if (!process.env.ANDROID_KEYSTORE_PATH) console.log('(No upload key yet: npm run android:key.)');
    const file = process.env.PLAY_SERVICE_ACCOUNT_JSON;
    if (!ctx.upload) return ctx;
    if (!file || !fs.existsSync(file)) {
      console.log('(No Play service account key on this machine — the dry run cannot see what Google Play has.)');
      return ctx;
    }
    account = serviceAccount();
    try {
      seen(await playState());
    } catch (error) {
      console.warn(`Could not ask Google Play what it has (${error.message}).`);
    }
    return ctx;
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
  if (!process.env.JAVA_HOME && !javaWorks()) stop('No Java found. Install Android Studio (it brings a JDK), or set JAVA_HOME.');
  if (!process.env.ANDROID_HOME && !fs.existsSync(path.join(androidDir, 'local.properties'))) {
    stop('The Android SDK was not found. Install Android Studio and open the android/ folder in it once, or set ANDROID_HOME.');
  }


  if (!ctx.upload) return ctx;
  // Ask Play first: a missing permission should not cost a version or a whole build.
  account = serviceAccount();
  try {
    seen(await playState());
  } catch (error) {
    stop(
      'Google Play did not let the service account in — nothing was changed or built.',
      `  ${error.message}`,
      '',
      `Check in the Play Console that the app ${PACKAGE} exists with a first release uploaded by hand, and that`,
      `${account.client_email} is listed under Users and permissions with "Release apps to testing tracks" for Spartopf.`,
      'To only build the bundle: npm run release:android -- --no-upload',
    );
  }
  return ctx;
}

/** The build number for this version: --build's, else the first whose version code Play has not seen. */
export function androidBuild(ctx, forVersion) {
  let n = ctx.buildArg;
  if (!ctx.taken) return n;
  const used = () => ctx.taken.has(versionCode(forVersion, n));
  if (ctx.explicitBuild) {
    if (used()) stop(`Google Play already has version code ${versionCode(forVersion, n)} — pick another --build, or leave it out.`);
    return n;
  }
  while (used() && n < 99) n += 1;
  if (used()) stop(`All hundred version codes of ${forVersion} are used — take a new version (npm run release).`);
  return n;
}

// The keystore password is asked for once, checked against the keystore and then
// kept in .env.release (gitignored, readable by you only) — as pizza-driver-log
// keeps its own in android/keystore.properties — so no later release asks.
export async function keystorePassword() {
  if (!process.env.ANDROID_KEYSTORE_PASSWORD) {
    const keytool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'keytool') : 'keytool';
    const opens = password => {
      const tried = spawnSync(
        keytool,
        ['-list', '-keystore', process.env.ANDROID_KEYSTORE_PATH, '-alias', process.env.ANDROID_KEY_ALIAS, '-storepass:env', 'SPARTOPF_STOREPASS'],
        { stdio: 'ignore', env: { ...process.env, SPARTOPF_STOREPASS: password } },
      );
      return tried.error ? true : tried.status === 0; // no keytool to ask: the signing step will tell
    };
    let password = '';
    for (let tries = 1; ; tries += 1) {
      password = await askHidden('Keystore password (asked this once, then remembered in .env.release): ');
      if (!password) stop('No password given.');
      if (opens(password)) break;
      if (tries === 3) stop('That password does not open the keystore — nothing was saved.');
      console.log(`That does not open ${path.basename(process.env.ANDROID_KEYSTORE_PATH)} (alias "${process.env.ANDROID_KEY_ALIAS}"). Once more:`);
    }
    process.env.ANDROID_KEYSTORE_PASSWORD = password;
    const has = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
    fs.appendFileSync(envFile, `${has && !has.endsWith('\n') ? '\n' : ''}ANDROID_KEYSTORE_PASSWORD='${password}'\n`, { mode: 0o600 });
    fs.chmodSync(envFile, 0o600);
    console.log('Saved in .env.release — the next release does not ask.');
  }

}

/**
 * Builds and signs the bundle for `forVersion` (package.json already says it, the
 * web build is in dist/) and, unless --no-upload, releases it on the test track.
 */
export async function shipAndroid(ctx, forVersion, buildNumber) {
  version = forVersion;
  build = buildNumber;
  run('npx cap sync android');
  const bundle = () => {
    run(process.platform === 'win32' ? 'gradlew.bat bundleRelease' : './gradlew bundleRelease', androidDir);
    if (!fs.existsSync(aab)) throw new Error(`No bundle at ${aab}.`);
    console.log(`\nSigned bundle: ${path.relative(rootDir, aab)} (${(fs.statSync(aab).size / 1e6).toFixed(1)} MB, version code ${codeFor(build)})`);
  };
  bundle();

  if (!ctx.upload) {
    console.log('Not uploaded (--no-upload). Upload it in the Play Console (Testing › Internal testing › Create new release), or run again without the flag.');
    return { uploaded: false, versionCode: codeFor(build) };
  }

  let sent;
  for (let attempt = 1; !sent; attempt += 1) {
    try {
      sent = await sendToPlay(ctx.languages);
    } catch (error) {
      // Play remembers codes the lists no longer show; the next one needs a new bundle.
      if (/already been used/i.test(error.message) && !ctx.explicitBuild && build < 99 && attempt < 5) {
        build += 1;
        console.log(`\nGoogle Play has seen that version code before — building again as build ${build}, version code ${codeFor(build)}.`);
        bundle();
        continue;
      }
      stop(
        'The bundle is built and signed, but Google Play did not take it:',
        `  ${error.message}`,
        '',
        `It is at ${path.relative(rootDir, aab)}. Fix the above and run npm run release:android -- --skip-check`,
        `(it ships ${version} again), or upload the bundle in the Play Console.`,
      );
    }
  }

  const withNotes = sent.notes.length ? `, release notes in ${sent.notes.join(', ')}` : '';
  if (sent.status === 'draft') {
    console.log(`\nGoogle Play: Spartopf ${version} (version code ${sent.versionCode}) is uploaded to the ${track} track as a draft${withNotes}.`);
    console.log('Google Play only takes drafts from the API while the app has never been published:');
    console.log('open the Play Console, go to the track and roll the release out. Once the app is live, this command does that too.');
  } else {
    console.log(`\nGoogle Play: Spartopf ${version} (version code ${sent.versionCode}) is released on the ${track} track${withNotes}.`);
  }
  return { uploaded: true, ...sent };
}

// ---- Run by itself: only the upload key. The release is release.js's. ----
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  if (args.includes('--make-key')) makeKey();
  const forwarded = spawnSync(process.execPath, [path.join(rootDir, 'scripts', 'release.js'), '--android', ...args], { stdio: 'inherit' });
  process.exit(forwarded.status ?? 1);
}
