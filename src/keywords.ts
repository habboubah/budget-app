import { Category, Entry } from './types';
import { NameSuggestion, displayName, keywordKey, keywordTokens, suggestNames } from './logic';
import { CATEGORY_KEYWORDS, shippedKeywords } from './data/keywords';
import { defaultCategories } from './data/defaults';

/**
 * Smarter entering (plan 32): what the entry sheet does with the name while it
 * is typed. Three things, all pure and from three sources:
 *
 * - **Which category** (`guessCategories`): the user's own earlier entries
 *   first ("Lidl" went to Familie twice → Familie), then each category's
 *   keywords (`Category.keywords`, or what a built-in ships with), then the
 *   category's own name. A keyword matches as a whole word or phrase
 *   ("Aldi Talk" beats "Aldi"), as the start of a compound ("Strom" →
 *   "Stromrechnung", from four letters) or its end ("Versicherung" →
 *   "Hausratversicherung", from five), with a small typo ("Lidel", "Fittness"),
 *   and — not yet *sure* — as the start of what is still being typed ("Lid").
 * - **How the name goes on** (`completeNames`): earlier names first, then the
 *   keywords that start with what is typed, then those one typo away.
 * - **A typo** (`correctTypo`): a word one or two letters off a keyword or an
 *   earlier name, and not the start of one, gets "Meintest du …?".
 *
 * Build the index once per change of categories or entries (`buildKeywordIndex`),
 * then ask it on every keystroke.
 */

/** A category guess for a name: how well it matched, whether well enough to pick it, and the word that matched. */
export interface CategoryGuess {
  categoryId: string;
  score: number;
  /** A whole word, a compound, an earlier entry or a one-letter typo — enough to pick the category by itself. */
  sure: boolean;
  /** The keyword or earlier name that matched, as written ("Lidl"). */
  word: string;
}

interface Item {
  categoryId: string;
  word: string;
  tokens: string[];
  key: string;
  compact: string;
  /** From a list the user edited: wins a tie with what ships. */
  own: boolean;
  /** The category's own name, not a keyword. */
  name: boolean;
}

interface History {
  name: string;
  tokens: string[];
  key: string;
  /** Uses per category, and the most recent one there. */
  byCategory: Map<string, { count: number; latest: number }>;
}

export interface KeywordIndex {
  items: Item[];
  history: History[];
  /** Entries per category, for ties. */
  usage: Map<string, number>;
  /** Position in the user's category order, for the last tie. */
  order: Map<string, number>;
  /** Every single word known — keywords, names, earlier entries — folded → as written. */
  vocab: Map<string, { word: string; weight: number }>;
  entries: Entry[];
  lang: string;
}

/** A category's keywords: its own list once edited in Settings, else what a built-in ships with (none for a new one). */
export function keywordsOf(c: Category, lang: string): string[] {
  return c.keywords ?? shippedKeywords(c.id, lang);
}

/** Whether a list says the same as what the category ships with (then it is stored as unset, following later updates). */
export function isShippedList(c: Pick<Category, 'id'>, list: string[], lang: string): boolean {
  const shipped = shippedKeywords(c.id, lang);
  if (!shipped.length || shipped.length !== list.length) return false;
  const keys = new Set(shipped.map(keywordKey));
  return list.every(w => keys.has(keywordKey(w)));
}

/** "Lebensmittel und Drogerie" → the name and its words worth matching ("Lebensmittel", "Drogerie"). */
const STOP = new Set(['und', 'and', 'the', 'der', 'die', 'das', 'fur', 'for', 'mit', 'with', 'و']);
function nameWords(name: string): string[] {
  const words = name.split(/\s+/).filter(w => {
    const k = keywordTokens(w);
    return k.length === 1 && k[0].length >= 4 && !STOP.has(k[0]);
  });
  return [name, ...words.filter(w => keywordKey(w) !== keywordKey(name))];
}

