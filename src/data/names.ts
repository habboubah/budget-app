import { Names } from '../types';

/*
 * Built-in category names in the languages that load on demand (src/i18n/).
 * German, English and Arabic sit beside each category in defaults.ts. These
 * ship in the main bundle (under 2 kB), so a category has its name in every
 * language before that language's strings are loaded — the schema 19 upgrade
 * and the keyword index need them. The name suggestions are bigger and only
 * needed in the language in use, so each language file carries its own
 * (`suggestionNames`), registered by `loadLanguage`.
 */
type Table = Record<string, Record<string, string>>;

/** Built-in category names, by language and category id. */
export const CATEGORY_NAMES: Table = {
  tr: {
    income: 'Gelir', fixed: 'Ev', car: 'Araba', extra: 'Diğer', groceries: 'Market ve kişisel bakım', restaurants: 'Restoranlar',
    family: 'Aile', children: 'Çocuklar', clothing: 'Giyim', shopping: 'Alışveriş', telecom: 'Telefon ve internet', mobility: 'Ulaşım',
    travel: 'Seyahat', leisure: 'Eğlence ve boş zaman', sport: 'Spor ve hobiler', health: 'Sağlık ve zindelik',
    education: 'Eğitim ve çocuk bakımı', investment: 'Yatırım', insurance: 'Sigorta', cash: 'Nakit', taxes: 'Vergi ve harçlar', lent: 'Borç verilen para',
  },
  pl: {
    income: 'Dochody', fixed: 'Dom', car: 'Samochód', extra: 'Inne', groceries: 'Spożywcze i drogeria', restaurants: 'Restauracje',
    family: 'Rodzina', children: 'Dzieci', clothing: 'Odzież', shopping: 'Zakupy', telecom: 'Telefon i internet', mobility: 'Transport',
    travel: 'Podróże', leisure: 'Rozrywka i czas wolny', sport: 'Sport i hobby', health: 'Zdrowie i wellness',
    education: 'Edukacja i opieka nad dziećmi', investment: 'Inwestycje', insurance: 'Ubezpieczenia', cash: 'Gotówka', taxes: 'Podatki i opłaty', lent: 'Pożyczone pieniądze',
  },
  cs: {
    income: 'Příjmy', fixed: 'Bydlení', car: 'Auto', extra: 'Ostatní', groceries: 'Potraviny a drogerie', restaurants: 'Restaurace',
    family: 'Rodina', children: 'Děti', clothing: 'Oblečení', shopping: 'Nákupy', telecom: 'Telefon a internet', mobility: 'Doprava',
    travel: 'Cestování', leisure: 'Volný čas a zábava', sport: 'Sport a koníčky', health: 'Zdraví a wellness',
    education: 'Vzdělávání a péče o děti', investment: 'Investice', insurance: 'Pojištění', cash: 'Hotovost', taxes: 'Daně a poplatky', lent: 'Půjčené peníze',
  },
  sv: {
    income: 'Inkomst', fixed: 'Boende', car: 'Bil', extra: 'Övrigt', groceries: 'Livsmedel och hygien', restaurants: 'Restauranger',
    family: 'Familj', children: 'Barn', clothing: 'Kläder', shopping: 'Shopping', telecom: 'Telefon och internet', mobility: 'Transport',
    travel: 'Resor', leisure: 'Nöje och fritid', sport: 'Sport och hobby', health: 'Hälsa och välmående',
    education: 'Utbildning och barnomsorg', investment: 'Investeringar', insurance: 'Försäkringar', cash: 'Kontanter', taxes: 'Skatter och avgifter', lent: 'Utlånade pengar',
  },
  nb: {
    income: 'Inntekt', fixed: 'Bolig', car: 'Bil', extra: 'Annet', groceries: 'Dagligvarer og hygiene', restaurants: 'Restauranter',
    family: 'Familie', children: 'Barn', clothing: 'Klær', shopping: 'Shopping', telecom: 'Telefon og internett', mobility: 'Transport',
    travel: 'Reise', leisure: 'Fritid og underholdning', sport: 'Sport og hobby', health: 'Helse og velvære',
    education: 'Utdanning og barnehage', investment: 'Investeringer', insurance: 'Forsikringer', cash: 'Kontanter', taxes: 'Skatter og avgifter', lent: 'Utlånte penger',
  },
  da: {
    income: 'Indkomst', fixed: 'Bolig', car: 'Bil', extra: 'Andet', groceries: 'Dagligvarer og personlig pleje', restaurants: 'Restauranter',
    family: 'Familie', children: 'Børn', clothing: 'Tøj', shopping: 'Shopping', telecom: 'Telefon og internet', mobility: 'Transport',
    travel: 'Rejser', leisure: 'Fritid og underholdning', sport: 'Sport og hobby', health: 'Sundhed og velvære',
    education: 'Uddannelse og børnepasning', investment: 'Investeringer', insurance: 'Forsikringer', cash: 'Kontanter', taxes: 'Skatter og afgifter', lent: 'Udlånte penge',
  },
  fr: {
    income: 'Revenus', fixed: 'Logement', car: 'Voiture', extra: 'Divers', groceries: 'Courses et hygiène', restaurants: 'Restaurants',
    family: 'Famille', children: 'Enfants', clothing: 'Vêtements', shopping: 'Achats', telecom: 'Téléphone et internet', mobility: 'Transports',
    travel: 'Voyages', leisure: 'Loisirs et sorties', sport: 'Sport et passe-temps', health: 'Santé et bien-être',
    education: 'Éducation et garde d’enfants', investment: 'Placements', insurance: 'Assurances', cash: 'Espèces', taxes: 'Impôts et frais', lent: 'Argent prêté',
  },
  it: {
    income: 'Entrate', fixed: 'Casa', car: 'Auto', extra: 'Altro', groceries: 'Spesa e cura della persona', restaurants: 'Ristoranti',
    family: 'Famiglia', children: 'Bambini', clothing: 'Abbigliamento', shopping: 'Acquisti', telecom: 'Telefono e internet', mobility: 'Trasporti',
    travel: 'Viaggi', leisure: 'Tempo libero e svago', sport: 'Sport e hobby', health: 'Salute e benessere',
    education: 'Istruzione e infanzia', investment: 'Investimenti', insurance: 'Assicurazioni', cash: 'Contanti', taxes: 'Tasse e commissioni', lent: 'Soldi prestati',
  },
  es: {
    income: 'Ingresos', fixed: 'Hogar', car: 'Coche', extra: 'Otros', groceries: 'Supermercado y droguería', restaurants: 'Restaurantes',
    family: 'Familia', children: 'Niños', clothing: 'Ropa', shopping: 'Compras', telecom: 'Teléfono e internet', mobility: 'Transporte',
    travel: 'Viajes', leisure: 'Ocio y entretenimiento', sport: 'Deporte y aficiones', health: 'Salud y bienestar',
    education: 'Educación y cuidado infantil', investment: 'Inversiones', insurance: 'Seguros', cash: 'Efectivo', taxes: 'Impuestos y comisiones', lent: 'Dinero prestado',
  },
  nl: {
    income: 'Inkomen', fixed: 'Wonen', car: 'Auto', extra: 'Overig', groceries: 'Boodschappen en drogist', restaurants: 'Restaurants',
    family: 'Gezin', children: 'Kinderen', clothing: 'Kleding', shopping: 'Winkelen', telecom: 'Telefoon en internet', mobility: 'Vervoer',
    travel: 'Reizen', leisure: 'Vrije tijd en uitjes', sport: 'Sport en hobby’s', health: 'Gezondheid en welzijn',
    education: 'Onderwijs en kinderopvang', investment: 'Beleggingen', insurance: 'Verzekeringen', cash: 'Contant geld', taxes: 'Belastingen en kosten', lent: 'Uitgeleend geld',
  },
  pt: {
    income: 'Rendimentos', fixed: 'Casa', car: 'Carro', extra: 'Outros', groceries: 'Supermercado e higiene', restaurants: 'Restaurantes',
    family: 'Família', children: 'Crianças', clothing: 'Vestuário', shopping: 'Compras', telecom: 'Telefone e internet', mobility: 'Transportes',
    travel: 'Viagens', leisure: 'Lazer e entretenimento', sport: 'Desporto e passatempos', health: 'Saúde e bem-estar',
    education: 'Educação e creche', investment: 'Investimentos', insurance: 'Seguros', cash: 'Dinheiro', taxes: 'Impostos e taxas', lent: 'Dinheiro emprestado',
  },
};


/** `names` plus what `table` has for `key` in each of its languages. */
export function withLanguages(names: Names, table: Table, key: string | undefined): Names {
  if (!key) return names;
  const out: Names = { ...names };
  for (const [lang, words] of Object.entries(table)) {
    const word = words[key];
    if (word && !(lang in out)) out[lang] = word;
  }
  return out;
}
