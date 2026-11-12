/*
 * The guide's pages (Optionen › Anleitung) and the tour's sentences, in German
 * — the language the `GuidePages` type is derived from, as `Strings` is from
 * the German block of translations.ts. One file per language in this folder,
 * each a chunk of its own, loaded when the guide is opened or a tour begins
 * (src/guidePages.ts), so the first launch carries none of it.
 *
 * {now}, {end}, {stats}, {plan}, {settings}, {repeat}, {split}, {refund},
 * {receipt}, {tag}, {whatIf}, {accounts} and {display} are the app's own
 * labels, filled in by guideText() — a text can't name a button that is
 * called something else. Every language keeps the placeholders of the German
 * string (guide.test.ts). Nothing here names the iPhone or anything of
 * Apple's: Android shows the same pages.
 */
const de = {
  guideIntro: 'Kurz erklärt. „Zeigen“ bringt dich an die richtige Stelle.',
  guideSearch: 'Anleitung durchsuchen',
  guideShow: 'Zeigen',
  guideRead: 'gelesen',

  // The chapters (Planen is the tab’s own name).
  guideChBasics: 'Die Grundlagen',
  guideChEntering: 'Eintragen',
  guideChLooking: 'Auswerten',
  guideChImporting: 'Importieren',
  guideChMore: 'Mehr im Haushaltsbuch',
  guideChSafe: 'Sicherheit und Daten',

  // The topics: a title where the feature has no label of its own in the app, and two or three sentences.
  guideBalances: 'Die zwei Kontostände',
  guideBalancesBody: '„{now}“ zählt, was bezahlt oder eingegangen ist – das, was deine Bank zeigt. „{end}“ rechnet alles Offene mit ein. Die Linie dazwischen zeigt den Weg dorthin.',
  guidePaid: 'Bezahlt oder offen',
  guidePaidBody: 'Der Kreis vor jedem Eintrag: leer heißt offen, gefüllt heißt bezahlt. Ein Tipp hakt ab, ein Wisch nach rechts auch. Ein Wisch nach links löscht – das lässt sich rückgängig machen.',
  guideMonths: 'Monate und Übertrag',
  guideMonthsBody: 'Mit ‹ › wechselst du den Monat, ein Tipp auf seinen Namen zeigt alle. Ein neuer Monat startet von selbst: Der Kontostand wird übertragen, wiederkehrende Einträge kommen als offen mit.',
  guideCategoriesBody: 'Jede Kategorie ist eine Karte auf der Monatsseite. Ein Tipp auf ihren Kopf klappt sie ein; halte einen Eintrag gedrückt, um ihn zu verschieben. Eigene Kategorien, Farben und Stichwörter richtest du unter „{settings}“ ein.',
  guideSearchBody: 'Das Suchfeld unter dem Monatsnamen findet Namen, Notizen, #Tags und Beträge – in allen Monaten. Der Knopf daneben zeigt nur, was noch offen ist.',
  guideDueBody: 'Offene Einträge mit Datum stehen im laufenden Monat ganz oben und lassen sich dort abhaken. Ist der Tag vorbei, werden sie als überfällig markiert.',
  guideAddBody: 'Tippe auf das runde +. Erst der Betrag, dann der Name – die passende Kategorie schlägt Spartopf vor. Über der Tastatur stehen + − × ÷: Aus 12,50+4,80 wird beim Sichern 17,30.',
  guideRepeats: 'Wiederkehrende Einträge',
  guideRepeatsBody: 'Miete, Gehalt, Abos: Stell „{repeat}“ im Eintrag auf monatlich, alle 2 Monate, vierteljährlich, halbjährlich oder jährlich. Der Eintrag kommt dann von selbst wieder – auf Wunsch nur bis zu einem letzten Monat.',
  guideFavoritesBody: 'Was du oft einträgst, merkst du dir im Eintrag als Favorit. Er steht dann über jedem neuen Eintrag und füllt Name, Kategorie und Betrag mit einem Tipp aus.',
  guideSplit: 'Aufteilen und Erstattungen',
  guideSplitBody: 'Ein Kassenzettel für mehrere Kategorien? Öffne den Eintrag und tippe auf „{split}“. Kommt Geld zurück, trag es mit „{refund}“ dort ein, wo der Kauf war – es senkt die Ausgaben und zählt nicht als Einnahme.',
  guideReceipts: 'Belege und Tags',
  guideReceiptsBody: '„{receipt}“ hängt ein Foto oder PDF an einen Eintrag; den Betrag liest Spartopf direkt auf dem Gerät. „# {tag}“ markiert Einträge, etwa #urlaub – die Suche und die Statistik finden sie wieder.',
  guideCaptureBody: 'Kartenzahlungen und Mitteilungen deiner Bank können sich von selbst eintragen – über eine Automation in der Kurzbefehle-App. Die Schritte zeigt dir Spartopf.',
  guideBudgetsBody: 'Gib einer Kategorie ein Budget pro Monat oder pro Jahr. Ihr Balken zeigt, wie viel noch übrig ist, und Spartopf sagt Bescheid, wenn es knapp wird. Ein Rest kann in den nächsten Monat mitgehen.',
  guideGoalsBody: 'Ein Spartopf ist ein Ziel mit Betrag und Datum – der Urlaub, das neue Fahrrad. Einträge, die du ihm zuordnest, füllen ihn; „{plan}“ zeigt, wie weit du bist.',
  guideOutlookBody: '„{plan}“ schaut nach vorn: die nächsten 30 Tage, die kommenden Monate und die Rücklage für Rechnungen, die nur einmal im Jahr kommen. „{whatIf}“ prüft eine Anschaffung vorab.',
  guideContractsBody: 'Alle festen Kosten auf einen Blick. Trag ein, bis wann ein Vertrag läuft und wie lange vorher du kündigen musst – Spartopf erinnert dich rechtzeitig.',
  guideDebtsBody: 'Kredite, Raten oder verliehenes Geld: Spartopf rechnet aus, was noch offen ist, wann du fertig bist und was eine Sonderzahlung bringt.',
  guideStatsBody: 'Der Blick zurück: Sparquote, Einnahmen und Ausgaben im Verlauf, wofür das Geld geht und an welchen Tagen. Fahr mit dem Finger über ein Diagramm – und das ⓘ erklärt, wie eine Zahl berechnet ist.',
  guideReportsBody: 'Nach jedem Monat fasst ein Bericht zusammen, was auffiel; zum Jahresende kommt der Jahresrückblick. Beide lassen sich als PDF teilen.',
  guideBank: 'Kontoumsätze importieren',
  guideBankBody: 'Im Menü „⋯“ des Monats: die CSV-Datei oder der PDF-Kontoauszug deiner Bank, oder ein Foto aus der Banking-App. Du prüfst alles, bevor etwas eingetragen wird. Regeln ordnen beim nächsten Mal von selbst ein.',
  guideInvoiceBody: 'Fotografiere den QR-Code auf einer Rechnung: Empfänger, Betrag und Verwendungszweck sind dann ausgefüllt, als offener Eintrag.',
  guideExcelBody: 'Führst du dein Budget bisher in Excel? Spartopf liest eine Tabelle mit einem Blatt pro Monat ein und zeigt vorher, was übernommen wird.',
  guideReconcileBody: 'Stimmt Spartopf nicht mit der Bank überein? Tipp ein, was die Bank zeigt – die Differenz wird als Eintrag gebucht oder der Anfangsbestand angepasst.',
  guideAccountsBody: 'Zum Start reicht ein Konto. Unter „{accounts}“ kommen Bargeld, ein Sparkonto oder weitere dazu – und Umbuchungen zwischen ihnen, die weder Einnahme noch Ausgabe sind.',
  guideProjectsBody: 'Ein eigenes Budget für den Urlaub, den Umzug oder die Renovierung – auf Wunsch mit Zeitraum und in der Währung vor Ort.',
  guideMonthStartBody: 'Dein Monat kann am Gehaltstag beginnen statt am 1. – dann plant Spartopf von Gehalt zu Gehalt.',
  guidePrivate: 'Alles bleibt auf dem Gerät',
  guidePrivateBody: 'Kein Konto, kein Server, keine Werbung. Deine Daten verlassen das Gerät nur, wenn du sie selbst exportierst.',
  guideBackupBody: 'Exportiere eine Sicherung mit Passwort und spiel sie auf einem neuen Gerät wieder ein. Den CSV-Export für die Tabellenkalkulation findest du dort auch.',
  guideLock: 'Sperre und verborgene Beträge',
  guideLockBody: 'Unter „{settings}“ kannst du alle Beträge verbergen, wenn jemand mitliest – und in der App auf dem Handy die Sperre einschalten, damit nur du sie öffnest.',
  guideRemindersBody: 'Lass dich an offene Posten erinnern, bevor sie fällig sind – und abends ans Eintragen. Ohne Beträge, solange du sie nicht einschaltest.',
  guideLookBody: '14 Sprachen, hell oder dunkel, acht Farben und deine Währung: alles unter „{settings}“, bei „{display}“.',

  // The tour of the month page, one sentence a mark.
  tourBalance: 'Oben steht, was jetzt auf dem Konto ist. Darunter, was am Monatsende bleibt, wenn alles Offene bezahlt ist.',
  tourTick: 'Ein Tipp auf den Kreis hakt einen Eintrag ab: bezahlt statt offen.',
  tourMonth: 'Hier wechselst du den Monat. Wiederkehrende Einträge kommen von selbst mit.',
  tourTabs: '„{stats}“ schaut zurück, „{plan}“ nach vorn. Unter „{settings}“ findest du die ganze Anleitung.',
  tourAdd: 'Und hier trägst du etwas ein – der Betrag zuerst.',

  // The tours: the guide's list, and one sentence a mark.
  guideToursTitle: 'Touren',
  guideToursBody: 'Schritt für Schritt auf den echten Seiten – jede dauert keine Minute.',
  tourNameMonth: 'Die Monatsseite',
  tourAboutMonth: 'Kontostand, abhaken, Monate wechseln',
  tourNameEntry: 'Etwas eintragen',
  tourAboutEntry: 'Betrag, Name, Kategorie und der Rest',
  tourNameStats: '{stats}',
  tourAboutStats: 'Zeitraum, Sparquote, wofür das Geld geht',
  tourNamePlan: '{plan}',
  tourAboutPlan: 'Budgets, die nächsten 30 Tage, Ausblick',
  tourNameSettings: '{settings}',
  tourAboutSettings: 'Sicherheit, Darstellung, Sicherung',
  tourEntryAmount: 'Zuerst der Betrag. Über der Tastatur stehen + − × ÷ – so rechnest du einen Kassenzettel gleich hier zusammen.',
  tourEntryName: 'Dann wofür. Spartopf schlägt Namen vor, die du schon benutzt hast, und ergänzt beim Tippen.',
  tourEntryCategory: 'Die Kategorie wählt Spartopf passend zum Namen (✦). Stimmt sie nicht, tippe eine andere an.',
  tourEntryDetails: 'Hier der Rest: Datum, bezahlt oder offen, „{repeat}“, „{receipt}“, Notiz und „# {tag}“.',
  tourSave: 'Fertig? Der Haken sichert den Eintrag.',
  tourStatsRange: 'Wähle den Zeitraum: 3, 6, 9 oder 12 Monate, ein Jahr oder alles. Alles darunter richtet sich danach.',
  tourStatsHero: 'Das Wichtigste auf einen Blick: wie viel von deinen Einnahmen übrig bleibt – im Schnitt pro Monat.',
  tourStatsChart: 'Einnahmen und Ausgaben Monat für Monat. Fahr mit dem Finger darüber, um jeden Wert zu sehen.',
  tourStatsWhere: 'Wofür das Geld geht – nach Kategorie, Empfänger oder Tag. Ein Tipp zeigt die Einzelheiten.',
  tourStatsRhythm: 'An welchen Wochentagen und an welchen Tagen des Monats du am meisten ausgibst.',
  tourPlanPace: 'Der laufende Monat: Gibst du schneller aus als sonst, und wo landest du am Monatsende?',
  tourPlanBudgets: 'Deine Budgets: was in jeder Kategorie diesen Monat noch übrig ist.',
  tourPlanRunway: 'Die nächsten 30 Tage, Tag für Tag – mit dem tiefsten Stand, bevor wieder Geld kommt.',
  tourPlanOutlook: 'Die nächsten zwölf Monate. „{whatIf}“ prüft hier eine Anschaffung, bevor du sie machst.',
  tourPlanGoals: 'Deine Spartöpfe: wofür du sparst und wie weit du schon bist.',
  tourSetSecurity: 'Beträge verbergen, die App sperren, Erinnerungen – alles, was deine Daten schützt.',
  tourSetDisplay: 'Sprache, hell oder dunkel, die Farbe der App und deine Währung.',
  tourSetBook: 'Dein Haushaltsbuch: Kategorien und Budgets, Favoriten, Konten, Regeln und mehr.',
  tourSetTransfer: 'Hier sicherst du alles in eine Datei – für ein neues Gerät oder einfach für alle Fälle.',
};

export type GuidePages = { [K in keyof typeof de]: string };

export default de;
