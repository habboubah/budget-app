import { Category, Names } from '../types';
import { CATEGORY_NAMES, withLanguages } from './names';

/**
 * The categories a first launch starts with, in the order the month page
 * reads: income first, then home (rent and what goes out every month), the
 * car, others, groceries and the family — the columns of My_expense.xlsx —
 * with restaurants (schema 5) beside the groceries and the children's
 * expenses (schema 8) beside the family. These eight are part of every new
 * month.
 *
 * Ids are history: `fixed` is "Wohnen / Home" and `extra` is "Sonstiges /
 * Others" (schema 4 merged the former "Wohnen und Garten" and "Sonstiges"
 * into them), so entries, statistics and the Excel mapping carry on.
 *
 * After them, the usual categories of a German banking app (Bekleidung,
 * Mobilität, Geldanlage …): there to pick when entering something, or to
 * switch on for every month in Settings, but not in a new month by default —
 * a page of fifteen empty cards is not simple. Their colours stay off the
 * main ones above (two or three share each of the other hues; only telecom
 * shares mint with the restaurants), so a chart rarely paints one of them
 * like a main category.
 *
 * Everything here can be renamed, recoloured, reordered or deleted in
 * Settings, and brought back with "Standard wiederherstellen".
 *
 * Names in German, English and Arabic here; the other eleven languages come
 * from data/names.ts (schema 19 gives them to built-ins still named as shipped).
 */
const SHIPPED: Category[] = [
  { id: 'income', names: { de: 'Einkommen', en: 'Income', ar: 'الدخل' }, emoji: '💰', hue: 'leaf', kind: 'income', repeat: 'monthly', builtin: true },
  { id: 'fixed', names: { de: 'Wohnen', en: 'Home', ar: 'المنزل' }, emoji: '🏠', hue: 'sky', kind: 'expense', repeat: 'monthly', budget: 'need', builtin: true },
  { id: 'car', names: { de: 'Auto', en: 'Car', ar: 'السيارة' }, emoji: '🚗', hue: 'carrot', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },
  { id: 'extra', names: { de: 'Sonstiges', en: 'Others', ar: 'أخرى' }, emoji: '📦', hue: 'lavender', kind: 'expense', repeat: 'none', budget: 'want', builtin: true },
  { id: 'groceries', names: { de: 'Lebensmittel und Drogerie', en: 'Groceries & drugstore', ar: 'البقالة والعناية الشخصية' }, emoji: '🛒', hue: 'lime', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },
  { id: 'restaurants', names: { de: 'Restaurants', en: 'Restaurants', ar: 'المطاعم' }, emoji: '🍽️', hue: 'mint', kind: 'expense', repeat: 'none', budget: 'want', builtin: true },
  { id: 'family', names: { de: 'Familie', en: 'Family', ar: 'العائلة' }, emoji: '👨‍👩‍👦', hue: 'berry', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },
  { id: 'children', names: { de: 'Kinder', en: 'Children', ar: 'الأطفال' }, emoji: '🧸', hue: 'lemon', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },

  { id: 'clothing', names: { de: 'Bekleidung', en: 'Clothing', ar: 'الملابس' }, emoji: '👕', hue: 'plum', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'shopping', names: { de: 'Einkäufe', en: 'Shopping', ar: 'المشتريات' }, emoji: '🛍️', hue: 'stone', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'telecom', names: { de: 'Telekommunikation', en: 'Phone & internet', ar: 'الاتصالات' }, emoji: '📞', hue: 'mint', kind: 'expense', repeat: 'monthly', budget: 'need', standard: false, builtin: true },
  { id: 'mobility', names: { de: 'Mobilität', en: 'Transport', ar: 'المواصلات' }, emoji: '🚌', hue: 'blue', kind: 'expense', repeat: 'none', budget: 'need', standard: false, builtin: true },
  { id: 'travel', names: { de: 'Reisen', en: 'Travel', ar: 'السفر' }, emoji: '🌍', hue: 'sand', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'leisure', names: { de: 'Freizeit und Unterhaltung', en: 'Leisure & entertainment', ar: 'الترفيه والتسلية' }, emoji: '🎭', hue: 'tomato', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'sport', names: { de: 'Sport und Hobby', en: 'Sport & hobbies', ar: 'الرياضة والهوايات' }, emoji: '⚽', hue: 'plum', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'health', names: { de: 'Gesundheit und Wellness', en: 'Health & wellness', ar: 'الصحة والعافية' }, emoji: '🩺', hue: 'tomato', kind: 'expense', repeat: 'none', budget: 'need', standard: false, builtin: true },
  { id: 'education', names: { de: 'Bildung und Erziehung', en: 'Education & childcare', ar: 'التعليم والتربية' }, emoji: '🎓', hue: 'stone', kind: 'expense', repeat: 'none', budget: 'need', standard: false, builtin: true },
  { id: 'investment', names: { de: 'Geldanlage', en: 'Investments', ar: 'الاستثمار' }, emoji: '🐷', hue: 'sand', kind: 'expense', repeat: 'monthly', budget: 'save', standard: false, builtin: true },
  { id: 'insurance', names: { de: 'Versicherungen', en: 'Insurance', ar: 'التأمين' }, emoji: '🛡️', hue: 'lemon', kind: 'expense', repeat: 'monthly', budget: 'need', standard: false, builtin: true },
  { id: 'cash', names: { de: 'Bargeld', en: 'Cash', ar: 'النقد' }, emoji: '🪙', hue: 'lemon', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'taxes', names: { de: 'Steuern und Gebühren', en: 'Taxes & fees', ar: 'الضرائب والرسوم' }, emoji: '🏛️', hue: 'blue', kind: 'expense', repeat: 'none', budget: 'need', standard: false, builtin: true },
];

