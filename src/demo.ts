import { AppData, Category, Contract, DemoInfo, Entry, Favorite, Goal, MonthKey, MonthRecord, Repeat } from './types';
import { MAX_FAVORITES, addMonths, carryOver, dayInMonth, daysInMonth, monthKeyOf, parseMonthKey, standardCategoryIds, isoDay, dayOfMonth } from './logic';
import { defaultCategories } from './data/defaults';

/*
 * Test data (Optionen → Testdaten): a year of a family's household book, so
 * every screen has something to show — the balances, Statistik, Planen,
 * budgets, contracts, savings pots, favourites, search and tags.
 *
 * A couple with two children: a salary, a mini-job and child benefit; rent,
 * electricity, phone and internet, the car, groceries, the pharmacy, a
 * weekend at Lake Constance and a week at the Baltic Sea. Recurring bills
 * (monthly and yearly, two of them with a price change), one-off spending, a
 * split receipt, an overdue bill and what is still to come this month.
 * Most months leave something over; January (a washing machine), March (the
 * car's service and the electricity bill), July and August (the holiday and
 * a school bag) and December (presents) cost more than came in.
 *
 * It is added beside the user's own data, never instead of it. Everything it
 * adds carries the `demo-` prefix — entries by their series, so the copies a
 * later month carries over go too; favourites, goals and contracts by id —
 * and `AppData.demo` notes the rest: the months it started, the opening it
 * gave the first one, the budgets it set where there were none and the
 * built-in categories it brought back. `removeDemoData` takes exactly that
 * out again. Pure and deterministic for a given day; tested in demo.test.ts.
 * Its names are German when the app is in German and English otherwise.
 */

export const DEMO_PREFIX = 'demo-';
/** Twelve finished months and the running one. */
export const DEMO_MONTHS = 13;
/** What the first month opens with when the test data starts the book. */
export const DEMO_OPENING = 148_000;

const isDemoId = (id: string | undefined) => !!id && id.startsWith(DEMO_PREFIX);
/** A test entry, or a copy of a recurring one carried into a later month. */
export const isDemoEntry = (e: Entry) => isDemoId(e.seriesId) || isDemoId(e.id);

/** Whether the book holds test data (the record, or anything carrying the prefix). */
export function hasDemoData(data: AppData): boolean {
  return !!data.demo
    || data.entries.some(isDemoEntry)
    || (data.favorites ?? []).some(f => isDemoId(f.id))
    || (data.goals ?? []).some(g => isDemoId(g.id));
}

/* ------------------------------------------------------------------ words */

/** A name in German and English; a brand is the same in both. */
type Text = string | { de: string; en: string };
/** German when the app is in German, English in every other language. */
const say = (t: Text, lang: string): string => (typeof t === 'string' ? t : lang === 'de' ? t.de : t.en);

