// Puts the store listing into both stores, so nothing is pasted by hand:
// the texts (store/listing.md for the App Store, store/play-listing.md and
// store/play-listing-languages.md for Google Play), the What's New
// (release-notes/<version>/), the composed screenshots (npm run
// store-screenshots), the App Store preview video (npm run app-preview) and
// Google Play's feature graphic and icon. On the App Store it also makes (or
// renames) the version being prepared, fills in the App Review contact (and
// the notes, once their [brackets] are filled in) and picks the uploaded build.
//
// Submitting for App Review and promoting to production on Google Play stay
// manual clicks in the consoles (docs/CLAUDE.md, "Releasing").
//
// Usage: node scripts/store-listing.mjs [flags]
//   npm run store:listing                  both stores, everything
//   npm run store:listing -- --android     Google Play only: texts, the 8 phone screenshots, feature graphic, icon
//   npm run store:listing:dry              print what would be sent and check the files; no network
// Flags:
//   --ios / --android    one store only (no flag: both)
//   --dry-run            print and check only; nothing is sent
//   --texts-only         texts only: no screenshots, no video, no graphics
//   --no-preview         leave the App Store preview video as it is
//   --no-build           don't pick a build for the App Store version
//   --build N            pick build N (default: the newest processed build of the version)
//   --wait M             wait up to M minutes for that build to finish processing (default 0)
//   --version X.Y.Z      the App Store version to prepare (default: package.json's)
//   --lang de,en,ar      only these languages (default: every language with texts —
//                        de, en, ar in both stores, and on Google Play the eleven
//                        of store/play-listing-languages.md too; screenshots,
//                        the video and the feature graphic exist for de, en, ar)
//   --add-languages      add a language the store does not have yet (default:
//                        only languages that already exist are updated)
//   --screenshot-type T  App Store screenshot slot (default: the slot that already
//                        holds 1206 × 2622 shots, else APP_IPHONE_61 — "iPhone with
//                        Dynamic Island (medium display)", 6.1″/6.3″)
//   --preview-type T     App Store preview slot (default IPHONE_67, the 6.9″ slot)
//
// Re-running is safe: screenshots, the video and Play's images are compared by
// checksum and only sent again when they changed.
//
// Credentials: the same as scripts/release.js, from the environment or the
// gitignored .env.release — ASC_KEY_ID, ASC_ISSUER_ID (ASC_KEY_PATH) and
// PLAY_SERVICE_ACCOUNT_JSON. Optional: ASC_CONTACT_PHONE for App Review's
// contact (left out, the phone already in App Store Connect stays).
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE = 'com.habboubah.spartopf';
const BUNDLE_ID = 'com.habboubah.spartopf';
// The languages with their own screenshots, video and feature graphic.
const MEDIA_LANGS = ['de', 'en', 'ar'];

// ---- Flags ----
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const value = name => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};
const dryRun = flag('--dry-run');
const textsOnly = flag('--texts-only');
const doIos = flag('--ios') || !flag('--android');
const doAndroid = flag('--android') || !flag('--ios');
const withPreview = !textsOnly && !flag('--no-preview');
const withBuild = !flag('--no-build');
const buildNumber = value('--build');
const waitMinutes = Number(value('--wait') ?? 0);
const addLanguages = flag('--add-languages');
const langFlag = value('--lang')?.split(',').map(s => s.trim()).filter(Boolean) ?? null;
// Set once the listing is read: --lang, else every language that has texts.
let languages = [];
const screenshotTypeFlag = value('--screenshot-type');
const previewType = value('--preview-type') ?? 'IPHONE_67';
const pkgVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const version = value('--version') ?? pkgVersion;

// Load .env.release (KEY=VALUE lines) without overriding the shell.
const envFile = path.join(root, '.env.release');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

