import { Category, Names } from '../types';

/**
 * The categories a first launch starts with, in the order the month page
 * reads: income first, then what goes out every month, then the car, the
 * extras, groceries and the family — the columns of My_expense.xlsx.
 * Everything here can be renamed, recoloured, reordered or deleted in
 * Settings, and brought back with "Standard wiederherstellen".
 */
const CATEGORIES: Category[] = [
  { id: 'income', names: { de: 'Einkommen', en: 'Income' }, emoji: '💶', hue: 'leaf', kind: 'income', repeat: 'monthly', builtin: true },
  { id: 'fixed', names: { de: 'Fixkosten', en: 'Fixed costs' }, emoji: '🏠', hue: 'sky', kind: 'expense', repeat: 'monthly', budget: 'need', builtin: true },
  { id: 'car', names: { de: 'Auto', en: 'Car' }, emoji: '🚗', hue: 'carrot', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },
  { id: 'extra', names: { de: 'Sonderkosten', en: 'Extras' }, emoji: '🛍️', hue: 'lavender', kind: 'expense', repeat: 'none', budget: 'want', builtin: true },
  { id: 'groceries', names: { de: 'Einkaufen', en: 'Groceries' }, emoji: '🛒', hue: 'lime', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },
  { id: 'family', names: { de: 'Familie', en: 'Family' }, emoji: '👨‍👩‍👦', hue: 'berry', kind: 'expense', repeat: 'none', budget: 'need', builtin: true },
];

/** A fresh copy of the built-in categories. */
export function defaultCategories(): Category[] {
  return CATEGORIES.map(c => ({ ...c, names: { ...c.names } }));
}

/** The category orphaned entries (from an old backup) are put into. */
export const OTHER_CATEGORY: Category = {
  id: 'other', names: { de: 'Sonstiges', en: 'Other' }, emoji: '📦', hue: 'stone', kind: 'expense', repeat: 'none', budget: 'want',
};

/** Built-in expense categories that are basic needs, for data saved before `budget` existed. */
const NEED_IDS = ['fixed', 'car', 'groceries', 'family'];
/** Need or want: the category's own choice, else the built-in default, else want. */
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
};

/** Emoji offered when creating or editing a category. */
export const CATEGORY_EMOJIS = [
  '💶', '💰', '🏦', '💼', '🏠', '🔌', '📱', '🚗', '⛽', '🚆', '🛒', '🛍️', '🍽️', '☕',
  '👨‍👩‍👦', '👶', '🎓', '💊', '🏥', '🏋️', '🎁', '✈️', '🏖️', '🐾', '🎮', '📚', '🧾', '📦',
];