export function buildKeywordIndex({ categories, entries, lang }: { categories: Category[]; entries: Entry[]; lang: string }): KeywordIndex {
  const items: Item[] = [];
  const vocab = new Map<string, { word: string; weight: number }>();
  const learn = (text: string, weight: number) => {
    for (const w of text.split(/\s+/)) {
      const t = keywordTokens(w);
      if (t.length !== 1) continue;
      const known = vocab.get(t[0]);
      if (!known || known.weight < weight) vocab.set(t[0], { word: w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}+&']+$/gu, ''), weight });
    }
  };
  const add = (categoryId: string, word: string, own: boolean, name: boolean) => {
    const tokens = keywordTokens(word);
    if (!tokens.length) return;
    items.push({ categoryId, word, tokens, key: tokens.join(' '), compact: tokens.join(''), own, name });
  };
  for (const c of categories) {
    for (const w of keywordsOf(c, lang)) { add(c.id, w, !!c.keywords, false); learn(w, 2); }
    // Every language's name: "Restaurants" works in German, English and Arabic.
    const names = new Set(Object.values(c.names));
    for (const n of names) for (const w of nameWords(n)) { add(c.id, w, false, true); learn(w, 1); }
  }
  const known = new Set(categories.map(c => c.id));
  const usage = new Map<string, number>();
  const groups = new Map<string, History & { at: number }>();
  for (const e of entries) {
    if (!known.has(e.categoryId)) continue;
    usage.set(e.categoryId, (usage.get(e.categoryId) ?? 0) + 1);
    const tokens = keywordTokens(e.name);
    const key = tokens.join(' ');
    if (key.length < 2) continue;
    const at = (Number(e.month.replace('-', '')) || 0) * 1e13 + (e.createdAt || 0);
    let g = groups.get(key);
    if (!g) { g = { name: e.name, tokens, key, byCategory: new Map(), at }; groups.set(key, g); }
    if (at >= g.at) { g.name = e.name; g.at = at; }
    const b = g.byCategory.get(e.categoryId) ?? { count: 0, latest: 0 };
    b.count++;
    b.latest = Math.max(b.latest, at);
    g.byCategory.set(e.categoryId, b);
  }
  const history = [...groups.values()];
  for (const h of history) learn(h.name, 3);
  return { items, history, usage, order: new Map(categories.map((c, i) => [c.id, i])), vocab, entries, lang };
}

/* ------------------------------------------------------------ edit distance */

/** Optimal string alignment distance (a swap of two neighbours is one edit), giving up above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const A = [...a];
  const B = [...b];
  let prev2: number[] = [];
  let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= B.length; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      cur.push(d);
      low = Math.min(low, d);
    }
    if (low > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[B.length];
}

/**
 * How many typos a word may have and still count: none under four letters,
 * one up to seven, two from eight. A four-letter word only by a swapped,
 * missing or extra letter — "Aldi" is not "Audi".
 */
function typoOf(typed: string, word: string): number | null {
  const n = Math.min([...typed].length, [...word].length);
  if (n < 4 && [...word].length < 5) return null;
  const allowed = [...word].length >= 8 ? 2 : 1;
  const d = editDistance(typed, word, allowed);
  if (d === 0 || d > allowed) return null;
  if ([...word].length === 4 && [...typed].length === 4 && [...typed].sort().join('') !== [...word].sort().join('')) return null;
  return d;
}

/* ------------------------------------------------------------------ guessing */

interface Typed { tokens: string[]; key: string; compact: string }

const typedOf = (text: string): Typed => {
  const tokens = keywordTokens(text);
  return { tokens, key: tokens.join(' '), compact: tokens.join('') };
};

/** Where `needle` sits as whole tokens inside `hay`, or -1. */
function phraseAt(hay: string[], needle: string[]): number {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/** How one keyword or name matches what is typed: a score (higher is better) and whether it is sure. */
function matchItem(it: Item, t: Typed, vocab: KeywordIndex['vocab']): { score: number; sure: boolean } | null {
  const len = Math.min([...it.compact].length, 12);
  const extra = 4 * (it.tokens.length - 1) + (it.own ? 3 : 0);
  // The whole word or phrase, also written apart or together ("Fitness Studio" = "Fitnessstudio").
  const together = t.tokens.some((x, i) => i + 1 < t.tokens.length && x + t.tokens[i + 1] === it.compact);
  if (phraseAt(t.tokens, it.tokens) >= 0 || (it.compact.length >= 4 && (t.compact === it.compact || together))) {
    return { score: (it.name ? 90 : 100) + len + extra, sure: true };
  }
  if (it.tokens.length === 1) {
    const k = it.compact;
    const kl = [...k].length;
    // A compound: "Stromrechnung", "Hausratversicherung" — the rest a word of its own, so "Rente" is no "Rent".
    if (t.tokens.some(x => [...x].length >= kl + 3 && ((kl >= 4 && x.startsWith(k)) || (kl >= 5 && x.endsWith(k))))) {
      return { score: 80 + len + extra, sure: true };
    }
  }
  // The start of what is still being typed: "Lid", "Burger K".
  for (let j = Math.min(it.tokens.length, t.tokens.length); j >= 1; j--) {
    const tail = t.tokens.slice(-j).join(' ');
    if (it.key.length > tail.length && it.key.startsWith(tail) && (j === 1 || t.tokens.slice(-j, -1).join(' ') === it.tokens.slice(0, j - 1).join(' '))) {
      return { score: 55 + Math.min([...tail].length, 10) + (it.own ? 3 : 0), sure: false };
    }
  }
  // A typo: in a word that is no known word itself.
  let best: { score: number; sure: boolean } | null = null;
  if (it.tokens.length === 1) {
    for (const x of t.tokens) {
      if (vocab.has(x)) continue;
      const d = typoOf(x, it.compact);
      if (d === null) continue;
      const sure = d === 1 && Math.max([...x].length, [...it.compact].length) >= 5;
      const score = 70 + len - 12 * d + (it.own ? 3 : 0);
      if (!best || score > best.score) best = { score, sure };
    }
    // ...or in the word still being typed: "Elektr" → "Electricity".
    const last = t.tokens[t.tokens.length - 1];
    if (!best && [...last].length >= 5 && [...it.compact].length > [...last].length && !vocab.has(last)) {
      const L = [...last].length;
      const K = [...it.compact];
      const d = Math.min(...[L - 1, L, L + 1].map(n => editDistance(last, K.slice(0, n).join(''), 1)));
      if (d === 1) best = { score: 50 + Math.min(L, 10), sure: false };
    }
  } else if (t.tokens.length >= it.tokens.length) {
    const tail = t.tokens.slice(-it.tokens.length).join(' ');
    const d = it.key.length >= 6 ? editDistance(tail, it.key, it.key.length >= 10 ? 2 : 1) : 9;
    if (d >= 1 && d <= (it.key.length >= 10 ? 2 : 1)) best = { score: 70 + len - 12 * d + extra, sure: d === 1 };
  }
  return best;
}

/** How an earlier name matches: the same name, a name inside it ("Miete Oktober"), or the start of one. */
function matchHistory(h: History, t: Typed): { score: number; sure: boolean } | null {
  if (h.key === t.key) return { score: 130, sure: true };
  if (h.key.length >= 3 && phraseAt(t.tokens, h.tokens) >= 0) return { score: 118, sure: true };
  if (t.key.length >= 2 && h.key.startsWith(t.key)) return { score: 64, sure: false };
  return null;
}

/**
 * The categories a typed name points to, best first: when any match is sure,
 * only the sure ones near the best; else the likely ones, once three letters
 * are typed. Ties
 * go to the month's own categories (`featured`), then the most used, then the
 * user's order.
 */
export function guessCategories(index: KeywordIndex, text: string, { featured = [], limit = 3 }: { featured?: string[]; limit?: number } = {}): CategoryGuess[] {
  const t = typedOf(text);
  if (!t.tokens.length) return [];
  const best = new Map<string, CategoryGuess>();
  const offer = (categoryId: string, score: number, sure: boolean, word: string) => {
    if (!index.order.has(categoryId)) return;
    const was = best.get(categoryId);
    if (!was || score > was.score) best.set(categoryId, { categoryId, score, sure, word });
  };
  for (const h of index.history) {
    const m = matchHistory(h, t);
    if (!m) continue;
    for (const [id, b] of h.byCategory) offer(id, m.score + Math.min(b.count, 10), m.sure, h.name);
  }
  for (const it of index.items) {
    const m = matchItem(it, t, index.vocab);
    if (m) offer(it.categoryId, m.score, m.sure, it.word);
  }
  const all = [...best.values()].sort((a, b) =>
    b.score - a.score
    || Number(featured.includes(b.categoryId)) - Number(featured.includes(a.categoryId))
    || (index.usage.get(b.categoryId) ?? 0) - (index.usage.get(a.categoryId) ?? 0)
    || index.order.get(a.categoryId)! - index.order.get(b.categoryId)!);
  // Sure ones close to the best: "Tanken bei Lidl" is both, "Kindergeld" only Einkommen.
  const sure = all.filter(g => g.sure && g.score >= all[0].score - 15);
  if (sure.length) return sure.slice(0, limit);
  return [...t.compact].length >= 3 ? all.slice(0, limit) : [];
}

/* ---------------------------------------------------------------- completing */

/** The text with its last word replaced: "Tanken bei Ar" + "Aral" → "Tanken bei Aral" — keeping an Arabic article ("الكهرب" → "الكهرباء"). */
function withLastWord(text: string, word: string): string {
  return text.replace(/\S+\s*$/u, typed => (/^ال/.test(typed) && !/^ال/.test(word) && /^\p{Script=Arabic}/u.test(word) ? `ال${word}` : word));
}

/**
 * Names that complete what is typed: earlier names first (`suggestNames`, from
 * every category), then keywords that start with it — or whose next word
 * does, keeping what came before — the most used categories' first, then
 * keywords one typo away. Each carries its category, so picking one takes the
 * entry there.
 */
export function completeNames(index: KeywordIndex, text: string, { categoryId, limit = 60 }: { categoryId: string; limit?: number }): NameSuggestion[] {
  const t = typedOf(text);
  if (!t.tokens.length) return [];
  const out: NameSuggestion[] = [];
  const seen = new Set([t.key]);
  const push = (s: NameSuggestion) => {
    const k = keywordKey(s.name);
    if (!k || seen.has(k) || !index.order.has(s.categoryId)) return;
    seen.add(k);
    out.push(s);
  };
  for (const s of suggestNames({ entries: index.entries, categoryId, query: text, lang: index.lang, limit })) push(s);
  const byUse = (a: Item, b: Item) => (index.usage.get(b.categoryId) ?? 0) - (index.usage.get(a.categoryId) ?? 0);
  const keywords = index.items.filter(it => !it.name).sort(byUse);
  const last = t.tokens[t.tokens.length - 1];
  for (const it of keywords) {
    if (it.key.length > t.key.length && it.key.startsWith(t.key)) push({ name: it.word, count: 0, categoryId: it.categoryId });
  }
  if (t.tokens.length > 1) {
    for (const it of keywords) {
      if (it.tokens.length === 1 && it.compact.length > last.length && it.compact.startsWith(last)) {
        push({ name: withLastWord(text, it.word), count: 0, categoryId: it.categoryId });
      }
    }
  }
  if ([...t.compact].length >= 4) {
    for (const it of keywords) {
      if (it.tokens.length !== 1) continue;
      const K = [...it.compact];
      const L = [...t.compact].length;
      // About as long: the whole word with a typo ("Lidel" → "Lidl"); longer: its start ("Elektr" → "Electricity").
      const near = K.length <= L + 1
        ? typoOf(t.compact, it.compact) !== null
        : L >= 5 && Math.min(...[L - 1, L, L + 1].map(n => editDistance(t.compact, K.slice(0, n).join(''), 1))) === 1;
      if (near) push({ name: it.word, count: 0, categoryId: it.categoryId });
    }
  }
  return out.slice(0, limit);
}

/**
 * The name with a typo fixed — "Lidel" → "Lidl", "Fittness Studio" →
 * "Fitness Studio" — or null. Only words of four letters or more that are no
 * known word themselves, nor the start of one while still being typed; the
 * nearest known word wins, the user's own earlier names before keywords.
 */
export function correctTypo(index: KeywordIndex, text: string): string | null {
  const parts = text.split(/(\s+)/);
  const typingLast = !/\s$/.test(text);
  let changed = false;
  const lastWordAt = parts.length - (parts[parts.length - 1] === '' ? 3 : 1);
  const fixed = parts.map((part, i) => {
    if (i % 2 === 1) return part;
    const tokens = keywordTokens(part);
    if (tokens.length !== 1) return part;
    const x = tokens[0];
    if ([...x].length < 4 || index.vocab.has(x) || /\d/.test(x)) return part;
    if (typingLast && i === lastWordAt) {
      for (const k of index.vocab.keys()) if (k.startsWith(x)) return part;
    }
    let best: { word: string; d: number; weight: number } | null = null;
    for (const [k, v] of index.vocab) {
      if (k.startsWith(x) || x.startsWith(k)) continue;
      const d = typoOf(x, k);
      if (d === null) continue;
      if (!best || d < best.d || (d === best.d && v.weight > best.weight)) best = { word: v.word, d, weight: v.weight };
    }
    if (!best || !best.word) return part;
    changed = true;
    // Keep what stood around the word ("(Lidel)" → "(Lidl)").
    return part.replace(/[\p{L}\p{N}&+'’]+(?:[-.][\p{L}\p{N}&+'’]+)*/u, best.word);
  });
  return changed ? fixed.join('') : null;
}

/* ------------------------------------------------------------------ settings */

/**
 * Keywords worth adding to a category: the names the user enters there most
 * often that none of its keywords catch yet ("Habibi Markt" ×4). Not the
 * category's own name (what an entry without a name is called).
 */
export function keywordIdeas({ category, keywords, entries, lang, limit = 8 }: {
  category: Category;
  /** Its list as it stands in the editor. */
  keywords: string[];
  entries: Entry[];
  lang: string;
  limit?: number;
}): string[] {
  const own = buildKeywordIndex({ categories: [{ ...category, keywords }], entries: [], lang });
  const names = new Set(Object.values(category.names).map(keywordKey));
  const counts = new Map<string, { name: string; count: number }>();
  for (const e of entries) {
    if (e.categoryId !== category.id) continue;
    const k = keywordKey(e.name);
    if (!k || names.has(k)) continue;
    const c = counts.get(k) ?? { name: e.name, count: 0 };
    c.count++;
    counts.set(k, c);
  }
  return [...counts.values()]
    .filter(c => !guessCategories(own, c.name).some(g => g.sure))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(c => c.name);
}

let shipped: KeywordIndex | null = null;
let shippedLang = '';

/**
 * Keywords for a new category from the one that ships closest to its name:
 * "Fitness" → Sport's (Gym, McFit, FitX …), "Haustier" → none.
 */
export function keywordsForName(name: string, lang: string, limit = 14): string[] {
  if (!keywordKey(name)) return [];
  if (!shipped || shippedLang !== lang) {
    shipped = buildKeywordIndex({ categories: defaultCategories(), entries: [], lang });
    shippedLang = lang;
  }
  const top = guessCategories(shipped, name)[0];
  if (!top?.sure) return [];
  const self = keywordKey(name);
  // The usual words and the best-known brands, a few of each.
  const k = CATEGORY_KEYWORDS[top.categoryId];
  const words = [...(k[lang as 'de' | 'en' | 'ar'] ?? []).slice(0, 8), ...(k.all ?? []).slice(0, 6), ...shippedKeywords(top.categoryId, lang)];
  return [...new Set(words)].filter(w => keywordKey(w) !== self).slice(0, limit);
}

/** The other categories that have this keyword too, by name. */
export function keywordOwners(categories: Category[], word: string, lang: string, exceptId?: string): string[] {
  const k = keywordKey(word);
  if (!k) return [];
  return categories
    .filter(c => c.id !== exceptId && keywordsOf(c, lang).some(w => keywordKey(w) === k))
    .map(c => displayName(c.names, lang));
}