function stop(...lines) {
  console.error(`\n${lines.join('\n')}\n`);
  process.exit(1);
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const rel = p => path.relative(root, p);
const chars = s => [...s].length;
const md5 = buf => crypto.createHash('md5').update(buf).digest('hex');
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

// ---- Where each language goes ----
// App Store locale / Play language -> the language in store/listing.md.
const ASC_LOCALES = { 'de-DE': 'de', 'en-GB': 'en', 'en-US': 'en', 'ar-SA': 'ar' };
// Google Play: de, en, ar from store/play-listing.md; the others come with
// their own codes from store/play-listing-languages.md (parseListing adds them).
const PLAY_LANGS = { 'de-DE': 'de', 'en-GB': 'en', 'en-US': 'en', ar: 'ar' };
// release-notes/<version>/<file>.txt for each App Store locale (Play's are sent by release.js).
const NOTE_FILE = { 'de-DE': 'de-DE', 'en-GB': 'en-GB', 'en-US': 'en-US', 'ar-SA': 'ar' };

// ---- store/listing.md, store/play-listing.md, store/play-listing-languages.md ----
function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) stop(`${file} is missing — the script reads the store texts from it.`);
  return fs.readFileSync(full, 'utf8');
}
// The part of a markdown file under a "## Heading" (up to the next "## ").
function section(md, heading, file) {
  const parts = md.split(/^## /m);
  const hit = parts.find(p => p.startsWith(heading));
  if (!hit) stop(`${file} has no "## ${heading}" section — the script reads its texts from there.`);
  return hit;
}
const langOf = header => (/Deutsch/.test(header) ? 'de' : /English/.test(header) ? 'en' : /العربية|Arabic/.test(header) ? 'ar' : null);
// Every row of the tables in a text: { label: { de, en, ar } } — a `backticked` value, else the cell's text; "(same)" repeats the cell before.
function rows(body) {
  const out = {};
  let cols = null;
  for (const line of body.split('\n')) {
    if (!line.trim().startsWith('|')) { cols = null; continue; }
    const cells = line.trim().split('|').slice(1, -1).map(c => c.trim());
    if (cells.every(c => /^:?-{3,}:?$/.test(c))) continue;
    if (!cols) { cols = cells.map(langOf); continue; }
    const row = (out[cells[0]] ??= {});
    let previous = null;
    cells.forEach((cell, i) => {
      if (!cols[i]) return;
      const v = /^\(?same\)?$/i.test(cell) ? previous : (cell.match(/`([^`]+)`/)?.[1] ?? cell);
      row[cols[i]] = v;
      previous = v;
    });
  }
  return out;
}
// **DE:** ```…``` blocks of a section (a blank line may come between).
const blocks = body => Object.fromEntries(
  [...body.matchAll(/\*\*(DE|EN|AR):\*\*\s*\n\s*```[a-z]*\n([\s\S]*?)\n```/g)].map(m => [m[1].toLowerCase(), m[2].trim()]),
);
// **DE:** text on one line (a `backticked` value, else the line's text).
const lines = body => Object.fromEntries(
  [...body.matchAll(/^\*\*(DE|EN|AR):\*\*[ \t]+(.+)$/gm)].map(m => [m[1].toLowerCase(), (m[2].match(/^`([^`]+)`$/)?.[1] ?? m[2]).trim()]),
);

function parseListing() {
  const appStore = read('store/listing.md');
  const play = read('store/play-listing.md');
  const head = appStore.split(/^## /m)[0];
  const shared = rows(head);
  const promo = lines(section(appStore, 'Promotional text', 'store/listing.md'));
  const keywords = lines(section(appStore, 'Keywords', 'store/listing.md'));
  const description = blocks(section(appStore, 'Description', 'store/listing.md'));
  const playRows = rows(play.split(/^## /m)[0]);
  const playFull = blocks(section(play, 'Full description', 'store/play-listing.md'));

  // App Review: the contact line and the notes' code block. Notes with a
  // [bracket] still to fill in (the iPhone model, the iOS version) are not sent.
  const reviewPart = section(appStore, 'App Review information', 'store/listing.md');
  const contact = reviewPart.match(/^- Contact:\s*([^,\n]+),\s*([^,\s\n]+@[^,\s\n]+)/m);
  const notes = reviewPart.match(/```\n([\s\S]*?)\n```/)?.[1]?.trim();
  const blanks = notes ? [...new Set(notes.match(/\[[^\]\n]{1,30}\]/g) ?? [])] : [];
  const [firstName, ...lastName] = (contact?.[1] ?? '').trim().split(/\s+/);

  const texts = {};
  for (const lang of ['de', 'en', 'ar']) {
    texts[lang] = {
      name: shared.Name?.[lang],
      subtitle: shared.Subtitle?.[lang],
      keywords: keywords[lang],
      promotionalText: promo[lang],
      description: description[lang],
      supportUrl: shared['Support URL']?.[lang],
      privacyPolicyUrl: shared['Privacy policy URL']?.[lang],
      playTitle: playRows['App name']?.[lang],
      playShort: playRows['Short description']?.[lang],
      playFull: playFull[lang],
    };
  }

  // Google Play's other languages: "## French – fr-FR", then "App name: …",
  // "Short description: …" and "Full description:" up to the next "---".
  const playOthers = {};
  const others = read('store/play-listing-languages.md');
  for (const part of others.split(/^## /m).slice(1)) {
    const code = part.match(/^[^\n]*?[–-]\s*([a-z]{2,3}(?:-[A-Z]{2})?)\s*$/m)?.[1];
    if (!code) continue;
    const field = name => part.match(new RegExp(`^${name}:[ \\t]*(.+)$`, 'm'))?.[1]?.trim();
    const full = part.split(/^Full description:\s*$/m)[1]?.split(/^---\s*$/m)[0]?.trim();
    const lang = code.split('-')[0];
    playOthers[code] = lang;
    texts[lang] = { playTitle: field('App name'), playShort: field('Short description'), playFull: full };
  }
  return {
    texts,
    playOthers,
    copyright: shared.Copyright?.de,
    review: {
      notes: blanks.length ? undefined : notes,
      blanks,
      contactFirstName: firstName || undefined,
      contactLastName: lastName.join(' ') || undefined,
      contactEmail: contact?.[2],
    },
  };
}

function whatsNew(locale) {
  for (const dir of [version, 'default']) {
    const file = path.join(root, 'release-notes', dir, `${NOTE_FILE[locale]}.txt`);
    if (fs.existsSync(file)) return { text: fs.readFileSync(file, 'utf8').trim(), from: rel(file) };
  }
  return null;
}

// ---- The images and the video ----
function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.subarray(1, 4).toString() === 'PNG') return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), alpha: [4, 6].includes(b[25]) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7), alpha: false };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
const filesIn = (dir, ext) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => ext.test(f)).sort().map(f => path.join(dir, f)) : []);
const media = {
  iphone: lang => filesIn(path.join(root, 'screenshots/store/iphone', lang), /\.(png|jpe?g)$/i),
  preview: lang => {
    const file = path.join(root, 'screenshots/store/app-preview', `app-preview-${lang}.mp4`);
    return fs.existsSync(file) ? file : null;
  },
  playPhone: lang => filesIn(path.join(root, 'screenshots/store/play-phone', lang), /\.(png|jpe?g)$/i),
  playFeature: lang => {
    const file = path.join(root, 'screenshots/store/play-feature', lang, 'feature-graphic.jpg');
    return fs.existsSync(file) ? file : null;
  },
  // Rendered from public/icon.svg with the launcher icons (docs/CLAUDE.md, Commands).
  playIcon: path.join(root, 'screenshots/store/play-icon-512.png'),
};
// The poster frame the preview run chose (build/app-preview/<lang>/plan.json), as App Store Connect's HH:MM:SS:FF.
function posterTimeCode(lang) {
  const plan = path.join(root, 'build/app-preview', lang, 'plan.json');
  if (!fs.existsSync(plan)) return null;
  const { poster, fps = 30 } = JSON.parse(fs.readFileSync(plan, 'utf8'));
  if (!Number.isFinite(poster)) return null;
  const frames = Math.round(poster * fps);
  const pad = n => String(n).padStart(2, '0');
  const s = Math.floor(frames / fps);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames % fps)}`;
}

// ---- Check everything before anything is sent ----
const LIMITS = {
  name: 30, subtitle: 30, promotionalText: 170, description: 4000, whatsNew: 4000,
  playTitle: 30, playShort: 80, playFull: 4000, notes: 4000,
};
const IPHONE_SIZES = ['1206x2622', '1179x2556', '1320x2868', '1290x2796', '1260x2736', '1284x2778', '1242x2688'];

function check(listing) {
  const problems = [];
  for (const lang of languages) {
    const t = listing.texts[lang];
    if (!t) { problems.push(`unknown language "${lang}" (${Object.keys(listing.texts).join(', ')})`); continue; }
    for (const [field, limit] of Object.entries(LIMITS)) {
      if (t[field] && chars(t[field]) > limit) problems.push(`${lang} ${field}: ${chars(t[field])} > ${limit}`);
    }
    if (t.keywords && Buffer.byteLength(t.keywords) > 100) problems.push(`${lang} keywords: ${Buffer.byteLength(t.keywords)} bytes > 100`);
    if (doIos && !textsOnly && MEDIA_LANGS.includes(lang)) {
      const shots = media.iphone(lang);
      if (shots.length > 10) problems.push(`${lang}: ${shots.length} iPhone screenshots, at most 10`);
      for (const f of shots) {
        const s = imageSize(f);
        if (!s || !IPHONE_SIZES.includes(`${s.width}x${s.height}`)) problems.push(`${rel(f)}: ${s ? `${s.width} × ${s.height}` : 'not a PNG/JPEG'} — not an App Store iPhone size`);
        else if (s.alpha) problems.push(`${rel(f)}: has an alpha channel — App Store Connect refuses it`);
      }
      const sizes = new Set(shots.map(f => { const s = imageSize(f); return s && `${s.width}x${s.height}`; }));
      if (sizes.size > 1) problems.push(`${lang}: the iPhone screenshots have different sizes (${[...sizes].join(', ')}) — one slot takes one size`);
    }
    if (doAndroid && !textsOnly && MEDIA_LANGS.includes(lang)) {
      const shots = media.playPhone(lang);
      if (shots.length && (shots.length < 2 || shots.length > 8)) problems.push(`${lang}: ${shots.length} Play phone screenshots, 2–8 allowed`);
      for (const f of shots) {
        const s = imageSize(f);
        if (!s) { problems.push(`${rel(f)}: not a PNG/JPEG`); continue; }
        const [a, b] = [Math.min(s.width, s.height), Math.max(s.width, s.height)];
        if (a < 320 || b > 3840 || b > 2 * a) problems.push(`${rel(f)}: ${s.width} × ${s.height} is outside Play's 320–3840 px, at most 2:1`);
        if (fs.statSync(f).size > 8 * 1024 * 1024) problems.push(`${rel(f)}: over 8 MB`);
      }
      const feature = media.playFeature(lang);
      if (feature) {
        const s = imageSize(feature);
        if (!s || s.width !== 1024 || s.height !== 500) problems.push(`${rel(feature)}: must be exactly 1024 × 500`);
      }
    }
  }
  if (listing.review.notes && chars(listing.review.notes) > 4000) problems.push(`App Review notes: ${chars(listing.review.notes)} > 4000`);
  if (doAndroid && !textsOnly && fs.existsSync(media.playIcon)) {
    const s = imageSize(media.playIcon);
    if (!s || s.width !== 512 || s.height !== 512) problems.push(`${rel(media.playIcon)}: must be 512 × 512`);
  }
  return problems;
}