const N = {
  salary: { de: 'Gehalt', en: 'Salary' },
  childBenefit: { de: 'Kindergeld', en: 'Child benefit' },
  minijob: { de: 'Minijob', en: 'Mini-job' },
  bonus: { de: 'Weihnachtsgeld', en: 'Christmas bonus' },
  taxRefund: { de: 'Steuererstattung', en: 'Tax refund' },
  sold: { de: 'Kinderwagen verkauft (Kleinanzeigen)', en: 'Pram sold (Kleinanzeigen)' },
  rent: { de: 'Miete', en: 'Rent' },
  // No currency sign: the book may not be in euros.
  rentNote: { de: 'Kaltmiete 840 + Nebenkosten 250', en: 'Base rent 840 + service charges 250' },
  power: { de: 'Strom (Abschlag)', en: 'Electricity (instalment)' },
  powerBill: { de: 'Strom-Nachzahlung (Jahresabrechnung)', en: 'Electricity top-up (annual bill)' },
  tvLicence: { de: 'Rundfunkbeitrag', en: 'TV licence' },
  ikea: { de: 'IKEA Kinderzimmer', en: "IKEA kids' room" },
  handyman: { de: 'Handwerker-Rechnung', en: 'Handyman bill' },
  internet: { de: 'Vodafone Internet', en: 'Vodafone internet' },
  phone: { de: 'Handyvertrag (O2)', en: 'Phone contract (O2)' },
  fuel: { de: 'Tanken', en: 'Fuel' },
  carWash: { de: 'Waschanlage', en: 'Car wash' },
  parking: { de: 'Parken', en: 'Parking' },
  tyres: { de: 'Reifenwechsel', en: 'Tyre change' },
  service: { de: 'Inspektion (Werkstatt)', en: 'Car service (garage)' },
  carInsurance: { de: 'Kfz-Versicherung', en: 'Car insurance' },
  carTax: { de: 'Kfz-Steuer', en: 'Car tax' },
  market: { de: 'Wochenmarkt', en: 'Market' },
  bakery: { de: 'Bäckerei', en: 'Bakery' },
  kebab: { de: 'Döner', en: 'Kebab' },
  pizzeria: { de: 'Pizzeria', en: 'Pizzeria' },
  cafe: { de: 'Café', en: 'Café' },
  xmasMarket: { de: 'Weihnachtsmarkt', en: 'Christmas market' },
  fishRoll: { de: 'Fischbrötchen', en: 'Fish roll' },
  harbour: { de: 'Restaurant am Hafen', en: 'Harbour restaurant' },
  iceCream: { de: 'Eisdiele', en: 'Ice cream parlour' },
  daycareMeals: { de: 'Kita-Essensgeld', en: 'Daycare meals' },
  nappies: { de: 'Windeln (dm)', en: 'Nappies (dm)' },
  kidsClothes: { de: 'Kinderkleidung', en: "Kids' clothes" },
  toys: { de: 'Spielzeug', en: 'Toys' },
  swimCourse: { de: 'Schwimmkurs', en: 'Swimming lessons' },
  schoolBag: { de: 'Schulranzen', en: 'School bag' },
  gift: { de: 'Geschenk', en: 'Gift' },
  grandmaBirthday: { de: 'Geburtstag Oma', en: "Grandma's birthday" },
  easter: { de: 'Ostern', en: 'Easter' },
  zoo: { de: 'Zoo Frankfurt', en: 'Frankfurt Zoo' },
  xmasGifts: { de: 'Weihnachtsgeschenke', en: 'Christmas presents' },
  pharmacy: { de: 'Apotheke', en: 'Pharmacy' },
  hairdresser: { de: 'Friseur', en: 'Hairdresser' },
  dentist: { de: 'Zahnreinigung', en: 'Dental cleaning' },
  jacket: { de: 'Winterjacke (Zalando)', en: 'Winter jacket (Zalando)' },
  shoes: { de: 'Schuhe (Deichmann)', en: 'Shoes (Deichmann)' },
  washer: { de: 'Waschmaschine (MediaMarkt)', en: 'Washing machine (MediaMarkt)' },
  housewares: { de: 'Haushaltswaren', en: 'Household goods' },
  donation: { de: 'Spende', en: 'Donation' },
  xmasTree: { de: 'Weihnachtsbaum', en: 'Christmas tree' },
  flatDeposit: { de: 'Ferienwohnung Ostsee – Anzahlung', en: 'Baltic Sea holiday flat – deposit' },
  flatRest: { de: 'Ferienwohnung Ostsee – Restzahlung', en: 'Baltic Sea holiday flat – balance' },
  spaTax: { de: 'Kurtaxe und Endreinigung', en: 'Tourist tax and final cleaning' },
  beachChair: { de: 'Strandkorb', en: 'Beach chair' },
  boatTrip: { de: 'Schifffahrt', en: 'Boat trip' },
  souvenirs: { de: 'Souvenirs', en: 'Souvenirs' },
  hansaPark: { de: 'Hansa-Park', en: 'Hansa-Park' },
  hotel: { de: 'Hotel Bodensee (Booking.com)', en: 'Hotel Lake Constance (Booking.com)' },
  xmasTrain: { de: 'Bahntickets Weihnachten', en: 'Train tickets for Christmas' },
  cinema: { de: 'Kino', en: 'Cinema' },
  gym: { de: 'Fitnessstudio', en: 'Gym' },
  pool: { de: 'Schwimmbad', en: 'Swimming pool' },
  contents: { de: 'Hausratversicherung', en: 'Contents insurance' },
  dental: { de: 'Zahnzusatzversicherung', en: 'Dental insurance' },
  liability: { de: 'Haftpflichtversicherung', en: 'Liability insurance' },
  etf: { de: 'ETF-Sparplan', en: 'ETF savings plan' },
  holidayGoal: { de: 'Urlaub', en: 'Holiday' },
  reserveGoal: { de: 'Notgroschen', en: 'Emergency fund' },
  holidayTag: { de: 'urlaub', en: 'holiday' },
} satisfies Record<string, Text>;

/* ------------------------------------------------------------- the plan */

