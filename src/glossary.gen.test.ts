import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { LANGUAGE_NAMES, languages, loadAllLanguages, stringsFor } from './translations';

const TERMS: [string, string][] = [
  ['balanceNow', 'what is in the account now'], ['balanceEnd', 'the balance expected at the end of the month'], ['leftOverNow', 'income minus spending this month'],
  ['startingBalance', 'what the book\'s first month opened with'], ['carryShort', 'balance carried over from last month'], ['income', ''], ['expenses', ''],
  ['kindExpense', 'one entry of money going out (the entry sheet\'s switch)'], ['kindIncome', 'one entry of money coming in'],
  ['open', 'not paid yet'], ['paidState', ''], ['expected', 'income not received yet'], ['receivedState', 'income that has arrived'],
  ['overdue', ''], ['dueTitle', 'open entries due soon'], ['repeatNone', 'an entry that does not repeat'], ['repeatMonthly', ''], ['repeatYearly', ''],
  // The first five minutes (plan 39): what a new book says before anything else.
  ['spentThisMonth', 'the balance card before a balance is known'], ['noBalanceAsk', 'the row that asks for the bank balance'], ['balanceCheck', 'matching the book with the bank, and the opening balance'],
  ['emptyCategories', 'categories without an entry this month'], ['stepsTitle', 'what is left of setting the book up'], ['importMenu', 'every way to bring entries in'],
  ['reserveTitle', 'what to set aside a month for yearly bills'], ['more', 'what a menu or a sheet keeps one tap away'], ['less', 'folds an opened card again'], ['prefsTitle', 'what is set once (under the fourth tab)'],
  ['category', ''], ['categories', ''], ['budgetsTitle', 'a monthly limit per category'], ['goalsTitle', 'savings pots — the app is named after one'], ['outlookTitle', 'the forecast (never "forecast")'],
  ['favorites', 'entries saved for one tap'], ['rulesTitle', 'import rules'], ['accountsTitle', ''], ['transferNew', 'money moved between two accounts'], ['debtsTitle', ''],
  ['receipt', 'a photo or PDF on an entry'], ['splitPayAction', 'one payment across categories'], ['exportData', ''], ['bookSection', 'the budget book itself'],
  ['tabMonth', 'tab'], ['tabStats', 'tab'], ['tabInsights', 'tab'], ['tabSettings', 'tab'], ['save', ''], ['undo', ''],
];

it.skipIf(!process.env.WRITE_GLOSSARY)('writes docs/plans/glossary.md from the app’s own strings', async () => {
  await loadAllLanguages();
  const order = ['de', 'en', ...languages.filter(l => l !== 'de' && l !== 'en')];
  let out = '# Glossary\n\nThe app\'s core terms as each language has them **now**, taken from the strings themselves (the languages plan). German and English are the originals; Arabic was written with them; the other eleven are machine-drafted. A reviewer checks a language\'s column first — a term changed here must be changed everywhere it appears in `src/i18n/<language>.ts`.\n\nRegenerate: `WRITE_GLOSSARY=1 npx vitest run src/glossary.gen.test.ts`.\n';
  for (const lang of order.filter(l => l !== 'de' && l !== 'en')) {
    const t = stringsFor(lang as never) as unknown as Record<string, string>;
    const de = stringsFor('de') as unknown as Record<string, string>;
    const en = stringsFor('en') as unknown as Record<string, string>;
    out += `\n## ${LANGUAGE_NAMES[lang as keyof typeof LANGUAGE_NAMES]} (${lang})\n\n| Deutsch | English | ${lang} | Meaning | Reviewed |\n|---|---|---|---|---|\n`;
    for (const [key, note] of TERMS) out += `| ${de[key]} | ${en[key]} | ${t[key]} | ${note} | |\n`;
  }
  writeFileSync('docs/plans/glossary.md', out);
});