function printPlan(listing) {
  const short = s => (s ? `${s.replace(/\s+/g, ' ').slice(0, 60)}${chars(s) > 60 ? '…' : ''} (${chars(s)})` : '—');
  console.log(`Version: ${version}${version !== pkgVersion ? ` (package.json says ${pkgVersion})` : ''}`);
  for (const lang of languages) {
    const t = listing.texts[lang];
    if (!t) continue;
    console.log(`\n[${lang}]`);
    if (doIos && t.name) {
      console.log(`  App Store  name      ${short(t.name)}`);
      console.log(`             subtitle  ${short(t.subtitle)}`);
      console.log(`             keywords  ${t.keywords ? `${t.keywords} (${Buffer.byteLength(t.keywords)} bytes)` : '—'}`);
      console.log(`             promo     ${short(t.promotionalText)}`);
      console.log(`             descr.    ${short(t.description)}`);
      for (const [locale, l] of Object.entries(ASC_LOCALES)) {
        if (l !== lang) continue;
        const note = whatsNew(locale);
        console.log(`             ${locale} What's New ${note ? `${short(note.text)} ← ${note.from}` : '— (no release-notes file)'}`);
      }
      if (!textsOnly && MEDIA_LANGS.includes(lang)) {
        console.log(`             shots     ${media.iphone(lang).length} from screenshots/store/iphone/${lang}/`);
        if (withPreview) console.log(`             preview   ${media.preview(lang) ? `${rel(media.preview(lang))}, poster ${posterTimeCode(lang) ?? '(App Store Connect default, 0:05)'}` : '—'}`);
      }
    }
    if (doAndroid) {
      console.log(`  Play       title     ${short(t.playTitle)}`);
      console.log(`             short     ${short(t.playShort)}`);
      console.log(`             full      ${short(t.playFull)}`);
      if (!textsOnly && MEDIA_LANGS.includes(lang)) {
        console.log(`             shots     ${media.playPhone(lang).length} from screenshots/store/play-phone/${lang}/`);
        console.log(`             feature   ${media.playFeature(lang) ? rel(media.playFeature(lang)) : '—'}`);
      }
    }
  }
  if (doIos) console.log(`\nApp Review notes: ${listing.review.blanks.length ? `NOT sent — fill in ${listing.review.blanks.join(', ')} in store/listing.md first` : short(listing.review.notes)}; contact ${listing.review.contactFirstName ?? '?'} ${listing.review.contactLastName ?? ''} <${listing.review.contactEmail ?? '?'}>`);
}