/** The categories the test data writes into (all built-ins). */
export const DEMO_CATEGORIES = [
  'income', 'fixed', 'car', 'extra', 'groceries', 'restaurants', 'family', 'children',
  'clothing', 'shopping', 'telecom', 'mobility', 'travel', 'leisure', 'sport', 'health', 'investment', 'insurance',
] as const;

/** A monthly budget for every spending category it writes into, in cents. */
export const DEMO_LIMITS: Record<string, number> = {
  fixed: 125_000, car: 30_000, extra: 8_000, groceries: 65_000, restaurants: 11_000, family: 10_000, children: 18_000,
  clothing: 8_000, shopping: 5_000, telecom: 6_000, mobility: 10_000, travel: 15_000, leisure: 6_000, sport: 5_000,
  health: 6_000, investment: 30_000, insurance: 3_000,
};

interface Item {
  cat: string;
  name: Text;
  amount: number;
  day: number;
  repeat?: Repeat;
  /** A recurring series' key: the same in every month (`demo-<series>`). */
  series?: string;
  /** Still to come this month: entered open although its day is ahead. */
  planned?: boolean;
  /** Due before today and still unpaid. */
  overdue?: boolean;
  /** Part of the summer holiday. */
  trip?: boolean;
  goal?: 'holiday' | 'reserve';
  note?: Text;
  split?: string;
}

