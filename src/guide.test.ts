import { describe, expect, it } from 'vitest';
import translations, { Language, languages, loadAllLanguages } from './translations';
import {
  CHAPTER_TITLES, GUIDE_CHAPTERS, GUIDE_TOPICS, GuideWords, MARKS, MarkId, TOURS, TOUR_STEPS, byChapter, guideLabels, guideText, guideTopics,
  guideParts, markText, readGuideSeen, searchGuide, topicText, tourAbout, tourCardPlace, tourName, tourSteps,
} from './guide';
import { GuidePages, guidePages, loadGuidePages } from './guidePages';

await loadAllLanguages();
const pages = Object.fromEntries(await Promise.all(languages.map(async l => [l, await loadGuidePages(l)]))) as Record<Language, GuidePages>;
/** A language's labels and guide pages together, as the guide reads them. */
const words = (lang: Language): GuideWords => ({ ...translations[lang], ...pages[lang] });
const de = words('de');
const pageKeys = Object.keys(pages.de) as (keyof GuidePages)[];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const everywhere = { ios: true, app: true };
const web = { ios: false, app: false };

describe('the guide’s topics', () => {
  it('have an id of their own, a chapter, a title, and a summary, steps and a tip', () => {
    const ids = GUIDE_TOPICS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of GUIDE_TOPICS) {
      expect(GUIDE_CHAPTERS, t.id).toContain(t.chapter);
      expect(de[t.title], `${t.id} title`).toBeTruthy();
      const { sum, steps, tip } = topicText(t);
      expect(de[sum], `${t.id} sum`).toBeTruthy();
      expect(de[tip], `${t.id} tip`).toBeTruthy();
      // Two to five steps, one a line, none empty.
      const lines = de[steps].split('\n');
      expect(lines.length, `${t.id} steps`).toBeGreaterThanOrEqual(2);
      expect(lines.length, `${t.id} steps`).toBeLessThanOrEqual(5);
      for (const l of lines) expect(l.trim(), t.id).not.toBe('');
    }
  });

  it('fill every chapter, in the guide’s order', () => {
    const groups = byChapter(guideTopics(everywhere));
    expect(groups.map(g => g.chapter)).toEqual([...GUIDE_CHAPTERS]);
    for (const c of GUIDE_CHAPTERS) expect(de[CHAPTER_TITLES[c]], c).toBeTruthy();
    expect(groups.flatMap(g => g.topics).length).toBe(GUIDE_TOPICS.length);
  });

  it('leave out what a device can’t do: Shortcuts off the iPhone, reminders on the web', () => {
    const ids = (on: { ios: boolean; app: boolean }) => guideTopics(on).map(t => t.id);
    expect(ids(everywhere)).toContain('capture');
    expect(ids(everywhere)).toContain('reminders');
    expect(ids({ ios: false, app: true })).not.toContain('capture'); // Android
    expect(ids({ ios: false, app: true })).toContain('reminders');
    expect(ids(web)).not.toContain('capture');
    expect(ids(web)).not.toContain('reminders');
    expect(ids(web).length).toBe(GUIDE_TOPICS.length - 2);
  });

  it('every one but “everything stays on the device” leads somewhere', () => {
    expect(GUIDE_TOPICS.filter(t => !('action' in t)).map(t => t.id)).toEqual(['private']);
  });
});

describe('the guide’s pages (src/i18n/guide/), in every language', () => {
  it('are loaded on demand, a language at a time', async () => {
    expect(guidePages('de')).toBe(pages.de);
    expect(await loadGuidePages('ar')).toBe(pages.ar);
  });

  it.each([...languages])('%s: every key, none empty, the German placeholders and no others', lang => {
    const p = pages[lang];
    expect(Object.keys(p).sort()).toEqual([...pageKeys].sort());
    for (const k of pageKeys) {
      expect(p[k].trim(), `${lang}.${k}`).not.toBe('');
      expect(placeholders(p[k]), `${lang}.${k}`).toEqual(placeholders(pages.de[k]));
    }
  });

  it.each([...languages])('%s: as many steps as the German, each line with its placeholders', lang => {
    for (const t of GUIDE_TOPICS) {
      const { steps } = topicText(t);
      const mine = pages[lang][steps].split('\n');
      const german = pages.de[steps].split('\n');
      expect(mine.length, `${lang}.${steps}`).toBe(german.length);
      mine.forEach((l, i) => expect(placeholders(l), `${lang}.${steps}[${i}]`).toEqual(placeholders(german[i])));
    }
  });

  it.each([...languages])('%s: no placeholder is left unfilled, and no key doubles one of the app’s', lang => {
    const w = words(lang);
    for (const k of pageKeys) {
      expect(guideText(w, k), `${lang}.${k}`).not.toMatch(/\{\w+\}/);
      expect(k in translations[lang], k).toBe(false);
    }
  });

  it.each([...languages])('%s: names nothing of Apple’s — Android shows the same pages', lang => {
    for (const k of pageKeys) expect(pages[lang][k], `${lang}.${k}`).not.toMatch(/iPhone|iOS\b|iCloud|Face ID|Touch ID|Apple/);
  });

  it('name the app’s own labels', () => {
    expect(guideText(de, 'guideSplitSteps')).toContain(de.splitPayAction);
    expect(guideText(de, 'guideSplitSteps')).toContain(de.refund);
    expect(guideText(de, 'guideAddSteps')).toMatch(/^Tippe unten rechts auf \+\./);
    expect(guideText(words('en'), 'tourTabs')).toBe('“Statistics” looks back, “Plan” looks ahead. Under “Settings” you’ll find the whole guide.');
    expect(Object.values(guideLabels(translations.ar)).every(Boolean)).toBe(true);
  });

  it('the Arabic swipe goes the other way, as its gestures card says', () => {
    // Right to left: paid is a swipe to the left (tipSwipe says the same).
    expect(pages.ar.guidePaidSteps).toMatch(/اليسار[\s\S]*اليمين/);
    expect(translations.ar.tipSwipe).toMatch(/اليسار.*اليمين/);
  });
});

