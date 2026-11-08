// Fails the build if app source prints to the console (plan 05, point 6).
// User data must never land in a log. Test files are allowed a console.log
// (e.g. a timing print); only src/ outside *.test.ts is checked.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src', import.meta.url));
const prefix = root + (root.endsWith('/') || root.endsWith('\\') ? '' : '/');
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { walk(path); continue; }
    if (!/\.(ts|tsx)$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
    const text = readFileSync(path, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/\bconsole\.(log|debug|info|warn|error)\s*\(/.test(line)) {
        offenders.push(`src/${path.slice(prefix.length).replace(/\\/g, '/')}:${i + 1}  ${line.trim()}`);
      }
    });
  }
}

walk(root);

if (offenders.length) {
  console.error('console.* in app source (user data must not be logged):');
  for (const o of offenders) console.error('  ' + o);
  process.exit(1);
}
console.log('No console.* in app source.');