/** A small seeded generator (mulberry32): the same month always gets the same numbers. */
function random(seed: string): () => number {
  let a = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The last working day (Mon–Fri) of a month: payday. */
function lastWorkday(key: MonthKey): number {
  const { year, month } = parseMonthKey(key);
  let d = daysInMonth(key);
  while ([0, 6].includes(new Date(year, month - 1, d).getDay())) d--;
  return d;
}

/** Index (1–12 in the year shown) of the month a dated change starts in: the first with this calendar month. */
function firstIndexOf(first: MonthKey, calendarMonth: number): number {
  for (let i = 1; i < DEMO_MONTHS; i++) if (parseMonthKey(addMonths(first, i)).month === calendarMonth) return i;
  return DEMO_MONTHS;
}

/** What happened in month `i` (0 = a year ago, 12 = the running month). */
function itemsFor(key: MonthKey, i: number, first: MonthKey): Item[] {
  const r = random(`spartopf-demo-${key}`);
  const { year, month: cal } = parseMonthKey(key);
  const dim = daysInMonth(key);
  const payday = lastWorkday(key);
  const eur = (lo: number, hi: number) => Math.round((lo + r() * (hi - lo)) * 100);
  const eur5 = (lo: number, hi: number) => Math.round((lo + r() * (hi - lo)) * 20) * 5;
  const one = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const chance = (p: number) => r() < p;
  const day = (lo = 1, hi = dim) => lo + Math.floor(r() * (hi - lo + 1));
  /**
   * Occasional spending skips one month in every three (by name), so nothing
   * comes exactly once in each of three months running — Planen would take
   * it for a regular payment and report it missing ("fehlt noch").
   */
  const gap = (name: string) => (i + [...name].reduce((h, c) => h + c.charCodeAt(0), 0)) % 3 === 0;
  const sometimes = (p: number, name: string) => chance(p) && !gap(name);
  /** `n` days spread over the month, a little jittered. */
  const spread = (n: number) => Array.from({ length: n }, (_, k) => Math.max(1, Math.min(dim, Math.round(((k + 0.5) * dim) / n + (r() - 0.5) * 2))));

  const raise = 5;
  const powerChange = firstIndexOf(first, 4); // the new instalment after the annual bill in March
  const spotifyChange = 8;
  const items: Item[] = [];
  const add = (it: Item) => items.push(it);

  // Income.
  add({ cat: 'income', name: N.salary, amount: i < raise ? 254_380 : 261_450, day: payday, repeat: 'monthly', series: 'salary' });
  add({ cat: 'income', name: N.childBenefit, amount: year <= 2025 ? 51_000 : 51_800, day: 6, repeat: 'monthly', series: 'child-benefit' });
  // Fewer hours in the holiday month.
  add({ cat: 'income', name: N.minijob, amount: cal === 8 ? 14_000 : 35_000, day: 10, repeat: 'monthly', series: 'minijob' });
  if (cal === 11) add({ cat: 'income', name: N.bonus, amount: 145_000, day: payday, planned: true });
  if (cal === 6) add({ cat: 'income', name: N.taxRefund, amount: 64_218, day: 18 });
  if (cal === 4) add({ cat: 'income', name: N.sold, amount: 12_000, day: 12 });

  // Home.
  add({ cat: 'fixed', name: N.rent, amount: 109_000, day: 1, repeat: 'monthly', series: 'rent', note: N.rentNote });
  add({ cat: 'fixed', name: N.power, amount: i < powerChange ? 8_600 : 9_400, day: 15, repeat: 'monthly', series: 'power' });
  if (cal % 3 === 2) add({ cat: 'fixed', name: N.tvLicence, amount: 5_508, day: 15, planned: true });
  if (i === powerChange - 1) add({ cat: 'fixed', name: N.powerBill, amount: 14_327, day: 22 });
  if (cal === 9) add({ cat: 'fixed', name: N.ikea, amount: 21_490, day: 13 });

  // Phone and internet.
  add({ cat: 'telecom', name: N.internet, amount: 3_999, day: 3, repeat: 'monthly', series: 'internet' });
  add({ cat: 'telecom', name: N.phone, amount: 1_999, day: 18, repeat: 'monthly', series: 'phone' });

  // The car.
  const fills = 3 + (chance(0.5) ? 1 : 0);
  const stations = ['Aral', 'Shell', 'JET', 'Esso'].filter(st => !gap(st));
  for (const d of spread(fills)) add({ cat: 'car', name: one(stations), amount: eur(54, 79), day: d });
  if (sometimes(0.3, 'wash')) add({ cat: 'car', name: N.carWash, amount: one([999, 1_199, 1_499]), day: day() });
  if (sometimes(0.4, 'parking')) add({ cat: 'car', name: N.parking, amount: eur5(2.5, 6), day: day() });
  if (cal === 4 || cal === 10) add({ cat: 'car', name: N.tyres, amount: 4_990, day: 11 });
  if (cal === 3) add({ cat: 'car', name: N.service, amount: 43_860, day: 19 });
  if (cal === 1) add({ cat: 'car', name: N.carInsurance, amount: 51_240, day: 2, repeat: 'yearly', series: 'car-insurance' });
  if (cal === 6) add({ cat: 'car', name: N.carTax, amount: 14_800, day: 14, repeat: 'yearly', series: 'car-tax' });

  // Getting about without the car.
  add({ cat: 'mobility', name: 'Deutschlandticket', amount: year <= 2025 ? 5_800 : 6_300, day: 1, repeat: 'monthly', series: 'ticket' });
  if (sometimes(0.25, 'Deutsche Bahn')) add({ cat: 'mobility', name: 'Deutsche Bahn', amount: eur(19.9, 49.9), day: day() });

  // Groceries: about ten shops a month, more at Christmas, fewer the week away.
  const shops: [Text, number, number][] = [
    ['REWE', 72, 138], ['Aldi Süd', 45, 95], ['Lidl', 32, 78], ['dm', 18, 48], ['REWE', 72, 138], ['Aldi Süd', 45, 95],
    ['Edeka', 16, 42], ['Lidl', 32, 78], [N.market, 14, 28], ['dm', 18, 48], ['REWE', 60, 120],
  ];
  // The shops that come once a month take turns with others.
  if (gap('Edeka')) shops[6] = ['Penny', 16, 42];
  if (gap('market')) shops[8] = ['Kaufland', 24, 56];
  for (let k = shops.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [shops[k], shops[j]] = [shops[j], shops[k]]; }
  const trips = 10 + (chance(0.45) ? 1 : 0) - (cal === 8 ? 2 : 0);
  const festive = cal === 12 ? 1.22 : 1;
  spread(trips).forEach((d, k) => {
    const [name, lo, hi] = shops[k % shops.length];
    add({ cat: 'groceries', name, amount: Math.round(eur(lo, hi) * festive), day: d });
  });

  // Eating out.
  for (let k = 3 + Math.floor(r() * 3); k > 0; k--) add({ cat: 'restaurants', name: N.bakery, amount: eur5(3.6, 8.9), day: day() });
  if (sometimes(0.7, 'kebab')) add({ cat: 'restaurants', name: N.kebab, amount: eur5(7.5, 16), day: day() });
  if (sometimes(0.35, 'kebab')) add({ cat: 'restaurants', name: N.kebab, amount: eur5(7.5, 16), day: day() });
  if (sometimes(0.55, 'pizzeria')) add({ cat: 'restaurants', name: N.pizzeria, amount: eur(28, 46), day: day() });
  if (sometimes(0.45, 'Lieferando')) add({ cat: 'restaurants', name: 'Lieferando', amount: eur(22, 39), day: day() });
  if (sometimes(0.4, 'cafe')) add({ cat: 'restaurants', name: N.cafe, amount: eur5(8.4, 14.8), day: day() });
  if (sometimes(0.35, "McDonald's")) add({ cat: 'restaurants', name: "McDonald's", amount: eur(17, 27), day: day() });
  if (cal === 12) add({ cat: 'restaurants', name: N.xmasMarket, amount: 3_200, day: 13 });

  // The children.
  add({ cat: 'children', name: N.daycareMeals, amount: 6_200, day: 5, repeat: 'monthly', series: 'daycare' });
  for (const d of spread(2)) add({ cat: 'children', name: N.nappies, amount: one([1_695, 1_795, 1_995, 2_245]), day: d });
  if (sometimes(0.35, 'kids clothes')) add({ cat: 'children', name: N.kidsClothes, amount: eur(19.99, 49.99), day: day() });
  if (sometimes(0.25, 'toys')) add({ cat: 'children', name: N.toys, amount: eur(9.99, 34.99), day: day() });
  if (cal === 5) add({ cat: 'children', name: N.swimCourse, amount: 12_000, day: 7 });
  if (cal === 7) add({ cat: 'children', name: N.schoolBag, amount: 18_900, day: 20 });

  // Family.
  if (sometimes(0.4, 'gift')) add({ cat: 'family', name: N.gift, amount: eur(20, 60), day: day() });
  if (cal === 3) add({ cat: 'family', name: N.grandmaBirthday, amount: 4_000, day: 8 });
  if (cal === 4) add({ cat: 'family', name: N.easter, amount: 3_500, day: 4 });
  if (cal === 9) add({ cat: 'family', name: N.zoo, amount: 5_200, day: 14 });
  if (cal === 12) {
    add({ cat: 'family', name: N.xmasGifts, amount: 18_490, day: 6 });
    add({ cat: 'family', name: N.xmasGifts, amount: 12_990, day: 18 });
  }

  // Health.
  for (let k = 1 + (chance(0.5) || gap('pharmacy') ? 1 : 0); k > 0; k--) add({ cat: 'health', name: N.pharmacy, amount: eur(5.95, 29.8), day: day() });
  if (cal % 2 === 0) add({ cat: 'health', name: N.hairdresser, amount: eur5(24, 32), day: day() });
  if (cal === 2) add({ cat: 'health', name: N.dentist, amount: 8_500, day: 17 });

  // Clothes and bigger purchases.
  const store = one(['H&M', 'C&A', 'Deichmann', 'Zalando']);
  if (sometimes(0.45, store)) add({ cat: 'clothing', name: store, amount: eur(24.99, 89.9), day: day() });
  if (cal === 10) add({ cat: 'clothing', name: N.jacket, amount: 12_999, day: 8 });
  if (cal === 4) add({ cat: 'clothing', name: N.shoes, amount: 5_995, day: 16 });
  if (cal === 1) add({ cat: 'shopping', name: N.washer, amount: 44_900, day: 21 });

  // Everything else.
  for (let k = 1 + (chance(0.5) || gap('Amazon') ? 1 : 0); k > 0; k--) add({ cat: 'extra', name: 'Amazon', amount: eur(12.99, 46.9), day: day() });
  if (sometimes(0.2, 'housewares')) add({ cat: 'extra', name: N.housewares, amount: eur(8, 25), day: day() });
  if (cal === 9) add({ cat: 'extra', name: 'Amazon Prime', amount: 8_990, day: 9, repeat: 'yearly', series: 'prime' });
  if (cal === 12) {
    add({ cat: 'extra', name: N.xmasTree, amount: 4_500, day: 12 });
    add({ cat: 'extra', name: N.donation, amount: 3_000, day: 20 });
  }

  // Trips: a weekend at Lake Constance in May, a week at the Baltic Sea in August.
  if (cal === 2) add({ cat: 'travel', name: N.flatDeposit, amount: 30_000, day: 9, trip: true });
  if (cal === 5) add({ cat: 'travel', name: N.hotel, amount: 28_900, day: 24 });
  if (cal === 7) add({ cat: 'travel', name: N.flatRest, amount: 69_000, day: 1, trip: true });
  if (cal === 8) {
    add({ cat: 'travel', name: N.spaTax, amount: 14_500, day: 9, trip: true });
    add({ cat: 'travel', name: N.beachChair, amount: 4_500, day: 11, trip: true });
    add({ cat: 'travel', name: N.hansaPark, amount: 15_200, day: 13, trip: true });
    add({ cat: 'travel', name: N.boatTrip, amount: 8_400, day: 12, trip: true });
    add({ cat: 'extra', name: N.souvenirs, amount: 3_650, day: 14, trip: true });
    add({ cat: 'car', name: 'Aral', amount: 7_412, day: 8, trip: true });
    add({ cat: 'car', name: 'Shell', amount: 6_985, day: 15, trip: true });
    add({ cat: 'restaurants', name: N.fishRoll, amount: 1_450, day: 10, trip: true });
    add({ cat: 'restaurants', name: N.harbour, amount: 6_840, day: 12, trip: true });
    add({ cat: 'restaurants', name: N.iceCream, amount: 1_450, day: 14, trip: true });
  }
  if (cal === 12) add({ cat: 'travel', name: N.xmasTrain, amount: 15_980, day: 2 });

  // Leisure and sport.
  add({ cat: 'leisure', name: 'Netflix', amount: 1_399, day: 12, repeat: 'monthly', series: 'netflix' });
  add({ cat: 'leisure', name: 'Spotify Family', amount: i < spotifyChange ? 1_799 : 1_999, day: 21, repeat: 'monthly', series: 'spotify' });
  if (sometimes(0.3, 'cinema')) add({ cat: 'leisure', name: N.cinema, amount: eur(24, 38), day: day() });
  add({ cat: 'sport', name: N.gym, amount: 2_990, day: 1, repeat: 'monthly', series: 'gym' });
  if (sometimes(0.3, 'pool')) add({ cat: 'sport', name: N.pool, amount: eur5(12, 18.5), day: day() });

  // Insurance.
  add({ cat: 'insurance', name: N.contents, amount: 847, day: 15, repeat: 'monthly', series: 'contents' });
  add({ cat: 'insurance', name: N.dental, amount: 1_890, day: 1, repeat: 'monthly', series: 'dental' });
  if (cal === 2) add({ cat: 'insurance', name: N.liability, amount: 6_490, day: 1, repeat: 'yearly', series: 'liability' });

  // Saving: an ETF plan, the holiday pot from the fourth month on, the emergency fund with the tax refund.
  add({ cat: 'investment', name: N.etf, amount: 15_000, day: 16, repeat: 'monthly', series: 'etf' });
  if (i >= 3) add({ cat: 'investment', name: N.holidayGoal, amount: 10_000, day: 16, repeat: 'monthly', series: 'holiday-pot', goal: 'holiday' });
  if (cal === 6) add({ cat: 'investment', name: N.reserveGoal, amount: 30_000, day: 20, goal: 'reserve' });

  // Last month: one receipt split between groceries and household goods.
  if (i === DEMO_MONTHS - 2) {
    add({ cat: 'groceries', name: 'Kaufland', amount: 6_142, day: 17, split: 'kaufland' });
    add({ cat: 'extra', name: 'Kaufland', amount: 2_295, day: 17, split: 'kaufland' });
  }
  return items;
}

/* ------------------------------------------------------------------ build */

const noon = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
};