const CATEGORIES: Category[] = SHIPPED.map(c => ({ ...c, names: withLanguages(c.names, CATEGORY_NAMES, c.id) }));

/** A fresh copy of the built-in categories. */
export function defaultCategories(): Category[] {
  return CATEGORIES.map(c => ({ ...c, names: { ...c.names } }));
}

/** The category orphaned entries (from an old backup) are put into: "Sonstiges". */
export const OTHER_CATEGORY: Category = CATEGORIES.find(c => c.id === 'extra')!;

/**
 * Schema 2 (the banking-app categories). Data saved before it gets the new
 * built-ins appended, and the built-ins whose look changed are updated —
 * field by field, only where the user still has what the app shipped.
 */
export const NEW_IN_V2 = [
  'clothing', 'shopping', 'telecom', 'mobility', 'travel', 'leisure', 'sport', 'health', 'education',
  'investment', 'insurance', 'cash', 'taxes',
];
export const SHIPPED_V1: Record<string, Partial<Pick<Category, 'names' | 'emoji'>>> = {
  groceries: { names: { de: 'Einkaufen', en: 'Groceries' } },
  extra: { emoji: '🛍️' },
};

/**
 * Schema 4: "Wohnen" replaces "Fixkosten" (and takes in "Wohnen und Garten"),
 * "Sonstiges" replaces "Sonderkosten" (and takes in the old "Sonstiges"),
 * "Absicherung und Vorsorge" becomes "Versicherungen". `MERGED_V4` maps a
 * category that is gone to the one its entries move into; `SHIPPED_V3` holds
 * the names and emoji to replace where the user still has them.
 */
export const MERGED_V4: Record<string, string> = { home: 'fixed', other: 'extra' };
export const SHIPPED_V3: Record<string, { names: Names; emoji?: string[] }> = {
  fixed: { names: { de: 'Fixkosten', en: 'Fixed costs', ar: 'التكاليف الثابتة' } },
  extra: { names: { de: 'Sonderkosten', en: 'Extras', ar: 'مصاريف إضافية' }, emoji: ['🧾', '🛍️'] },
  insurance: { names: { de: 'Absicherung und Vorsorge', en: 'Insurance & pensions', ar: 'التأمين والتقاعد' } },
};

/**
 * Main categories added after the first release — "Restaurants" (schema 5),
 * "Kinder" (schema 8). Data saved before gets each one after its neighbour —
 * unless the user already made one of their own under one of these names —
 * and so do the running month and any later one already started; months
 * before keep the categories they had.
 */
export const NEW_MAIN: { id: string; since: number; after: string; aliases: string[] }[] = [
  { id: 'restaurants', since: 5, after: 'groceries', aliases: ['restaurant', 'restaurants', 'restaurants und cafes', 'essen gehen', 'gastronomie', 'مطعم', 'مطاعم', 'المطاعم'] },
  { id: 'children', since: 8, after: 'family', aliases: ['kinder', 'kind', 'kids', 'children', 'child', 'kinderausgaben', 'baby', 'babys', 'طفل', 'أطفال', 'الأطفال'] },
];

