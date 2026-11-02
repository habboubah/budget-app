import { Category, Names } from '../types';

/**
 * The categories a first launch starts with, in the order the month page
 * reads: income first, then what goes out every month, then the car, the
 * extras, groceries and the family — the columns of My_expense.xlsx. These
 * six are part of every new month.
 *
 * After them, the usual categories of a German banking app (Bekleidung,
 * Mobilität, Geldanlage …): there to pick when entering something, or to
 * switch on for every month in Settings, but not in a new month by default —
 * a page of fifteen empty cards is not simple. Their colours stay off the
 * six above (two or three share each of the other hues), so a chart never
 * paints one of them like a main category.
 *
 * Everything here can be renamed, recoloured, reordered or deleted in
 * Settings, and brought back with "Standard wiederherstellen".
 */
const CATEGORIES: Category[] = [
  { id: 'income', names: { de: 'Einkommen', en: 'Income' }, emoji: '💶', hue: 'leaf', kind: 'income', repeat: 'monthly', builtin: true },
  { id: 'fixed', names: { de: 'Fixkosten', en: 'Fixed costs' }, emoji: '🏠', hue: 'sky', kind: 'expense', repeat: 'monthly', budget: 'need', builtin: true },
  { id: 'car', names: { de: 'Auto', en: 'Car' }, emoji: '🚗', hue: 'carrot', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },
  { id: 'extra', names: { de: 'Sonderkosten', en: 'Extras' }, emoji: '🧾', hue: 'lavender', kind: 'expense', repeat: 'none', budget: 'want', builtin: true },
  { id: 'groceries', names: { de: 'Lebensmittel und Drogerie', en: 'Groceries & drugstore' }, emoji: '🛒', hue: 'lime', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },
  { id: 'family', names: { de: 'Familie', en: 'Family' }, emoji: '👨‍👩‍👦', hue: 'berry', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },

  { id: 'clothing', names: { de: 'Bekleidung', en: 'Clothing' }, emoji: '👕', hue: 'plum', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'shopping', names: { de: 'Einkäufe', en: 'Shopping' }, emoji: '🛍️', hue: 'stone', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'home', names: { de: 'Wohnen und Garten', en: 'Home & garden' }, emoji: '🏡', hue: 'mint', kind: 'expense', repeat: 'none', budget: 'need', standard: false, builtin: true },
  { id: 'telecom', names: { de: 'Telekommunikation', en: 'Phone & internet' }, emoji: '📞', hue: 'mint', kind: 'expense', repeat: 'monthly', budget: 'need', standard: false, builtin: true },
  { id: 'mobility', names: { de: 'Mobilität', en: 'Transport' }, emoji: '🚌', hue: 'blue', kind: 'expense', repeat: 'none', budget: 'need', standard: false, builtin: true },
  { id: 'travel', names: { de: 'Reisen', en: 'Travel' }, emoji: '🌍', hue: 'sand', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'leisure', names: { de: 'Freizeit und Unterhaltung', en: 'Leisure & entertainment' }, emoji: '🎭', hue: 'tomato', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'sport', names: { de: 'Sport und Hobby', en: 'Sport & hobbies' }, emoji: '⚽', hue: 'plum', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'health', names: { de: 'Gesundheit und Wellness', en: 'Health & wellness' }, emoji: '🩺', hue: 'tomato', kind: 'expense', repeat: 'none', budget: 'need', standard: false, builtin: true },
  { id: 'education', names: { de: 'Bildung und Erziehung', en: 'Education & childcare' }, emoji: '🎓', hue: 'stone', kind: 'expense', repeat: 'none', budget: 'need', standard: false, builtin: true },
  { id: 'investment', names: { de: 'Geldanlage', en: 'Investments' }, emoji: '🐷', hue: 'sand', kind: 'expense', repeat: 'monthly', budget: 'save', standard: false, builtin: true },
  { id: 'insurance', names: { de: 'Absicherung und Vorsorge', en: 'Insurance & pensions' }, emoji: '🛡️', hue: 'lemon', kind: 'expense', repeat: 'monthly', budget: 'need', standard: false, builtin: true },
  { id: 'cash', names: { de: 'Bargeld', en: 'Cash' }, emoji: '🪙', hue: 'lemon', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
  { id: 'taxes', names: { de: 'Steuern und Gebühren', en: 'Taxes & fees' }, emoji: '🏛️', hue: 'blue', kind: 'expense', repeat: 'none', budget: 'need', standard: false, builtin: true },
  { id: 'other', names: { de: 'Sonstiges', en: 'Other' }, emoji: '📦', hue: 'stone', kind: 'expense', repeat: 'none', budget: 'want', standard: false, builtin: true },
];

/** A fresh copy of the built-in categories. */
export function defaultCategories(): Category[] {
  return CATEGORIES.map(c => ({ ...c, names: { ...c.names } }));
}

/** The category orphaned entries (from an old backup) are put into. */
export const OTHER_CATEGORY: Category = CATEGORIES.find(c => c.id === 'other')!;

/**
 * Schema 2 (the banking-app categories). Data saved before it gets the new
 * built-ins appended, and the built-ins whose look changed are updated —
 * field by field, only where the user still has what the app shipped.
 */
export const NEW_IN_V2 = [
  'clothing', 'shopping', 'home', 'telecom', 'mobility', 'travel', 'leisure', 'sport', 'health', 'education',
  'investment', 'insurance', 'cash', 'taxes', 'other',
];
export const SHIPPED_V1: Record<string, Partial<Pick<Category, 'names' | 'emoji'>>> = {
  groceries: { names: { de: 'Einkaufen', en: 'Groceries' } },
  extra: { emoji: '🛍️' },
};

/** Built-in expense categories that are basic needs, for data saved before `budget` existed. */
const NEED_IDS = ['fixed', 'car', 'groceries', 'family'];
/** Need, want or saving: the category's own choice, else the built-in default, else want. */
export const budgetOf = (c: Category) => c.budget ?? (NEED_IDS.includes(c.id) ? 'need' : 'want');

/**
 * Names offered in the entry sheet before the user has a history of their
 * own. A brand is the same in every language, so it carries one name.
 */
export const NAME_SUGGESTIONS: Record<string, Names[]> = {
  income: [
    { de: 'Gehalt', en: 'Salary' }, { de: 'Kindergeld', en: 'Child benefit' }, { de: 'Elterngeld', en: 'Parental allowance' },
    { de: 'Nebenjob', en: 'Side job' }, { de: 'Erstattung', en: 'Refund' }, { de: 'Zinsen', en: 'Interest' },
  ],
  fixed: [
    { de: 'Miete', en: 'Rent' }, { de: 'Strom', en: 'Electricity' }, { de: 'Gas', en: 'Gas' }, { de: 'Internet', en: 'Internet' },
    { de: 'Handy', en: 'Mobile phone' }, { de: 'Rundfunkbeitrag', en: 'TV licence' }, { de: 'Versicherung', en: 'Insurance' },
    { de: 'Fitnessstudio', en: 'Gym' }, { de: 'Streaming', en: 'Streaming' }, { de: 'Kontogebühren', en: 'Bank fees' },
    { de: 'Cloud-Speicher', en: 'Cloud storage' },
  ],
  car: [
    { de: 'Tanken', en: 'Fuel' }, { de: 'Kfz-Versicherung', en: 'Car insurance' }, { de: 'Kfz-Steuer', en: 'Car tax' },
    { de: 'Parken', en: 'Parking' }, { de: 'Werkstatt', en: 'Garage' }, { de: 'Waschanlage', en: 'Car wash' }, { de: 'TÜV', en: 'MOT' },
  ],
  extra: [
    { de: 'Amazon' }, { de: 'Kleidung', en: 'Clothes' }, { de: 'Apotheke', en: 'Pharmacy' }, { de: 'Restaurant', en: 'Restaurant' },
    { de: 'Café', en: 'Café' }, { de: 'Geschenk', en: 'Gift' }, { de: 'Arzt', en: 'Doctor' }, { de: 'Online-Kurs', en: 'Online course' },
  ],
  groceries: [
    { de: 'Lidl' }, { de: 'Aldi' }, { de: 'Rewe' }, { de: 'Edeka' }, { de: 'Kaufland' }, { de: 'Penny' }, { de: 'Netto' },
    { de: 'Rossmann' }, { de: 'dm' }, { de: 'Wochenmarkt', en: 'Market' },
  ],
  family: [
    { de: 'Kita', en: 'Daycare' }, { de: 'Kinderkleidung', en: "Kids' clothes" }, { de: 'Spielzeug', en: 'Toys' },
    { de: 'Windeln', en: 'Nappies' }, { de: 'Taschengeld', en: 'Pocket money' }, { de: 'Ausflug', en: 'Day out' },
  ],
  clothing: [
    { de: 'C&A' }, { de: 'H&M' }, { de: 'Zalando' }, { de: 'Primark' }, { de: 'Deichmann' },
    { de: 'Schuhe', en: 'Shoes' }, { de: 'Jacke', en: 'Jacket' },
  ],
  shopping: [
    { de: 'Amazon' }, { de: 'MediaMarkt' }, { de: 'Otto' }, { de: 'eBay' }, { de: 'Kleinanzeigen' },
    { de: 'Elektronik', en: 'Electronics' }, { de: 'Geschenk', en: 'Gift' },
  ],
  home: [
    { de: 'IKEA' }, { de: 'OBI' }, { de: 'Bauhaus' }, { de: 'Möbel', en: 'Furniture' }, { de: 'Haushaltswaren', en: 'Household goods' },
    { de: 'Garten', en: 'Garden' }, { de: 'Renovierung', en: 'Renovation' },
  ],
  telecom: [
    { de: 'Vodafone' }, { de: 'Telekom' }, { de: 'O2' }, { de: '1&1' }, { de: 'Handyvertrag', en: 'Phone contract' },
    { de: 'Internet', en: 'Internet' },
  ],
  mobility: [
    { de: 'Deutschlandticket' }, { de: 'Deutsche Bahn' }, { de: 'RMV' }, { de: 'Taxi' }, { de: 'Uber' },
    { de: 'Fahrrad', en: 'Bike' }, { de: 'Carsharing', en: 'Car sharing' },
  ],
  travel: [
    { de: 'Hotel', en: 'Hotel' }, { de: 'Flug', en: 'Flight' }, { de: 'Ferienwohnung', en: 'Holiday flat' },
    { de: 'Booking.com' }, { de: 'Urlaub', en: 'Holiday' }, { de: 'Mietwagen', en: 'Rental car' },
  ],
  leisure: [
    { de: 'Netflix' }, { de: 'Spotify' }, { de: 'Kino', en: 'Cinema' }, { de: 'Restaurant', en: 'Restaurant' },
    { de: 'Café', en: 'Café' }, { de: 'Konzert', en: 'Concert' }, { de: 'Freizeitpark', en: 'Theme park' },
  ],
  sport: [
    { de: 'Fitnessstudio', en: 'Gym' }, { de: 'Verein', en: 'Club' }, { de: 'Schwimmbad', en: 'Swimming pool' },
    { de: 'Sportausrüstung', en: 'Sports gear' }, { de: 'Decathlon' },
  ],
  health: [
    { de: 'Apotheke', en: 'Pharmacy' }, { de: 'Arzt', en: 'Doctor' }, { de: 'Zahnarzt', en: 'Dentist' },
    { de: 'Brille', en: 'Glasses' }, { de: 'Friseur', en: 'Hairdresser' }, { de: 'Physiotherapie', en: 'Physiotherapy' },
  ],
  education: [
    { de: 'Kita', en: 'Daycare' }, { de: 'Schule', en: 'School' }, { de: 'Schulbedarf', en: 'School supplies' },
    { de: 'Online-Kurs', en: 'Online course' }, { de: 'Bücher', en: 'Books' }, { de: 'Nachhilfe', en: 'Tutoring' },
  ],
  investment: [
    { de: 'ETF-Sparplan', en: 'ETF savings plan' }, { de: 'Tagesgeld', en: 'Savings account' }, { de: 'Festgeld', en: 'Fixed deposit' },
    { de: 'Bausparvertrag', en: 'Building savings' }, { de: 'Notgroschen', en: 'Emergency fund' },
  ],
  insurance: [
    { de: 'Haftpflicht', en: 'Liability insurance' }, { de: 'Hausrat', en: 'Contents insurance' },
    { de: 'Zahnzusatzversicherung', en: 'Dental insurance' }, { de: 'Lebensversicherung', en: 'Life insurance' },
    { de: 'Rentenversicherung', en: 'Pension plan' }, { de: 'Rechtsschutz', en: 'Legal insurance' },
  ],
  cash: [
    { de: 'Geldautomat', en: 'Cash machine' }, { de: 'Bargeld', en: 'Cash' }, { de: 'Abhebung', en: 'Withdrawal' },
  ],
  taxes: [
    { de: 'Rundfunkbeitrag', en: 'TV licence' }, { de: 'Kfz-Steuer', en: 'Car tax' }, { de: 'Grundsteuer', en: 'Property tax' },
    { de: 'Kontogebühren', en: 'Bank fees' }, { de: 'Steuernachzahlung', en: 'Tax payment' }, { de: 'Gebühren', en: 'Fees' },
  ],
};

/** Emoji offered when creating or editing a category. */
export const CATEGORY_EMOJIS = [
  '💶', '💰', '🏦', '💼', '🏠', '🔌', '📱', '🚗', '⛽', '🚆', '🛒', '🛍️', '🍽️', '☕',
  '👨‍👩‍👦', '👶', '🎓', '💊', '🏥', '🏋️', '🎁', '✈️', '🏖️', '🐾', '🎮', '📚', '🧾', '📦',
  '👕', '🏡', '📞', '🚌', '🌍', '🎭', '⚽', '🩺', '🐷', '🛡️', '🪙', '🏛️',
];