/** The test year's entries, the running month as of `today`; named in German for `de`, else in English. */
export function demoEntries(today = new Date(), language = 'de'): Entry[] {
  const running = monthKeyOf(today);
  const first = addMonths(running, -(DEMO_MONTHS - 1));
  const todayDay = today.getDate();
  const holiday = goalName(first, language);
  const out: Entry[] = [];
  for (let i = 0; i < DEMO_MONTHS; i++) {
    const key = addMonths(first, i);
    const items = itemsFor(key, i, first);
    if (key === running && dayOfMonth(today) >= 4) {
      const due = new Date(today.getFullYear(), today.getMonth(), todayDay - 3).getDate();
      items.push({ cat: 'fixed', name: N.handyman, amount: 18_450, day: due, overdue: true });
    }
    let n = 0;
    for (const it of items) {
      const date = dayInMonth(key, it.day);
      let paid = true;
      if (key === running) {
        const recurring = it.repeat === 'monthly' || it.repeat === 'yearly';
        // By the date, not the day's number: a month from payday runs across two calendar months (plan 32).
        const past = date <= isoDay(today);
        if (!past && !recurring && !it.planned) continue; // hasn't happened yet
        paid = past && !it.overdue;
      }
      const id = `${DEMO_PREFIX}${key}-${++n}`;
      const at = noon(date);
      const e: Entry = {
        id,
        month: key,
        categoryId: it.cat,
        name: it.goal === 'holiday' ? holiday : say(it.name, language),
        amount: it.amount,
        paid,
        repeat: it.repeat ?? 'none',
        seriesId: it.series ? `${DEMO_PREFIX}${it.series}` : id,
        createdAt: at + n,
        date,
      };
      if (paid) e.paidAt = at;
      if (it.note) e.note = say(it.note, language);
      if (it.trip) e.tags = [say(N.holidayTag, language)];
      if (it.goal) e.goalId = `${DEMO_PREFIX}goal-${it.goal}`;
      if (it.split) e.splitId = `${DEMO_PREFIX}split-${it.split}`;
      out.push(e);
    }
  }
  return out;
}