describe('searching the guide', () => {
  const all = guideTopics(everywhere);
  const find = (q: string, w = de) => searchGuide(all, w, q).map(x => x.id);

  it('an empty search keeps everything', () => {
    expect(find('')).toHaveLength(all.length);
    expect(find('   ')).toHaveLength(all.length);
  });
  it('finds a word in a title or in the text, whatever its case or accents', () => {
    expect(find('favorit')).toContain('favorites');
    expect(find('QR-CODE')).toContain('invoice');
    expect(find('ruckgangig')).toContain('paid');
    expect(find('excel')[0]).toBe('excel');
  });
  it('wants every word', () => {
    expect(find('budget jahr')).toContain('budgets');
    expect(find('budget zzz')).toEqual([]);
  });
  it('reads the labels filled in, too', () => {
    expect(find(de.whatIfTitle)).toContain('outlook');
    expect(find('can I afford', words('en'))).toContain('outlook');
  });
  it('searches in the language shown', () => {
    expect(find('الميزانيات', words('ar'))).toContain('budgets');
    expect(find('kumbara', words('tr'))).toContain('goals');
  });
});

describe('the buttons a text names', () => {
  it('come in pieces, to be drawn as they look', () => {
    expect(guideParts(de, 'guideSplitSteps')).toEqual([
      'Aufteilen: Öffne den Eintrag und tippe unten auf ', { label: de.splitPayAction, key: 'split' }, '.\n'
        + 'Verteile den Betrag auf die Kategorien – die Teile müssen genau aufgehen.\n'
        + 'Erstattung: Trag das Geld in der Kategorie ein, in der du gekauft hast, und tippe auf ', { label: de.refund, key: 'refund' }, '.',
    ]);
    // A symbol on screen: its character in plain text, its key for the drawing.
    expect(guideParts(de, 'guideAddSteps')[1]).toEqual({ label: '+', key: 'add' });
  });

  it('a text that names none is one piece', () => {
    expect(guideParts(de, 'guidePrivateSum')).toEqual([de.guidePrivateSum]);
  });
});

describe('what the guide remembers', () => {
  it('keeps known topics, each once, and nothing else', () => {
    expect(readGuideSeen(['add', 'add', 'nope', 3, 'stats'])).toEqual(['add', 'stats']);
    expect(readGuideSeen('add')).toEqual([]);
    expect(readGuideSeen(null)).toEqual([]);
  });
});

describe('the tours', () => {
  it('each has a name, a line about it, and at most five marks — each with a ring and a sentence', () => {
    for (const tour of TOURS) {
      expect(de[tourName(tour)], tour).toBeTruthy();
      expect(de[tourAbout(tour)], tour).toBeTruthy();
      expect(TOUR_STEPS[tour].length, tour).toBeGreaterThanOrEqual(3);
      expect(TOUR_STEPS[tour].length, tour).toBeLessThanOrEqual(5);
      for (const m of TOUR_STEPS[tour]) {
        expect(MARKS[m].anchor, m).toMatch(/^\[data-/);
        expect(de[markText(m)], m).toBeTruthy();
      }
    }
  });

  it('the month page’s ends on the add button, the entry sheet’s on the tick that saves', () => {
    expect(TOUR_STEPS.month.at(-1)).toBe('add');
    expect(TOUR_STEPS.entry.at(-1)).toBe('save');
  });

  it('what a topic’s Zeigen lights up is a mark, and its tour is one of the tours', () => {
    for (const t of GUIDE_TOPICS) {
      if ('point' in t) expect(MARKS[t.point as MarkId], t.id).toBeTruthy();
      if ('tour' in t) expect(TOURS, t.id).toContain(t.tour);
      // Pointing needs somewhere to go first.
      if ('point' in t) expect('action' in t, t.id).toBe(true);
    }
  });

  it('skips a step whose mark isn’t on the screen', () => {
    expect(tourSteps('month', () => true)).toEqual([...TOUR_STEPS.month]);
    // A first run: no balance yet, nothing to tick.
    expect(tourSteps('month', s => s !== 'balance' && s !== 'tick')).toEqual(['month', 'tabs', 'add']);
    // Planen without a budget or a savings pot yet.
    expect(tourSteps('plan', s => s !== 'planBudgets' && s !== 'planGoals')).toEqual(['planPace', 'planRunway', 'planOutlook']);
    expect(tourSteps('stats', () => false)).toEqual([]);
  });

  it('puts its card under the mark, else above it, else over its lower part — never off the screen', () => {
    const screen = { height: 800, top: 50, bottom: 34 };
    expect(tourCardPlace({ top: 100, bottom: 300 }, 160, screen)).toEqual({ top: 312, side: 'below' });
    // The tab bar: no room under it.
    expect(tourCardPlace({ top: 700, bottom: 770 }, 160, screen)).toEqual({ top: 528, side: 'above' });
    // A mark as tall as the screen.
    const over = tourCardPlace({ top: 60, bottom: 760 }, 160, screen);
    expect(over.side).toBe('over');
    expect(over.top + 160).toBeLessThanOrEqual(800 - 34 - 12);
    expect(over.top).toBeGreaterThanOrEqual(62);
    // A card taller than the room that is left still starts under the notch.
    expect(tourCardPlace({ top: 60, bottom: 760 }, 900, screen).top).toBe(62);
  });
});