// ---- App Store Connect API (no dependency: an ES256 JWT signed with node:crypto) ----
const ASC = 'https://api.appstoreconnect.apple.com';
let ascJwt = null;
let ascJwtExpires = 0;
function ascToken() {
  const now = Math.floor(Date.now() / 1000);
  if (ascJwt && now < ascJwtExpires - 60) return ascJwt;
  const { ASC_KEY_ID, ASC_ISSUER_ID } = process.env;
  const keyPath = process.env.ASC_KEY_PATH || path.join(os.homedir(), `.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8`);
  const part = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  ascJwtExpires = now + 1200;
  const unsigned = `${part({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' })}.${part({ iss: ASC_ISSUER_ID, iat: now, exp: ascJwtExpires, aud: 'appstoreconnect-v1' })}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: fs.readFileSync(keyPath, 'utf8'), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  ascJwt = `${unsigned}.${signature}`;
  return ascJwt;
}
async function asc(method, where, body) {
  const url = where.startsWith('http') ? where : `${ASC}${where}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${ascToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) {
      let detail = text.slice(0, 500);
      try { detail = JSON.parse(text).errors.map(e => e.detail || e.title).join(' / '); } catch { /* not JSON */ }
      const error = new Error(`App Store Connect said ${res.status} to ${method} ${new URL(url).pathname}: ${detail}`);
      error.status = res.status;
      throw error;
    }
    return text ? JSON.parse(text) : {};
  }
}
async function ascAll(where) {
  const out = [];
  for (let url = where; url;) {
    const page = await asc('GET', url);
    out.push(...(page.data ?? []));
    url = page.links?.next;
  }
  return out;
}
const q = params => new URLSearchParams(params).toString();
const rel1 = (type, id) => ({ data: { type, id } });
// Only the fields that have a value — never blank a field the listing leaves out.
const defined = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** Sends a file along the upload operations App Store Connect handed out. */
async function sendParts(operations, buf) {
  for (const op of operations) {
    const headers = Object.fromEntries((op.requestHeaders ?? []).map(h => [h.name, h.value]));
    const res = await fetch(op.url, { method: op.method, headers, body: buf.subarray(op.offset, op.offset + op.length) });
    if (!res.ok) throw new Error(`Upload part refused: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}
/** Reserve, send, commit one screenshot or preview; returns its id. */
async function ascUpload(type, setType, setId, file, extra = {}) {
  const buf = fs.readFileSync(file);
  const made = await asc('POST', `/v1/${type}`, {
    data: {
      type,
      attributes: { fileName: path.basename(file), fileSize: buf.length, ...extra },
      relationships: { [setType]: rel1(`${setType}s`, setId) },
    },
  });
  await sendParts(made.data.attributes.uploadOperations, buf);
  await asc('PATCH', `/v1/${type}/${made.data.id}`, {
    data: { type, id: made.data.id, attributes: { uploaded: true, sourceFileChecksum: md5(buf) } },
  });
  return made.data.id;
}
/** Waits until App Store Connect has the file (screenshots: processed; videos: received). */
async function ascDelivered(type, id, name, until) {
  for (let i = 0; i < 90; i++) {
    const { data } = await asc('GET', `/v1/${type}/${id}`);
    const state = data.attributes.assetDeliveryState?.state;
    if (state === 'FAILED') {
      const why = (data.attributes.assetDeliveryState.errors ?? []).map(e => e.description || e.code).join(' / ');
      throw new Error(`${name} was refused by App Store Connect: ${why || 'no reason given'}`);
    }
    if (until.includes(state)) return;
    await sleep(2000);
  }
  console.warn(`  ${name}: still processing — check it in App Store Connect.`);
}

const EDITABLE = new Set(['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY', 'READY_FOR_REVIEW']);
const IN_REVIEW = new Set(['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'PENDING_APPLE_RELEASE', 'PROCESSING_FOR_DISTRIBUTION', 'ACCEPTED', 'WAITING_FOR_EXPORT_COMPLIANCE']);
const WAS_LIVE = new Set(['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE', 'REPLACED_WITH_NEW_VERSION', 'REMOVED_FROM_SALE', 'DEVELOPER_REMOVED_FROM_SALE']);
const stateOf = v => v.attributes.appVersionState || v.attributes.appStoreState;
const cmpVersion = (a, b) => {
  const [x, y] = [a, b].map(v => v.split('.').map(Number));
  return (x[0] - y[0]) || ((x[1] || 0) - (y[1] || 0)) || ((x[2] || 0) - (y[2] || 0));
};

async function appStore(listing) {
  const { ASC_KEY_ID, ASC_ISSUER_ID } = process.env;
  if (!ASC_KEY_ID || !ASC_ISSUER_ID) stop('ASC_KEY_ID / ASC_ISSUER_ID are not set — they live in .env.release (see .env.release.example).');
  const keyPath = process.env.ASC_KEY_PATH || path.join(os.homedir(), `.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8`);
  if (!fs.existsSync(keyPath)) stop(`App Store Connect API key not found at ${keyPath}`);

  console.log('\n== App Store Connect ==');
  const app = (await asc('GET', `/v1/apps?${q({ 'filter[bundleId]': BUNDLE_ID })}`)).data.find(a => a.attributes.bundleId === BUNDLE_ID);
  if (!app) stop(`App Store Connect has no app with the bundle id ${BUNDLE_ID} (docs/APP_STORE_RELEASE.md, step 4).`);

  // -- The version being prepared: the editable one, renamed or made for this version.
  const versions = await ascAll(`/v1/apps/${app.id}/appStoreVersions?${q({ 'filter[platform]': 'IOS', limit: '50' })}`);
  const live = versions.find(v => WAS_LIVE.has(stateOf(v)) && v.attributes.versionString === version);
  let target = versions.find(v => EDITABLE.has(stateOf(v)));
  const reviewing = versions.find(v => IN_REVIEW.has(stateOf(v)));
  if (!target && reviewing) stop(`Version ${reviewing.attributes.versionString} is ${stateOf(reviewing)} — nothing can change until it is out of review (or withdrawn in App Store Connect).`);
  if (!target && live) stop(`${version} is already live on the App Store. Run the release first (npm run release) so there is a new version to prepare.`);
  if (!target) {
    target = (await asc('POST', '/v1/appStoreVersions', {
      data: { type: 'appStoreVersions', attributes: defined({ platform: 'IOS', versionString: version, copyright: listing.copyright }), relationships: { app: rel1('apps', app.id) } },
    })).data;
    console.log(`Made version ${version}.`);
  } else if (target.attributes.versionString !== version) {
    if (cmpVersion(version, target.attributes.versionString) < 0) stop(`App Store Connect is preparing ${target.attributes.versionString}, newer than ${version}. Pass --version ${target.attributes.versionString} or fix package.json.`);
    await asc('PATCH', `/v1/appStoreVersions/${target.id}`, { data: { type: 'appStoreVersions', id: target.id, attributes: { versionString: version } } });
    console.log(`Version ${target.attributes.versionString} → ${version} (${stateOf(target)}).`);
  } else {
    console.log(`Version ${version} (${stateOf(target)}).`);
  }
  if (listing.copyright) {
    await asc('PATCH', `/v1/appStoreVersions/${target.id}`, { data: { type: 'appStoreVersions', id: target.id, attributes: { copyright: listing.copyright } } });
  }
  // App Store Connect takes no What's New on an app's very first version.
  const firstVersion = !versions.some(v => WAS_LIVE.has(stateOf(v)));

  // -- Name, subtitle, privacy URL: the app info that is not live yet.
  const infos = await ascAll(`/v1/apps/${app.id}/appInfos`);
  const info = infos.find(i => !WAS_LIVE.has(i.attributes.appStoreState ?? i.attributes.state)) ?? infos[0];
  const infoLocs = info ? await ascAll(`/v1/appInfos/${info.id}/appInfoLocalizations`) : [];

  const versionLocs = await ascAll(`/v1/appStoreVersions/${target.id}/appStoreVersionLocalizations`);
  const report = [];
  for (const [locale, lang] of Object.entries(ASC_LOCALES)) {
    if (!languages.includes(lang)) continue;
    const t = listing.texts[lang];
    let loc = versionLocs.find(l => l.attributes.locale === locale);
    let infoLoc = infoLocs.find(l => l.attributes.locale === locale);
    if (!loc && !addLanguages) {
      report.push(`${locale}: not in App Store Connect — left out (--add-languages adds it)`);
      continue;
    }
    if (!t.description) { report.push(`${locale}: store/listing.md has no description — left out`); continue; }
    const infoAttrs = defined({ name: t.name, subtitle: t.subtitle, privacyPolicyUrl: t.privacyPolicyUrl });
    try {
      if (infoLoc) await asc('PATCH', `/v1/appInfoLocalizations/${infoLoc.id}`, { data: { type: 'appInfoLocalizations', id: infoLoc.id, attributes: infoAttrs } });
      else if (info) infoLoc = (await asc('POST', '/v1/appInfoLocalizations', { data: { type: 'appInfoLocalizations', attributes: { locale, ...infoAttrs }, relationships: { appInfo: rel1('appInfos', info.id) } } })).data;
    } catch (error) {
      report.push(`${locale}: name/subtitle not changed — ${error.message}`);
    }
    const note = firstVersion ? null : whatsNew(locale);
    const attrs = defined({
      description: t.description, keywords: t.keywords, promotionalText: t.promotionalText,
      supportUrl: t.supportUrl, whatsNew: note?.text,
    });
    if (loc) await asc('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, { data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: attrs } });
    else loc = (await asc('POST', '/v1/appStoreVersionLocalizations', { data: { type: 'appStoreVersionLocalizations', attributes: { locale, ...attrs }, relationships: { appStoreVersion: rel1('appStoreVersions', target.id) } } })).data;
    const done = [`texts${note ? ` + What's New (${note.from})` : firstVersion ? ' (first version: no What\'s New)' : ' (no What\'s New file)'}`];

    if (!textsOnly) {
      const shots = media.iphone(lang);
      if (shots.length) done.push(await ascScreenshots(loc.id, locale, shots));
      const video = withPreview && media.preview(lang);
      if (video) done.push(await ascPreview(loc.id, locale, video, posterTimeCode(lang)));
    }
    report.push(`${locale}: ${done.join('; ')}`);
  }
  for (const line of report) console.log(`  ${line}`);

  await ascReviewDetail(target.id, listing.review);
  if (withBuild) await ascBuild(app.id, target.id);
  return { version, state: stateOf(target) };
}

async function ascScreenshots(locId, locale, files) {
  const sets = await ascAll(`/v1/appStoreVersionLocalizations/${locId}/appScreenshotSets`);
  const first = imageSize(files[0]);
  let type = screenshotTypeFlag;
  if (!type) {
    // The slot that already holds shots of this size, else the medium Dynamic Island slot.
    for (const set of sets) {
      const shots = await ascAll(`/v1/appScreenshotSets/${set.id}/appScreenshots`);
      const asset = shots[0]?.attributes.imageAsset;
      if (asset && asset.width === first.width && asset.height === first.height) { type = set.attributes.screenshotDisplayType; break; }
    }
    type ??= 'APP_IPHONE_61';
  }
  let set = sets.find(s => s.attributes.screenshotDisplayType === type);
  if (!set) {
    set = (await asc('POST', '/v1/appScreenshotSets', {
      data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: type }, relationships: { appStoreVersionLocalization: rel1('appStoreVersionLocalizations', locId) } },
    })).data;
  }
  const existing = await ascAll(`/v1/appScreenshotSets/${set.id}/appScreenshots`);
  const sums = files.map(f => md5(fs.readFileSync(f)));
  const same = existing.length === sums.length
    && existing.every((s, i) => s.attributes.sourceFileChecksum === sums[i] && s.attributes.assetDeliveryState?.state === 'COMPLETE');
  if (same) return `${files.length} screenshots unchanged (${type})`;
  for (const shot of existing) await asc('DELETE', `/v1/appScreenshots/${shot.id}`);
  const ids = [];
  for (const file of files) {
    const id = await ascUpload('appScreenshots', 'appScreenshotSet', set.id, file);
    ids.push(id);
    process.stdout.write(`  ${locale}: ${path.basename(file)} sent\n`);
  }
  for (const [i, id] of ids.entries()) await ascDelivered('appScreenshots', id, `${locale} ${path.basename(files[i])}`, ['COMPLETE']);
  await asc('PATCH', `/v1/appScreenshotSets/${set.id}/relationships/appScreenshots`, { data: ids.map(id => ({ type: 'appScreenshots', id })) });
  const others = sets.filter(s => s.id !== set.id).map(s => s.attributes.screenshotDisplayType);
  return `${files.length} screenshots (${type})${others.length ? `; other slots left as they are: ${others.join(', ')}` : ''}`;
}

async function ascPreview(locId, locale, file, timeCode) {
  const sets = await ascAll(`/v1/appStoreVersionLocalizations/${locId}/appPreviewSets`);
  let set = sets.find(s => s.attributes.previewType === previewType);
  if (!set) {
    set = (await asc('POST', '/v1/appPreviewSets', {
      data: { type: 'appPreviewSets', attributes: { previewType }, relationships: { appStoreVersionLocalization: rel1('appStoreVersionLocalizations', locId) } },
    })).data;
  }
  const existing = await ascAll(`/v1/appPreviewSets/${set.id}/appPreviews`);
  const sum = md5(fs.readFileSync(file));
  let id = existing.length === 1 && existing[0].attributes.sourceFileChecksum === sum ? existing[0].id : null;
  const fresh = !id;
  if (fresh) {
    for (const p of existing) await asc('DELETE', `/v1/appPreviews/${p.id}`);
    id = await ascUpload('appPreviews', 'appPreviewSet', set.id, file, { mimeType: 'video/mp4' });
    await ascDelivered('appPreviews', id, `${locale} preview`, ['UPLOAD_COMPLETE', 'COMPLETE']);
  }
  let poster = '';
  if (timeCode) {
    try {
      await asc('PATCH', `/v1/appPreviews/${id}`, { data: { type: 'appPreviews', id, attributes: { previewFrameTimeCode: timeCode } } });
      poster = `, poster frame ${timeCode}`;
    } catch (error) {
      poster = `, poster frame NOT set (${error.message}) — set it by hand to ${timeCode}`;
    }
  }
  return `preview ${fresh ? 'sent' : 'unchanged'} (${previewType}${poster}; Apple processes it for a few minutes)`;
}

async function ascReviewDetail(versionId, review) {
  const attrs = defined({
    notes: review.notes, contactFirstName: review.contactFirstName, contactLastName: review.contactLastName,
    contactEmail: review.contactEmail, contactPhone: process.env.ASC_CONTACT_PHONE, demoAccountRequired: false,
  });
  let detail = null;
  try { detail = (await asc('GET', `/v1/appStoreVersions/${versionId}/appStoreReviewDetail`)).data; } catch (error) { if (error.status !== 404) throw error; }
  try {
    if (detail) await asc('PATCH', `/v1/appStoreReviewDetails/${detail.id}`, { data: { type: 'appStoreReviewDetails', id: detail.id, attributes: attrs } });
    else await asc('POST', '/v1/appStoreReviewDetails', { data: { type: 'appStoreReviewDetails', attributes: attrs, relationships: { appStoreVersion: rel1('appStoreVersions', versionId) } } });
    console.log(`  App Review information: ${review.notes ? 'notes and contact' : `contact (notes NOT sent: fill in ${review.blanks.join(', ')} in store/listing.md)`}${process.env.ASC_CONTACT_PHONE ? ' and phone' : ''} set${!detail && !process.env.ASC_CONTACT_PHONE ? ' — add the phone number in App Store Connect (or ASC_CONTACT_PHONE)' : ''}.`);
  } catch (error) {
    console.warn(`  App Review information not set: ${error.message}`);
  }
}

async function ascBuild(appId, versionId) {
  const params = {
    'filter[app]': appId, 'filter[preReleaseVersion.version]': version,
    'filter[processingState]': 'VALID', sort: '-uploadedDate', limit: '1',
    ...(buildNumber ? { 'filter[version]': buildNumber } : {}),
  };
  const deadline = Date.now() + waitMinutes * 60_000;
  let build = null;
  for (;;) {
    build = (await asc('GET', `/v1/builds?${q(params)}`)).data[0];
    if (build || Date.now() >= deadline) break;
    console.log(`  Waiting for build ${buildNumber ?? `of ${version}`} to finish processing…`);
    await sleep(60_000);
  }
  if (!build) {
    console.log(`  Build: none of ${version}${buildNumber ? ` (${buildNumber})` : ''} has finished processing yet — run again later (--wait 30), or pick it in App Store Connect.`);
    return;
  }
  const current = (await asc('GET', `/v1/appStoreVersions/${versionId}/build`).catch(() => ({ data: null }))).data;
  if (current?.id === build.id) { console.log(`  Build ${build.attributes.version} already picked.`); return; }
  await asc('PATCH', `/v1/appStoreVersions/${versionId}/relationships/build`, { data: { type: 'builds', id: build.id } });
  console.log(`  Build ${build.attributes.version} picked for ${version}.`);
}

// ---- Google Play Developer API ----
const PLAY = 'https://androidpublisher.googleapis.com';
const playApi = `${PLAY}/androidpublisher/v3/applications/${PACKAGE}`;
async function playToken() {
  const file = process.env.PLAY_SERVICE_ACCOUNT_JSON;
  if (!file || !fs.existsSync(file)) stop('PLAY_SERVICE_ACCOUNT_JSON is not set or not there — the Play service account\'s JSON key (docs/ANDROID_RELEASE.md).');
  const account = JSON.parse(fs.readFileSync(file, 'utf8'));
  const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })}`;
  const assertion = `${unsigned}.${crypto.createSign('RSA-SHA256').update(unsigned).sign(account.private_key).toString('base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) stop(`Google did not give a token: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).access_token;
}

async function googlePlay(listing) {
  console.log('\n== Google Play ==');
  const auth = { Authorization: `Bearer ${await playToken()}` };
  const call = async (method, url, { json, body, type } = {}) => {
    const res = await fetch(url, {
      method,
      headers: { ...auth, ...(json ? { 'Content-Type': 'application/json' } : type ? { 'Content-Type': type } : {}) },
      body: json ? JSON.stringify(json) : body,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Google Play said ${res.status} to ${method} ${new URL(url).pathname}: ${text.slice(0, 500)}`);
    return text ? JSON.parse(text) : {};
  };
  const edit = await call('POST', `${playApi}/edits`);
  const e = `${playApi}/edits/${edit.id}`;
  const report = [];
  try {
    const have = new Set(((await call('GET', `${e}/listings`)).listings ?? []).map(l => l.language));
    for (const [code, lang] of Object.entries({ ...PLAY_LANGS, ...listing.playOthers })) {
      if (!languages.includes(lang)) continue;
      const t = listing.texts[lang];
      if (!have.has(code) && !addLanguages) { report.push(`${code}: not in the Play Console — left out (--add-languages adds it)`); continue; }
      if (!t.playFull || !t.playTitle) { report.push(`${code}: store/play-listing*.md has no Play title or full description — left out`); continue; }
      const texts = defined({ language: code, title: t.playTitle, shortDescription: t.playShort, fullDescription: t.playFull });
      // PATCH keeps what the listing does not say (a YouTube video); PUT makes a new language.
      await call(have.has(code) ? 'PATCH' : 'PUT', `${e}/listings/${code}`, { json: texts });
      const done = ['texts'];
      if (!textsOnly) {
        const images = async (kind, files) => {
          if (!files.length) return null;
          const now = (await call('GET', `${e}/listings/${code}/${kind}`)).images ?? [];
          const sums = files.map(f => sha256(fs.readFileSync(f)));
          if (now.length === sums.length && now.every((img, i) => img.sha256 === sums[i])) return `${kind} unchanged`;
          await call('DELETE', `${e}/listings/${code}/${kind}`);
          for (const f of files) {
            await call('POST', `${PLAY}/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${edit.id}/listings/${code}/${kind}?uploadType=media`, {
              body: fs.readFileSync(f), type: /\.png$/i.test(f) ? 'image/png' : 'image/jpeg',
            });
          }
          return `${files.length} ${kind}`;
        };
        done.push(
          await images('phoneScreenshots', media.playPhone(lang)),
          await images('featureGraphic', [media.playFeature(lang)].filter(Boolean)),
          await images('icon', fs.existsSync(media.playIcon) ? [media.playIcon] : []),
        );
      }
      report.push(`${code}: ${done.filter(Boolean).join('; ')}`);
    }
    try {
      await call('POST', `${e}:commit`);
    } catch (error) {
      if (!/changesNotSentForReview/.test(error.message)) throw error;
      await call('POST', `${e}:commit?changesNotSentForReview=true`);
      report.push('committed without sending for review (Play asked for that: send the changes for review in the Play Console › Publishing overview)');
    }
  } catch (error) {
    await call('DELETE', e).catch(() => {});
    throw error;
  }
  for (const line of report) console.log(`  ${line}`);
}

// ---- Run ----
const listing = parseListing();
languages = langFlag ?? Object.keys(listing.texts);
printPlan(listing);
const problems = check(listing);
if (problems.length) stop('Not sent — fix these first:', ...problems.map(p => `  ✗ ${p}`));
console.log('\nAll texts and files fit the stores\' rules.');
if (dryRun) {
  console.log('Dry run — nothing sent.');
  process.exit(0);
}
if (doAndroid) await googlePlay(listing);
if (doIos) {
  const { state } = await appStore(listing);
  console.log(`\nApp Store: version ${version} is filled in (${state}). Submitting for review stays a click: App Store Connect › Spartopf › ${version} › Add for Review.`);
}
if (doAndroid) console.log('Google Play: the listing changes are committed; Play reviews them on its own (Publishing overview shows the state).');