/** "Urlaub 2027": the holiday the pot saves for, the summer after the running month. */
function goalName(first: MonthKey, language: string): string {
  const year = parseMonthKey(addMonths(first, DEMO_MONTHS + 8)).year;
  return `${say(N.holidayGoal, language)} ${year}`;
}

function demoGoals(first: MonthKey, language: string): Goal[] {
  const created = (k: MonthKey) => noon(`${k}-01`);
  return [
    {
      id: `${DEMO_PREFIX}goal-holiday`, name: goalName(first, language), emoji: '🏖️', hue: 'sky',
      target: 180_000, due: addMonths(first, DEMO_MONTHS + 8), createdAt: created(addMonths(first, 3)),
    },
    {
      id: `${DEMO_PREFIX}goal-reserve`, name: say(N.reserveGoal, language), emoji: '🛟', hue: 'leaf',
      target: 600_000, start: 240_000, createdAt: created(first),
    },
  ];
}

function demoFavorites(language: string): Favorite[] {
  const fav = (n: number, name: Text, categoryId: string, amount?: number): Favorite =>
    ({ id: `${DEMO_PREFIX}fav-${n}`, name: say(name, language), categoryId, ...(amount ? { amount } : {}) });
  return [
    fav(1, N.bakery, 'restaurants', 480),
    fav(2, N.fuel, 'car'),
    fav(3, 'REWE', 'groceries'),
    fav(4, N.pharmacy, 'health'),
    fav(5, N.kebab, 'restaurants', 850),
    fav(6, N.nappies, 'children', 1_795),
    fav(7, N.parking, 'car', 300),
  ];
}

