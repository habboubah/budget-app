/**
 * The keywords each built-in category ships with: what people in Germany
 * most often type for it — shops and brands (the same in every language,
 * `all`) and the usual words in German, English and Arabic. Typing one in the
 * entry sheet suggests the category and completes the name; small typos are
 * caught too (src/keywords.ts).
 *
 * A category keeps these until its keywords are edited in Settings; from then
 * on `Category.keywords` holds the user's own list (schema 18). Keep a word in
 * one category only, unless it really belongs to two (then the month's own
 * category wins the tie). Avoid short words that start other words ("Super"
 * starts "Supermarkt"): a keyword of four letters or more also matches the
 * start of a longer word ("Strom" → "Stromrechnung"), one of five or more its
 * end ("Versicherung" → "Hausratversicherung").
 */
export interface ShippedKeywords {
  /** Brands and names that read the same in every language. */
  all?: string[];
  de?: string[];
  en?: string[];
  ar?: string[];
}

export const CATEGORY_KEYWORDS: Record<string, ShippedKeywords> = {
  income: {
    de: ['Gehalt', 'Lohn', 'Kindergeld', 'Elterngeld', 'Bürgergeld', 'Arbeitslosengeld', 'Wohngeld', 'Rente', 'Krankengeld', 'Bonus', 'Prämie',
      'Weihnachtsgeld', 'Urlaubsgeld', 'Nebenjob', 'Minijob', 'Erstattung', 'Rückerstattung', 'Steuererstattung', 'Zinsen', 'Dividende', 'Einnahme',
      'Gutschrift', 'Verkauf', 'Trinkgeld'],
    all: ['Familienkasse', 'Jobcenter', 'Agentur für Arbeit', 'Deutsche Rentenversicherung'],
    en: ['Salary', 'Wage', 'Paycheck', 'Child benefit', 'Parental allowance', 'Pension', 'Refund', 'Tax refund', 'Interest', 'Dividend', 'Income', 'Side job', 'Tips'],
    ar: ['راتب', 'أجر', 'معاش', 'إعانة الأطفال', 'إعانة الوالدين', 'مكافأة', 'استرداد', 'فوائد', 'أرباح', 'دخل', 'بقشيش'],
  },
  fixed: {
    de: ['Miete', 'Warmmiete', 'Kaltmiete', 'Nebenkosten', 'Strom', 'Gas', 'Wasser', 'Heizung', 'Heizöl', 'Fernwärme', 'Müllabfuhr', 'Hausgeld',
      'Rundfunkbeitrag', 'GEZ', 'Möbel', 'Haushalt', 'Haushaltswaren', 'Baumarkt', 'Handwerker', 'Wohnung', 'Kaution', 'Garten'],
    all: ['Stadtwerke', 'Mainova', 'Süwag', 'E.ON', 'Vattenfall', 'EnBW', 'Lichtblick', 'Yello', 'Tibber', 'Octopus Energy',
      'IKEA', 'Hornbach', 'OBI', 'Bauhaus', 'Toom', 'Hagebau', 'Poco', 'Roller', 'XXXLutz', 'Höffner'],
    en: ['Rent', 'Electricity', 'Water', 'Heating', 'Utilities', 'Service charges', 'Furniture', 'Household', 'Repairs', 'Garden'],
    ar: ['إيجار', 'أجار', 'كهرباء', 'غاز', 'ماء', 'مياه', 'تدفئة', 'أثاث', 'منزل', 'بيت'],
  },
  car: {
    de: ['Tanken', 'Tankstelle', 'Benzin', 'Diesel', 'Sprit', 'Kraftstoff', 'Ladestation', 'Werkstatt', 'Inspektion', 'Ölwechsel', 'Reifen',
      'Reifenwechsel', 'TÜV', 'Parken', 'Parkhaus', 'Parkticket', 'Parkgebühr', 'Waschanlage', 'Autowäsche', 'Kfz-Versicherung', 'Autoversicherung',
      'Kfz-Steuer', 'Maut', 'Vignette', 'Leasing', 'Ersatzteile', 'Autoreparatur', 'Auto'],
    all: ['Aral', 'Shell', 'Esso', 'Jet', 'TotalEnergies', 'Agip', 'Avia', 'OMV', 'ADAC', 'Dekra', 'ATU', 'Pitstop', 'Carglass',
      'Audi', 'BMW', 'Mercedes', 'VW', 'Volkswagen', 'Opel', 'Ford', 'Skoda', 'Seat', 'Toyota', 'Renault', 'Hyundai', 'Kia', 'Tesla'],
    en: ['Fuel', 'Petrol', 'Gas station', 'Car wash', 'Parking', 'Garage', 'MOT', 'Tyres', 'Tires', 'Car insurance', 'Car tax', 'Toll', 'Car'],
    ar: ['وقود', 'بنزين', 'ديزل', 'محطة وقود', 'ورشة', 'موقف', 'غسيل السيارة', 'تأمين السيارة', 'إطارات', 'سيارة'],
  },
  extra: {
    de: ['Sonstiges', 'Diverses', 'Verschiedenes', 'Spende', 'Post', 'Porto', 'Briefmarken', 'Paket', 'Schlüsseldienst', 'Reparatur'],
    all: ['Deutsche Post', 'DHL', 'Hermes', 'DPD', 'GLS'],
    en: ['Misc', 'Miscellaneous', 'Donation', 'Postage'],
    ar: ['أخرى', 'متفرقات', 'تبرع', 'صدقة', 'بريد'],
  },
  groceries: {
    de: ['Lebensmittel', 'Supermarkt', 'Einkauf', 'Einkaufen', 'Wocheneinkauf', 'Markt', 'Wochenmarkt', 'Discounter', 'Kiosk', 'Späti', 'Metzgerei', 'Metzger', 'Getränke',
      'Getränkemarkt', 'Mineralwasser', 'Obst', 'Gemüse', 'Drogerie', 'Kosmetik', 'Hygieneartikel'],
    all: ['Lidl', 'Aldi', 'Aldi Süd', 'Aldi Nord', 'Rewe', 'Edeka', 'Kaufland', 'Penny', 'Netto', 'Norma', 'Tegut', 'Globus', 'Marktkauf',
      'E-Center', 'Nahkauf', 'Famila', 'Denns', 'Alnatura', 'Rossmann', 'dm', 'Budni', 'Picnic', 'Flink', 'Knuspr'],
    en: ['Groceries', 'Supermarket', 'Food shopping', 'Drugstore', 'Toiletries', 'Market', 'Butcher', 'Drinks'],
    ar: ['بقالة', 'سوبرماركت', 'مواد غذائية', 'خضار', 'فواكه', 'لحم', 'ملحمة', 'مشروبات'],
  },
  restaurants: {
    de: ['Restaurant', 'Essen gehen', 'Café', 'Kaffee', 'Bäckerei', 'Bäcker', 'Imbiss', 'Döner', 'Pizza', 'Pizzeria', 'Burger', 'Sushi',
      'Lieferdienst', 'Mittagessen', 'Abendessen', 'Frühstück', 'Kantine', 'Mensa', 'Eisdiele', 'Kneipe', 'Biergarten', 'Shisha'],
    all: ['Lieferando', 'Wolt', 'Uber Eats', "McDonald's", 'Burger King', 'KFC', 'Subway', 'Starbucks', 'Nordsee', 'Vapiano', "L'Osteria",
      "Domino's", 'Pizza Hut', "Dunkin'", 'Five Guys', 'Backwerk', 'Kamps', 'Ditsch', 'Coffee Fellows'],
    en: ['Eating out', 'Takeaway', 'Take-out', 'Coffee', 'Lunch', 'Dinner', 'Breakfast', 'Kebab', 'Bakery', 'Delivery'],
    ar: ['مطعم', 'مقهى', 'قهوة', 'غداء', 'عشاء', 'فطور', 'شاورما', 'فلافل', 'بيتزا', 'مخبز', 'حلويات'],
  },
  family: {
    de: ['Familie', 'Geschenk', 'Geburtstag', 'Hochzeit', 'Familienfeier', 'Feier', 'Besuch', 'Verwandte', 'Eltern', 'Mama', 'Papa', 'Oma', 'Opa', 'Ausflug', 'Haushaltshilfe'],
    all: ['Western Union', 'MoneyGram', 'Ria', 'Remitly', 'WorldRemit'],
    en: ['Family', 'Gift', 'Present', 'Birthday', 'Wedding', 'Party', 'Visit', 'Parents', 'Mum', 'Dad', 'Day out'],
    ar: ['عائلة', 'أهل', 'هدية', 'عيد ميلاد', 'عرس', 'زفاف', 'حفلة', 'زيارة', 'حوالة'],
  },
  children: {
    de: ['Kinder', 'Kind', 'Baby', 'Windeln', 'Feuchttücher', 'Babynahrung', 'Milchpulver', 'Babymilch', 'Schnuller', 'Kinderkleidung',
      'Babykleidung', 'Spielzeug', 'Kinderwagen', 'Kindersitz', 'Babysitter', 'Kita', 'Kindergarten', 'Krippe', 'Tagesmutter', 'Taschengeld',
      'Kindergeburtstag'],
    all: ['Pampers', 'Hipp', 'Milupa', 'Aptamil', 'Bebivita', 'Babylove', 'Lillydoo', 'Smyths', 'myToys', 'Babymarkt', 'BabyOne', 'Lego', 'Playmobil'],
    en: ['Kids', 'Child', 'Children', 'Nappies', 'Diapers', 'Wipes', 'Baby food', 'Formula', 'Toys', 'Pram', 'Stroller', 'Car seat', 'Daycare',
      'Nursery', 'Childcare', 'Pocket money'],
    ar: ['أطفال', 'طفل', 'رضيع', 'حفاضات', 'حليب أطفال', 'طعام الأطفال', 'ألعاب', 'عربة أطفال', 'حضانة', 'روضة', 'مصروف الجيب'],
  },
  clothing: {
    de: ['Kleidung', 'Klamotten', 'Bekleidung', 'Schuhe', 'Jacke', 'Hose', 'Mode', 'Unterwäsche', 'Socken'],
    all: ['H&M', 'HM', 'Zara', 'C&A', 'Primark', 'Deichmann', 'Zalando', 'About You', 'Shein', 'Kik', 'TK Maxx', 'Takko', "Ernsting's family",
      'New Yorker', 'Peek & Cloppenburg', 'P&C', 'Snipes', 'Foot Locker', 'Nike', 'Adidas', 'Puma', 'Uniqlo', 'Bershka', 's.Oliver',
      'Tom Tailor', 'Esprit', 'Jack & Jones', 'Vinted'],
    en: ['Clothes', 'Clothing', 'Shoes', 'Fashion', 'Jacket', 'Trousers'],
    ar: ['ملابس', 'أحذية', 'حذاء', 'جاكيت', 'بنطال', 'أزياء'],
  },
  shopping: {
    de: ['Einkäufe', 'Bestellung', 'Elektronik', 'Technik', 'Haushaltsgeräte', 'Kaufhaus'],
    all: ['Amazon', 'Otto', 'eBay', 'Kleinanzeigen', 'MediaMarkt', 'Media Markt', 'Saturn', 'Temu', 'AliExpress', 'Etsy', 'Apple', 'Samsung',
      'Conrad', 'Cyberport', 'Notebooksbilliger', 'Galaxus', 'Douglas', 'Tchibo', 'Action', 'Tedi', 'Woolworth', 'Galeria'],
    en: ['Shopping', 'Online order', 'Electronics'],
    ar: ['تسوق', 'مشتريات', 'إلكترونيات', 'أمازون'],
  },
  telecom: {
    de: ['Handy', 'Handyvertrag', 'Handyrechnung', 'Mobilfunk', 'Internet', 'DSL', 'WLAN', 'Festnetz', 'Telefon', 'Glasfaser', 'Prepaid', 'Guthaben'],
    all: ['Telekom', 'Vodafone', 'O2', '1&1', 'Congstar', 'Aldi Talk', 'Lidl Connect', 'Fraenk', 'Freenet', 'Mobilcom', 'Klarmobil', 'Ay Yildiz',
      'Ortel', 'Lebara', 'Lycamobile', 'Netcologne', 'PYUR', 'Simyo', 'Winsim', 'Otelo'],
    en: ['Phone', 'Mobile', 'Mobile phone', 'Phone bill', 'Phone contract', 'Broadband', 'Wifi', 'Top-up', 'SIM card'],
    ar: ['هاتف', 'جوال', 'موبايل', 'إنترنت', 'رصيد', 'شريحة', 'باقة'],
  },
  mobility: {
    de: ['Bahn', 'Zug', 'Bus', 'S-Bahn', 'U-Bahn', 'Straßenbahn', 'Tram', 'ÖPNV', 'Fahrkarte', 'Fahrschein', 'Ticket', 'Monatskarte', 'Jobticket',
      'Deutschlandticket', 'D-Ticket', 'Taxi', 'Fahrrad', 'E-Scooter', 'Carsharing', 'Fernbus'],
    all: ['Deutsche Bahn', 'DB', 'RMV', 'VGF', 'HVV', 'BVG', 'MVV', 'VRR', 'VVS', 'KVV', 'Flixbus', 'FlixTrain', 'Uber', 'Bolt', 'FreeNow', 'Free Now',
      'Voi', 'Nextbike', 'Call a Bike', 'Share Now', 'BlaBlaCar'],
    en: ['Train', 'Tram', 'Subway', 'Transit', 'Transport', 'Public transport', 'Bike', 'Scooter', 'Ride'],
    ar: ['قطار', 'باص', 'حافلة', 'مترو', 'تذكرة', 'مواصلات', 'تاكسي', 'دراجة'],
  },
  travel: {
    de: ['Reise', 'Reisen', 'Urlaub', 'Ferien', 'Hotel', 'Ferienwohnung', 'Unterkunft', 'Flug', 'Flugticket', 'Flughafen', 'Mietwagen', 'Koffer', 'Gepäck', 'Visum'],
    all: ['Booking.com', 'Booking', 'Airbnb', 'Expedia', 'Check24', 'Holidaycheck', 'TUI', 'Lufthansa', 'Eurowings', 'Ryanair', 'Condor', 'easyJet',
      'Wizz Air', 'Turkish Airlines', 'Pegasus', 'SunExpress', 'Emirates', 'Qatar Airways', 'Trivago', 'Sixt', 'Europcar', 'Hertz', 'Avis'],
    en: ['Travel', 'Trip', 'Holiday', 'Vacation', 'Flight', 'Airport', 'Rental car', 'Luggage'],
    ar: ['سفر', 'رحلة', 'عطلة', 'إجازة', 'فندق', 'طيران', 'تذكرة طيران', 'مطار', 'تأشيرة'],
  },
  leisure: {
    de: ['Freizeit', 'Kino', 'Konzert', 'Theater', 'Museum', 'Zoo', 'Freizeitpark', 'Spiele', 'Videospiel', 'Zeitschrift', 'Zeitung', 'Streaming', 'Musik'],
    all: ['Netflix', 'Spotify', 'Disney+', 'Disney Plus', 'Amazon Prime', 'Prime Video', 'DAZN', 'Sky', 'Apple Music', 'Apple TV', 'YouTube Premium',
      'Audible', 'Joyn', 'RTL+', 'Paramount+', 'Crunchyroll', 'PlayStation', 'Xbox', 'Nintendo', 'Steam', 'Eventim', 'CinemaxX', 'UCI', 'Cineplex',
      'Europa-Park', 'Phantasialand'],
    en: ['Leisure', 'Entertainment', 'Cinema', 'Movie', 'Movies', 'Concert', 'Theatre', 'Games', 'Music', 'Subscription'],
    ar: ['ترفيه', 'سينما', 'حفلة موسيقية', 'مسرح', 'متحف', 'ألعاب فيديو', 'اشتراك', 'بث'],
  },
  sport: {
    de: ['Sport', 'Fitness', 'Fitnessstudio', 'Training', 'Verein', 'Vereinsbeitrag', 'Schwimmbad', 'Hallenbad', 'Schwimmen', 'Fußball', 'Yoga',
      'Kampfsport', 'Tennis', 'Hobby', 'Sportschuhe', 'Sportkleidung', 'Sportausrüstung'],
    all: ['Gym', 'McFit', 'FitX', 'Clever Fit', 'John Reed', 'Fitness First', 'Urban Sports Club', 'EGYM', 'Wellpass', 'Decathlon', 'Intersport',
      'SportScheck', 'Holmes Place', 'Kieser'],
    en: ['Sports', 'Workout', 'Club', 'Swimming pool', 'Football', 'Hobbies'],
    ar: ['رياضة', 'نادي رياضي', 'جيم', 'لياقة', 'تدريب', 'سباحة', 'كرة قدم', 'هواية'],
  },
  health: {
    de: ['Gesundheit', 'Apotheke', 'Arzt', 'Arztbesuch', 'Ärztin', 'Hausarzt', 'Zahnarzt', 'Kieferorthopäde', 'Frauenarzt', 'Augenarzt', 'Hautarzt', 'Facharzt',
      'Krankenhaus', 'Klinik', 'Praxis', 'Medikamente', 'Medizin', 'Rezept', 'Zuzahlung', 'Physiotherapie', 'Physio', 'Massage', 'Optiker',
      'Brille', 'Kontaktlinsen', 'Hörgerät', 'Friseur', 'Nagelstudio', 'Wellness', 'Sauna', 'Therme', 'Vitamine'],
    all: ['Fielmann', 'Apollo', 'DocMorris', 'Shop Apotheke', 'Medpex'],
    en: ['Health', 'Pharmacy', 'Chemist', 'Doctor', 'Dentist', 'Hospital', 'Medicine', 'Prescription', 'Glasses', 'Optician', 'Hairdresser',
      'Barber', 'Spa'],
    ar: ['صحة', 'صيدلية', 'طبيب', 'دكتور', 'طبيب أسنان', 'مستشفى', 'عيادة', 'دواء', 'أدوية', 'نظارات', 'حلاق', 'كوافير', 'علاج طبيعي'],
  },
  education: {
    de: ['Bildung', 'Schule', 'Schulbedarf', 'Schulgeld', 'Schulbücher', 'Schulranzen', 'Klassenfahrt', 'Nachhilfe', 'Kurs', 'Sprachkurs',
      'Deutschkurs', 'Integrationskurs', 'Volkshochschule', 'VHS', 'Uni', 'Universität', 'Studium', 'Studiengebühren', 'Semesterbeitrag',
      'Weiterbildung', 'Fortbildung', 'Seminar', 'Bücher', 'Fahrschule', 'Musikschule'],
    all: ['Udemy', 'Coursera', 'Duolingo', 'Babbel', 'Thalia', 'Hugendubel', 'Studienkreis', 'Schülerhilfe', 'Goethe-Institut', 'telc'],
    en: ['Education', 'School', 'Tuition', 'Tutoring', 'Course', 'Class', 'Books', 'University', 'School supplies'],
    ar: ['تعليم', 'مدرسة', 'دورة', 'كورس', 'دروس خصوصية', 'جامعة', 'كتب', 'قرطاسية', 'دورة لغة'],
  },
  investment: {
    de: ['Sparen', 'Sparplan', 'ETF', 'ETF-Sparplan', 'Aktien', 'Depot', 'Fonds', 'Tagesgeld', 'Festgeld', 'Sparbuch', 'Sparkonto', 'Bausparvertrag',
      'Krypto', 'Bitcoin', 'Gold', 'Notgroschen', 'Rücklage', 'Geldanlage'],
    all: ['Trade Republic', 'Scalable Capital', 'Scalable', 'comdirect', 'Consorsbank', 'flatex', 'Smartbroker', 'Bitpanda', 'Coinbase', 'Binance',
      'MSCI World', 'iShares', 'Vanguard'],
    en: ['Savings', 'Investment', 'Invest', 'Stocks', 'Shares', 'Crypto', 'Savings plan', 'Emergency fund'],
    ar: ['ادخار', 'توفير', 'استثمار', 'أسهم', 'ذهب', 'عملات رقمية', 'بيتكوين'],
  },
  insurance: {
    de: ['Versicherung', 'Haftpflicht', 'Hausrat', 'Krankenversicherung', 'Krankenkasse', 'Zahnzusatzversicherung', 'Lebensversicherung',
      'Berufsunfähigkeit', 'Unfallversicherung', 'Rechtsschutz', 'Rentenversicherung', 'Riester', 'Altersvorsorge', 'Pflegeversicherung'],
    all: ['Allianz', 'HUK', 'HUK-Coburg', 'HUK24', 'ERGO', 'AXA', 'Generali', 'DEVK', 'R+V', 'Signal Iduna', 'Debeka', 'Gothaer', 'Zurich',
      'Württembergische', 'LVM', 'VHV', 'Barmenia', 'HanseMerkur', 'CosmosDirekt', 'Getsafe', 'Verti', 'TK', 'AOK', 'Barmer', 'DAK', 'IKK',
      'BKK', 'KKH', 'hkk'],
    en: ['Insurance', 'Health insurance', 'Liability insurance', 'Life insurance', 'Contents insurance', 'Pension plan'],
    ar: ['تأمين', 'تأمين صحي', 'تأمين المسؤولية', 'تأمين على الحياة', 'تأمين المنزل', 'تقاعد'],
  },
  cash: {
    de: ['Bargeld', 'Geldautomat', 'Bankautomat', 'Abhebung', 'Barabhebung', 'Geld abheben'],
    en: ['Cash', 'ATM', 'Cash machine', 'Withdrawal', 'Cashpoint'],
    ar: ['نقد', 'نقدي', 'كاش', 'صراف', 'صراف آلي', 'سحب'],
  },
  taxes: {
    de: ['Steuer', 'Steuern', 'Steuernachzahlung', 'Einkommensteuer', 'Grundsteuer', 'Hundesteuer', 'Finanzamt', 'Gebühr', 'Gebühren', 'Kontogebühr',
      'Kontoführung', 'Bankgebühr', 'Rundfunkbeitrag', 'GEZ', 'Beitragsservice', 'Bußgeld', 'Strafzettel', 'Knöllchen', 'Mahngebühr', 'Anwalt',
      'Notar', 'Bürgeramt', 'Amt', 'Behörde', 'Personalausweis', 'Reisepass'],
    en: ['Tax', 'Taxes', 'Fee', 'Fees', 'Bank fee', 'Account fee', 'Parking fine', 'Tax office', 'Passport', 'ID card', 'Lawyer'],
    ar: ['ضريبة', 'ضرائب', 'رسوم', 'رسوم البنك', 'غرامة', 'مخالفة', 'جواز سفر', 'هوية', 'بلدية', 'محامي'],
  },
};

/**
 * A built-in category's shipped keywords, the app language's words first,
 * then the brands, then the other languages'. Empty for any other id.
 */
export function shippedKeywords(id: string, lang: string): string[] {
  const k = CATEGORY_KEYWORDS[id];
  if (!k) return [];
  const others = (['de', 'en', 'ar'] as const).filter(l => l !== lang).flatMap(l => k[l] ?? []);
  return [...(k[lang as 'de' | 'en' | 'ar'] ?? []), ...(k.all ?? []), ...others];
}