/**
 * Schema 6: Einkommen gets a money bag (💰) instead of the banknote, which
 * read like money going out — where the user still has the banknote.
 */
export const SHIPPED_V5: Record<string, { emoji: string[] }> = {
  income: { emoji: ['💶'] },
};

/** Built-in expense categories that are basic needs, for data saved before `budget` existed. */
const NEED_IDS = ['fixed', 'car', 'groceries', 'family'];
/** Need, want or saving: the category's own choice, else the built-in default, else want. */
export const budgetOf = (c: Category) => c.budget ?? (NEED_IDS.includes(c.id) ? 'need' : 'want');

/**
 * Names offered in the entry sheet before the user has a history of their
 * own. A brand is the same in every language, so it carries one name; the
 * eleven languages beyond German, English and Arabic add theirs when they load
 * (`addSuggestionNames`).
 */
const SUGGESTIONS: Record<string, Names[]> = {
  income: [
    { de: 'Gehalt', en: 'Salary', ar: 'راتب' }, { de: 'Kindergeld', en: 'Child benefit', ar: 'إعانة الأطفال' }, { de: 'Elterngeld', en: 'Parental allowance', ar: 'إعانة الوالدين' },
    { de: 'Nebenjob', en: 'Side job', ar: 'عمل جانبي' }, { de: 'Erstattung', en: 'Refund', ar: 'استرداد' }, { de: 'Zinsen', en: 'Interest', ar: 'فوائد' },
  ],
  fixed: [
    { de: 'Miete', en: 'Rent', ar: 'إيجار' }, { de: 'Strom', en: 'Electricity', ar: 'كهرباء' }, { de: 'Gas', en: 'Gas', ar: 'غاز' }, { de: 'Internet', en: 'Internet', ar: 'إنترنت' },
    { de: 'Handy', en: 'Mobile phone', ar: 'هاتف محمول' }, { de: 'Rundfunkbeitrag', en: 'TV licence', ar: 'رسوم البث' }, { de: 'Versicherung', en: 'Insurance', ar: 'تأمين' },
    { de: 'Fitnessstudio', en: 'Gym', ar: 'نادٍ رياضي' }, { de: 'Streaming', en: 'Streaming', ar: 'بث' }, { de: 'Kontogebühren', en: 'Bank fees', ar: 'رسوم البنك' },
    { de: 'Cloud-Speicher', en: 'Cloud storage', ar: 'تخزين سحابي' }, { de: 'Nebenkosten', en: 'Service charges', ar: 'تكاليف إضافية للسكن' },
    { de: 'IKEA' }, { de: 'Möbel', en: 'Furniture', ar: 'أثاث' }, { de: 'Haushaltswaren', en: 'Household goods', ar: 'أدوات منزلية' },
  ],
  car: [
    { de: 'Tanken', en: 'Fuel', ar: 'وقود' }, { de: 'Kfz-Versicherung', en: 'Car insurance', ar: 'تأمين السيارة' }, { de: 'Kfz-Steuer', en: 'Car tax', ar: 'ضريبة السيارة' },
    { de: 'Parken', en: 'Parking', ar: 'موقف سيارات' }, { de: 'Werkstatt', en: 'Garage', ar: 'ورشة' }, { de: 'Waschanlage', en: 'Car wash', ar: 'غسيل السيارة' }, { de: 'TÜV', en: 'MOT', ar: 'الفحص الفني' },
  ],
  extra: [
    { de: 'Amazon' }, { de: 'Kleidung', en: 'Clothes', ar: 'ملابس' }, { de: 'Apotheke', en: 'Pharmacy', ar: 'صيدلية' },
    { de: 'Geschenk', en: 'Gift', ar: 'هدية' }, { de: 'Arzt', en: 'Doctor', ar: 'طبيب' }, { de: 'Online-Kurs', en: 'Online course', ar: 'دورة عبر الإنترنت' },
  ],
  groceries: [
    { de: 'Lidl' }, { de: 'Aldi' }, { de: 'Rewe' }, { de: 'Edeka' }, { de: 'Kaufland' }, { de: 'Penny' }, { de: 'Netto' },
    { de: 'Rossmann' }, { de: 'dm' }, { de: 'Wochenmarkt', en: 'Market', ar: 'سوق' },
  ],
  restaurants: [
    { de: 'Restaurant', en: 'Restaurant', ar: 'مطعم' }, { de: 'Café', en: 'Café', ar: 'مقهى' }, { de: 'Bäckerei', en: 'Bakery', ar: 'مخبز' },
    { de: 'Döner', en: 'Kebab', ar: 'دونر' }, { de: 'Pizzeria', en: 'Pizza', ar: 'بيتزا' }, { de: 'Imbiss', en: 'Takeaway', ar: 'وجبات سريعة' },
    { de: 'Lieferando' }, { de: 'Wolt' }, { de: "McDonald's" }, { de: 'Burger King' }, { de: 'Starbucks' },
  ],
  family: [
    { de: 'Ausflug', en: 'Day out', ar: 'نزهة' }, { de: 'Geschenk', en: 'Gift', ar: 'هدية' }, { de: 'Familienfeier', en: 'Family celebration', ar: 'حفلة عائلية' },
    { de: 'Besuch', en: 'Visit', ar: 'زيارة' }, { de: 'Haushaltshilfe', en: 'Home help', ar: 'مساعدة منزلية' },
  ],
  children: [
    { de: 'Windeln', en: 'Nappies', ar: 'حفاضات' }, { de: 'Babynahrung', en: 'Baby food', ar: 'طعام الأطفال' }, { de: 'Kinderkleidung', en: "Kids' clothes", ar: 'ملابس الأطفال' },
    { de: 'Spielzeug', en: 'Toys', ar: 'ألعاب' }, { de: 'Kita', en: 'Daycare', ar: 'روضة' }, { de: 'Schulsachen', en: 'School supplies', ar: 'أدوات مدرسية' },
    { de: 'Taschengeld', en: 'Pocket money', ar: 'مصروف الجيب' }, { de: 'Babysitter', en: 'Babysitter', ar: 'جليسة أطفال' }, { de: 'Kinderwagen', en: 'Pram', ar: 'عربة أطفال' },
  ],
  clothing: [
    { de: 'C&A' }, { de: 'H&M' }, { de: 'Zalando' }, { de: 'Primark' }, { de: 'Deichmann' },
    { de: 'Schuhe', en: 'Shoes', ar: 'أحذية' }, { de: 'Jacke', en: 'Jacket', ar: 'سترة' },
  ],
  shopping: [
    { de: 'Amazon' }, { de: 'MediaMarkt' }, { de: 'Otto' }, { de: 'eBay' }, { de: 'Kleinanzeigen' },
    { de: 'Elektronik', en: 'Electronics', ar: 'إلكترونيات' }, { de: 'Geschenk', en: 'Gift', ar: 'هدية' },
  ],
  telecom: [
    { de: 'Vodafone' }, { de: 'Telekom' }, { de: 'O2' }, { de: '1&1' }, { de: 'Handyvertrag', en: 'Phone contract', ar: 'عقد الهاتف' },
    { de: 'Internet', en: 'Internet', ar: 'إنترنت' },
  ],
  mobility: [
    { de: 'Deutschlandticket' }, { de: 'Deutsche Bahn' }, { de: 'RMV' }, { de: 'Taxi' }, { de: 'Uber' },
    { de: 'Fahrrad', en: 'Bike', ar: 'دراجة' }, { de: 'Carsharing', en: 'Car sharing', ar: 'مشاركة السيارات' },
  ],
  travel: [
    { de: 'Hotel', en: 'Hotel', ar: 'فندق' }, { de: 'Flug', en: 'Flight', ar: 'رحلة طيران' }, { de: 'Ferienwohnung', en: 'Holiday flat', ar: 'شقة عطلات' },
    { de: 'Booking.com' }, { de: 'Urlaub', en: 'Holiday', ar: 'عطلة' }, { de: 'Mietwagen', en: 'Rental car', ar: 'سيارة مستأجرة' },
  ],
  leisure: [
    { de: 'Netflix' }, { de: 'Spotify' }, { de: 'Kino', en: 'Cinema', ar: 'سينما' },
    { de: 'Konzert', en: 'Concert', ar: 'حفلة' }, { de: 'Museum', en: 'Museum', ar: 'متحف' }, { de: 'Freizeitpark', en: 'Theme park', ar: 'مدينة ملاهٍ' },
  ],
  sport: [
    { de: 'Fitnessstudio', en: 'Gym', ar: 'نادٍ رياضي' }, { de: 'Verein', en: 'Club', ar: 'نادٍ' }, { de: 'Schwimmbad', en: 'Swimming pool', ar: 'مسبح' },
    { de: 'Sportausrüstung', en: 'Sports gear', ar: 'معدات رياضية' }, { de: 'Decathlon' },
  ],
  health: [
    { de: 'Apotheke', en: 'Pharmacy', ar: 'صيدلية' }, { de: 'Arzt', en: 'Doctor', ar: 'طبيب' }, { de: 'Zahnarzt', en: 'Dentist', ar: 'طبيب أسنان' },
    { de: 'Brille', en: 'Glasses', ar: 'نظارات' }, { de: 'Friseur', en: 'Hairdresser', ar: 'حلاق' }, { de: 'Physiotherapie', en: 'Physiotherapy', ar: 'علاج طبيعي' },
  ],
  education: [
    { de: 'Kita', en: 'Daycare', ar: 'روضة' }, { de: 'Schule', en: 'School', ar: 'مدرسة' }, { de: 'Schulbedarf', en: 'School supplies', ar: 'لوازم مدرسية' },
    { de: 'Online-Kurs', en: 'Online course', ar: 'دورة عبر الإنترنت' }, { de: 'Bücher', en: 'Books', ar: 'كتب' }, { de: 'Nachhilfe', en: 'Tutoring', ar: 'دروس خصوصية' },
  ],
  investment: [
    { de: 'ETF-Sparplan', en: 'ETF savings plan', ar: 'خطة ادخار ETF' }, { de: 'Tagesgeld', en: 'Savings account', ar: 'حساب توفير' }, { de: 'Festgeld', en: 'Fixed deposit', ar: 'وديعة لأجل' },
    { de: 'Bausparvertrag', en: 'Building savings', ar: 'ادخار للسكن' }, { de: 'Notgroschen', en: 'Emergency fund', ar: 'صندوق طوارئ' },
  ],
  insurance: [
    { de: 'Haftpflicht', en: 'Liability insurance', ar: 'تأمين المسؤولية' }, { de: 'Hausrat', en: 'Contents insurance', ar: 'تأمين المنزل' },
    { de: 'Zahnzusatzversicherung', en: 'Dental insurance', ar: 'تأمين الأسنان' }, { de: 'Lebensversicherung', en: 'Life insurance', ar: 'تأمين على الحياة' },
    { de: 'Rentenversicherung', en: 'Pension plan', ar: 'خطة تقاعد' }, { de: 'Rechtsschutz', en: 'Legal insurance', ar: 'تأمين قانوني' },
  ],
  cash: [
    { de: 'Geldautomat', en: 'Cash machine', ar: 'صراف آلي' }, { de: 'Bargeld', en: 'Cash', ar: 'نقد' }, { de: 'Abhebung', en: 'Withdrawal', ar: 'سحب' },
  ],
  taxes: [
    { de: 'Rundfunkbeitrag', en: 'TV licence', ar: 'رسوم البث' }, { de: 'Kfz-Steuer', en: 'Car tax', ar: 'ضريبة السيارة' }, { de: 'Grundsteuer', en: 'Property tax', ar: 'ضريبة العقار' },
    { de: 'Kontogebühren', en: 'Bank fees', ar: 'رسوم البنك' }, { de: 'Steuernachzahlung', en: 'Tax payment', ar: 'دفعة ضريبية' }, { de: 'Gebühren', en: 'Fees', ar: 'رسوم' },
  ],
};

export const NAME_SUGGESTIONS: Record<string, Names[]> = SUGGESTIONS;

/**
 * A language loaded on demand brings its suggestions (src/i18n/xx.ts
 * `suggestionNames`, keyed by the German one); `loadLanguage` hands them here.
 */
export function addSuggestionNames(lang: string, words: Record<string, string>): void {
  for (const list of Object.values(SUGGESTIONS)) {
    for (const n of list) {
      const word = n.de && words[n.de];
      if (word && !(lang in n)) n[lang] = word;
    }
  }
}

/** Emoji offered when creating or editing a category. */
export const CATEGORY_EMOJIS = [
  '💶', '💰', '🏦', '💼', '🏠', '🔌', '📱', '🚗', '⛽', '🚆', '🛒', '🛍️', '🍽️', '☕',
  '👨‍👩‍👦', '👶', '🎓', '💊', '🏥', '🏋️', '🎁', '✈️', '🏖️', '🐾', '🎮', '📚', '🧾', '📦',
  '👕', '🏡', '📞', '🚌', '🌍', '🎭', '⚽', '🩺', '🐷', '🛡️', '🪙', '🏛️',
];