/** Contract details for the recurring bills: notice periods, and ends that fall due soon. */
function demoContracts(today: Date, first: MonthKey): Record<string, Contract> {
  const s = (key: string) => `${DEMO_PREFIX}${key}`;
  const running = monthKeyOf(today);
  // Late in the month, the gym's deadline moves to the next one, so it is always still ahead.
  const gymEnds = addMonths(running, today.getDate() > 20 ? 4 : 3);
  const march = addMonths(first, firstIndexOf(first, 4) - 1);
  return {
    [s('rent')]: { notice: 3 },
    // The electricity year runs April to March; renewing yearly, one month's notice.
    [s('power')]: { end: dayInMonth(march, 31), renews: 12, notice: 1 },
    // Past its minimum term: renews month by month.
    [s('internet')]: { end: dayInMonth(addMonths(running, 4), 14), renews: 1, notice: 1 },
    // Ends in two months, one month's notice: cancel by next month.
    [s('phone')]: { end: dayInMonth(addMonths(running, 2), 18), renews: 12, notice: 1 },
    // Three months' notice: the deadline comes up within weeks.
    [s('gym')]: { end: dayInMonth(gymEnds, 31), renews: 12, notice: 3 },
    // Car insurance runs with the calendar year: cancel by 30 November.
    [s('car-insurance')]: { end: `${parseMonthKey(first).year - 1}-12-31`, renews: 12, notice: 1 },
  };
}

const byKey = (a: MonthRecord, b: MonthRecord) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

/**
 * The book with a year of test data beside what is already there: months it
 * needs are started (the first with an opening balance when nothing comes
 * before it), categories without a budget get one, missing built-ins come
 * back. Returns the book unchanged when it already holds test data.
 */
export function addDemoData(data: AppData, { today = new Date(), language = 'de' }: { today?: Date; language?: string } = {}): AppData {
  if (hasDemoData(data)) return data;
  const running = monthKeyOf(today);
  const first = addMonths(running, -(DEMO_MONTHS - 1));

  // Categories: bring back any built-in it writes into, give spending ones without a budget a budget.
  const shipped = new Map(defaultCategories().map(c => [c.id, c]));
  const have = new Set(data.categories.map(c => c.id));
  const restored = DEMO_CATEGORIES.filter(id => !have.has(id));
  const limits: Record<string, number> = {};
  const categories: Category[] = [...data.categories, ...restored.map(id => shipped.get(id)!)].map(c => {
    const want = DEMO_LIMITS[c.id];
    if (!want || c.kind !== 'expense' || c.limit) return c;
    limits[c.id] = want;
    return { ...c, limit: want };
  });

  // Entries, and copies of the monthly ones in months the user already started after this one.
  const entries = demoEntries(today, language);
  const monthly = entries.filter(e => e.month === running && e.repeat === 'monthly');
  for (const m of data.months) {
    if (m.key <= running) continue;
    let n = 0;
    entries.push(...carryOver(monthly, m.key, today.getTime(), () => `${DEMO_PREFIX}${m.key}-c${++n}`));
  }

  // Months: the ones the book doesn't have yet.
  const existing = new Set(data.months.map(m => m.key));
  const standard = standardCategoryIds(categories);
  const started: MonthRecord[] = [];
  for (let i = 0; i < DEMO_MONTHS; i++) {
    const key = addMonths(first, i);
    if (existing.has(key)) continue;
    const used = entries.filter(e => e.month === key).map(e => e.categoryId);
    started.push({ key, startedAt: noon(`${key}-01`), categories: [...new Set([...standard, ...used])] });
  }
  let opening: DemoInfo['opening'];
  if (!existing.has(first) && !data.months.some(m => m.key < first)) {
    started[0].opening = DEMO_OPENING;
    opening = { month: first, amount: DEMO_OPENING };
  }

  // Favourites up to the cap, without doubling one the user already has.
  const favorites = [...(data.favorites ?? [])];
  for (const f of demoFavorites(language)) {
    if (favorites.length >= MAX_FAVORITES) break;
    if (!favorites.some(x => x.name === f.name && x.categoryId === f.categoryId)) favorites.push(f);
  }

  const demo: DemoInfo = {
    addedAt: today.getTime(),
    months: started.map(m => m.key),
    ...(opening ? { opening } : {}),
    limits,
    categories: restored,
  };
  return {
    ...data,
    categories,
    entries: [...data.entries, ...entries],
    months: [...data.months, ...started].sort(byKey),
    contracts: { ...data.contracts, ...demoContracts(today, first) },
    ...(favorites.length ? { favorites } : {}),
    goals: [...(data.goals ?? []), ...demoGoals(first, language)],
    demo,
  };
}

/**
 * The book without its test data: the test entries (and every copy carried
 * from them), favourites, goals and contracts; the months it started, unless
 * the user has put entries of their own in one (then only its opening goes);
 * empty months started while it was there (the next month, started by
 * itself); the budgets it set, unless the user changed them since; the
 * categories it brought back, unless something of the user's is in them.
 */
export function removeDemoData(data: AppData): AppData {
  const info = data.demo;
  const entries = data.entries
    .filter(e => !isDemoEntry(e))
    .map(e => {
      if (!isDemoId(e.goalId)) return e;
      const { goalId: _goal, ...rest } = e;
      return rest;
    });
  const withEntries = new Set(entries.map(e => e.month));
  const startedByDemo = new Set(info?.months ?? []);
  const months = data.months.flatMap(m => {
    const mine = withEntries.has(m.key);
    const startedWhile = !!info && m.startedAt >= info.addedAt && m.opening === undefined;
    if (!mine && (startedByDemo.has(m.key) || startedWhile)) return [];
    if (startedByDemo.has(m.key) && info?.opening?.month === m.key && m.opening === info.opening.amount) {
      const { opening: _opening, ...rest } = m;
      return [rest];
    }
    return [m];
  });
  const favorites = (data.favorites ?? []).filter(f => !isDemoId(f.id));
  const goals = (data.goals ?? []).filter(g => !isDemoId(g.id));
  const contracts = Object.fromEntries(Object.entries(data.contracts ?? {}).filter(([id]) => !isDemoId(id)));
  const restored = new Set(info?.categories ?? []);
  const used = new Set([...entries.map(e => e.categoryId), ...favorites.map(f => f.categoryId)]);
  const categories = data.categories
    .filter(c => !(restored.has(c.id) && !used.has(c.id)))
    .map(c => {
      const set = info?.limits[c.id];
      if (set === undefined || c.limit !== set) return c;
      const { limit: _limit, ...rest } = c;
      return rest;
    });
  const { demo: _demo, contracts: _contracts, favorites: _favorites, goals: _goals, ...rest } = data;
  return {
    ...rest,
    categories,
    entries,
    months,
    ...(Object.keys(contracts).length ? { contracts } : {}),
    ...(favorites.length ? { favorites } : {}),
    ...(goals.length ? { goals } : {}),
  };
}
