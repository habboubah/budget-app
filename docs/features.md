# What Spartopf does

Every feature of the app, by area. Spartopf runs on the iPhone, on Android and
in the browser; where a feature is only in one of them, it says so. Labels are
the German ones (the app speaks 14 languages). How to build and release it is
in the [README](../README.md); the money rules behind the numbers are in
[PLAN.md](PLAN.md).

**In one sentence:** a private household budget book — one page per month,
every entry paid or still open, and two numbers that matter: what is on the
account now and what will be left at the end of the month. No sign-up, no
server, no ads; everything stays on the device.

## The month page

- **One month per page.** ‹ › switch months, swipe the balance card sideways,
  or tap the month's name to pick any month (each shown with what it ended
  on, this month tinted, saved or overspent per month); *Zum aktuellen
  Monat* jumps back.
- **Two balances.** The balance card shows *Kontostand jetzt* — the bank
  balance, counting what is paid or received — large, and under it one row:
  *Am Monatsende* ("nach 6 offenen Posten"), what is left once everything
  open is settled. That is how a new book has it. A tap on the row opens the
  card, and it stays open: a ring for how many of the month's bills are
  paid, **the month as a line** — from what it opened with, through today
  (the dot stands at the balance now) and, dashed, on to the month's end
  through what is still open, so a salary still to come or a big bill ahead
  shows at a glance — and two panels, *Am Monatsende* and *Diesen Monat
  übrig* with "≈ 72 € pro Tag". A row opens the details: what was carried
  over (tap to correct it), then income and expenses each as a bar —
  received or paid so far, and what is still expected or open in amber, with
  both amounts — and the month's net, paid and with what is open. *Weniger*
  under the card closes it to the one figure and the one row again. Amounts
  run to their new value when something is ticked. A book that was in use
  before this arrived starts with the card open.
- **Before the balance is known** the card claims none: it says *Diesen
  Monat ausgegeben* (and what came in), and one row, *Kontostand eintragen*,
  asks what is on the account right now — so a first coffee is 4,50 € spent,
  not a bank balance of −4,50 €.
- **Categories in the order money moves.** **Einkommen** first, then
  **Wohnen** (rent, utilities, phone …), **Auto**, **Sonstiges**,
  **Lebensmittel und Drogerie**, **Restaurants**, **Familie**, **Kinder** —
  each a card in its own colour with what is paid so far and, below it, the
  total including what is still open. Each month has its own set: a new
  month gets the ones switched on under *Mehr › Kategorien und Budgets ›
  (a category) › In jedem neuen Monat* — as shipped only **Einkommen** and
  **Wohnen**, what comes and goes every month; every other category joins a
  month with its first entry there. Empty ones sit in a *Noch leer* row
  (on a new book one chip, "Kategorien (2)", that opens it),
  can be removed from the month (undoable), and *Kategorie hinzufügen*
  brings any category in — as does picking it when entering something. A
  category with entries always stays.
- **Fold and filter.** Tap a card's header to fold it down to one line
  (remembered per category, in every month); the month's "⋯" › *Mehr* folds
  or unfolds them all. A card's "⋯" can show only what is still open there.
- **Paid or open.** Every entry has a circle in front: empty = still open
  (rent not paid yet, salary expected), filled = paid. One tap toggles it —
  or swipe the entry to the right. Swipe left to delete (undoable). Every
  entry has a **date** (today unless you pick another day), shown on its row.
  With a due day ("fällig am 14."), open entries turn **überfällig** once the
  day has passed.
- **Demnächst fällig.** On the running month, a row of cards under the
  balance: what is due next, overdue first, ticked off right there; *Alle*
  lists it day by day, with what next month brings along.
- **Drag to sort.** Press and hold an entry (with a mouse: just drag it) and
  move it — within its card to change the order, or onto another card to move
  it there (undoable). A line shows where it lands, and the page scrolls along
  near the edges. The order is kept per month and comes along with recurring
  entries. Keyboard: Alt + ↑ / ↓.
- **Search every month** from the month page, grouped by month; it finds
  names, notes, `#tags` and amounts, and marks what matched. The field (and
  the filter for what is still open beside it) appears once the book has 15
  entries or a second month.
- **Carry-over.** Starting the next month shows exactly which recurring
  entries come along and copies them in as *open*; the running month and the
  next one start by themselves. The balance is carried over automatically —
  set it by hand for the first month or when the real account has drifted
  ("⋯" → *Kontostand prüfen* → *Kontostand am Monatsanfang*). Open entries left in earlier months
  are flagged with a link to them. "⋯" → *Mehr* → *Wiederkehrende aus … holen* brings
  recurring entries from the month before into a month that missed them.
- **Match the bank.** "⋯" → *Kontostand prüfen*: type what your bank shows,
  and Spartopf books the difference as a "Kontoabgleich" entry (so you see
  where it came from) or, if you prefer, moves the month's opening balance.
  Undoable; the balance card then notes "Abgeglichen am …".
- **Month from payday.** *Mehr › Einstellungen › Monat beginnt am*: the
  1st, or any day up to the 28th for those who plan from salary to salary.
  "November" then runs from 25 Oct to 24 Nov (named after the calendar month
  most of its days fall in) and the month title says so. Before the change
  the sheet says how many entries move to another month; it can be undone.
- **The month's "⋯" menu has four rows:** the *Monatsbericht*; the balance
  (*Kontostand eintragen* until one is known, then *Kontostand prüfen*);
  *Importieren* — one sheet with every way to bring entries in (below); and
  *Mehr*, with what is needed now and then: fetching recurring entries,
  folding every category, *Monat löschen*. *Umbuchen* joins them once there
  is more than one account.
- **The start.** A new book opens on a welcome — what the app does in one
  sentence, "ohne Konto, ohne Server", the language to change — and *Los
  geht's* leads through three questions, each of which *Später* skips: what
  is on the account right now, what comes in every month and on which day,
  and what goes out every month (rent, electricity, internet, phone,
  insurance: an amount and a day for those that apply). They become the
  month's first entries, all monthly — a day that has passed is paid, a
  later one waits as open — and the last screen says what that leaves at the
  end of the month. *Ich habe schon Daten* goes to the backup and Excel
  import instead, *Erst mit Testdaten ansehen* fills the app with the test
  year (a capsule above the tab bar takes it out again and returns to the
  start).
- **Erste Schritte.** Until all four are done — the balance, the income, the
  fixed costs, the first expense — one slim row on the month page says how
  many are ("2 von 4") and opens the list; ✕ puts it away. What the start's
  questions already answered is not on the list; with one step left the row
  is that step ("Erste Ausgabe eintragen"). A step, ticked or not, leads to
  its place on the month page — the balance card, its category — lights it
  up, and opens the form there.
- **Tips at the right moment.** One small card on the month page. First the
  three gestures, each when the page has something to try it on: the circle
  that ticks an entry once one is open, the swipe from the fifth entry, hold
  and drag once two entries share a category. Then, never more than one a
  week: after the same entry three times "Als Favorit merken", after the
  first yearly bill the reserve, after a month over budget "Budget
  anpassen", on the iPhone automatic capture, and a reminder to back up. ✕ or
  using it ends that tip for good.

## Learning the app: the guide and the tours

Between a new user and the month page stands only the start — three
questions to answer or skip, nothing to read. What there is to learn is there
when it is wanted:

- **Anleitung** — the first card of *Mehr*. Every feature in seven
  chapters (*Die Grundlagen, Eintragen, Planen, Auswerten, Importieren, Mehr
  im Haushaltsbuch, Sicherheit und Daten*), with a search over all of it. A
  topic opens to a screenshot of its screen filled with the test data (the
  control it is about outlined; German, English and Arabic in light and dark,
  the English ones for the other languages), one sentence of what it is,
  *So geht's* with numbered steps and a tip. The buttons a step names are
  drawn as they look — the round +, the "⋯", the tick that saves, *Aufteilen*
  on a capsule with its icon — in every language, as the app names them.
  What was read gets a tick. Topics a device can't use are left out
  (automatic capture off the iPhone, reminders in the browser).
- **Zeigen** goes to the real thing — the screen, the tab, the entry sheet —
  and lights up what the topic is about: the add button, the month's "⋯",
  the repeat pill, the budgets card. *Zurück zur Anleitung* is on that card;
  after it, "‹ Anleitung" above the tab bar leads back, the topic still open
  (on a screen of *Mehr*, its back button does).
- **Touren** — at the top of the guide: the month page, adding an entry,
  Statistik, Planen and Mehr, each at most five things lit one at a time
  on the real screen with a sentence beside it, "2 von 5", *Weiter*, and
  *Tour beenden* on every step. A topic offers its tour too; the month
  page's ends on *Eintrag hinzufügen*. A screen
  that doesn't have something yet gets a shorter tour; none starts by itself.
- **Ausprobieren.** The guide also offers *Testdaten hinzufügen* (below): a
  year of a household to try everything on without touching your own entries.
- Whoever had the app before the guide came sees one tip about it, once.

## Entering

- **Fast entry.** *Ausgabe | Einnahme* on top says which it is (it picks a
  category of that kind). The amount comes first (German or English number
  format both work: `1.050,00`, `45,12`, `12.5`; Arabic digits too). The key
  at the amount's edge brings **+ − × ÷** above the keyboard, and they stay
  once used: `12,50+4,80` adds up to `17,30` on save — no mental maths for a
  receipt or a split bill. Then the name, the category and three pills:
  date, paid / open, repeat. A round "⋯" opens the others in place and stays
  open once tapped — refund, receipt, note, tag, and the ones a feature adds
  (account, trip, tax, debt); a pill that holds something always shows. With
  them come *Sichern & nächster* for a stack of receipts (keeps the date)
  and *Als Favorit merken*; without, the confirmation's *Noch einer* opens
  the next entry. Deleting is undoable. A book in use starts with all of it
  open.
- **Name suggestions and completion.** Suggestions come from every entry in
  every month (this category's first, then the built-in ideas, then other
  categories'), narrow with each letter, and complete the name as you type;
  *Meintest du „Lidl"?* catches a typo. Tapping "Miete" fills in last
  month's amount and due day.
- **The category guessed from the name.** The categories a name points to
  move to the front with a ✦ — "Lidl" → Lebensmittel, "Strom" /
  "Electricity" / "كهرباء" → Wohnen, "gym" → Sport. A sure match is chosen
  for you until you tap a category yourself (switch that off in *Kategorien
  und Budgets*: then it is only marked). Your own entries teach it: what you
  filed "Lidl" under before wins. Each category has **keywords** — the
  built-ins come with the usual German shops, brands and words in German,
  English and Arabic — to see, change, delete or add in its sheet, with ideas
  from what you often enter there.
- **Repeats.** Mark an entry **monatlich**, **alle 2 Monate**,
  **vierteljährlich**, **halbjährlich** or **jährlich** — the Rundfunkbeitrag
  every quarter, an insurance twice a year. A recurring entry can also **end**
  (*Ohne Ende* → "bis März 2027"): an instalment plan or a contract that runs
  out is carried up to that month and no further. Quarterly and half-yearly
  bills count like yearly ones everywhere — in the reserve, the contracts
  ("viertelj.") and the outlook — spread over the year by how often they come.
- **Favourites.** Pin the small daily entries (Bäcker, Tanken, Kantine) with
  *Als Favorit merken*; they appear as chips at the top of a new entry. A tap
  fills the sheet in — name, category, amount, repeat — with the amount
  selected, so typing replaces it; nothing is saved before *Sichern*. Reorder
  and remove them in *Mehr › Haushaltsbuch › Favoriten*. Up to eight.
- **Split a payment.** In an entry's editor, *Aufteilen* turns one receipt
  ("Lidl 48,20 €") into parts in different categories ("Lebensmittel 35,10 € ·
  Drogerie 13,10 €") that must add up to the original. The parts are normal
  entries, so every total stays right, and re-importing the bank payment
  recognises the whole booking. Undoable.
- **Refunds.** Money that comes back — a return, a deposit, something the
  employer reimburses — is entered where the purchase was: the *Erstattung*
  pill turns "−" into "+". It goes into the account and lowers that
  category's spending (its total, its budget, the statistics); it never
  counts as income, so the savings rate stays honest. A refund can be
  *erwartet* until it arrives.
- **Tags.** Give an entry free tags from the sheet's "+" menu (*# Tag*).
  Search finds `#urlaub`, and once any tag exists *Statistik › Wofür das Geld
  geht* gains a **Tags** view ("Urlaub · 1.840 € · 23 Einträge"); the CSV
  export has a tags column. Nothing changes if you never use them.
- **Receipts and documents.** *Beleg* in the entry sheet takes a photo or
  picks a photo or PDF (up to five an entry); a paperclip marks the row, and
  the entry shows it full screen. *Betrag vom Beleg lesen* suggests the total
  and the shop, read on the device. Photos are saved without their location
  data; receipts are part of the backup and are erased with the book. With a
  receipt attached, two more pills say what it is kept for: *Rückgabe* (14
  days from the entry's date) and *Garantie* (two years) — each a date that
  can be changed or cleared. The row shows "Rückgabe bis 25. Nov." while
  there is still time, and a reminder comes before either runs out.
- **A word when a budget runs low.** The entry that takes a category to 80 %
  of its budget, or over it, says so in its confirmation ("Restaurants: 83 %
  des Budgets verbraucht") — once per mark, no amounts. Switch it off in
  *Kategorien und Budgets*.
- **Siri and Shortcuts** (iPhone). "Ausgabe in Spartopf" — Siri asks how much
  and what for, and the entry is booked (with an undo when the app opens).
  "Was bleibt am Monatsende in Spartopf" and "Offene Rechnungen in Spartopf"
  answer once the phone is unlocked, never while the app lock is on. All
  three are in the Shortcuts app and Spotlight too, for automations, in every
  language of the app.
- **Automatic capture** (iPhone). *Mehr › Automatisch erfassen* explains
  how to set up two automations in the Shortcuts app, once: after an Apple
  Pay payment, and (from iOS 27) on a notification from the banking app. The
  payment then becomes an entry by itself — your own name for the payee, the
  right category, paid — with an undo, or, with *Erst prüfen*, waiting under
  *Neu* on the month page. No bank login; the notification's text is read on
  the phone and not kept.
- **Links.** `spartopf://add?amount=12.50&name=…` opens a filled-in entry
  sheet (it never saves by itself), `spartopf://month/2026-11` opens a month —
  for Shortcuts and notes. Links wait while the app is locked.

## Bringing transactions in

- **From the bank, without typing.** The month's "⋯" → *Importieren* (also
  under *Mehr › Werkzeuge*) is one sheet with every way in, each with a
  sentence on what it takes: the CSV file from your online banking
  (Sparkasse and others), the statement itself as a **PDF** (*Kontoauszug
  importieren (PDF)*, for banks that offer nothing else), a photo or
  screenshot of the banking app — the text is read on the phone itself — an
  invoice's QR code, and an Excel budget sheet. Every transaction is shown to check first: new ones, ones
  already entered, and open bills they pay (those get ticked off). Money
  coming in from a shop you buy from is offered as a refund in that shop's
  category, and an awaited refund is ticked off instead of entered twice. An
  import goes into the account shown.
- **From other apps.** CSV exports from other budget apps (Finanzguru,
  Outbank, YNAB, Cashew and more) are recognised by their columns, and an
  unfamiliar file is mapped by its best guess.
- **Import rules.** Correct an imported entry's category and Spartopf offers
  to remember it — *nur diesen*, *auch künftige „REWE"*, or *auch alle
  bisherigen*. Rules can also leave transfers out (*nicht übernehmen*).
  Manage them in *Mehr › Werkzeuge › Regeln*.
- **Scan an invoice.** "⋯" → *Importieren* → *Rechnung scannen (QR-Code)*: take a photo (or
  pick a screenshot) of the payment QR code many invoices carry — the
  GiroCode. The entry sheet opens with the payee, the amount and, as the
  note, the reference and the IBAN: an open bill, ready to tick off once it
  is paid from the banking app. The picture isn't kept, and nothing is saved
  before *Sichern*.
- **From Excel.** *Importieren* → *Aus Excel importieren* (also under *Mehr ›
  Sichern und übertragen*, where the start's *Ich habe schon Daten* leads) reads a budget sheet laid out like
  `My_expense.xlsx`: one tab per month ("11.2026"), the categories in row 1,
  each with name · paid · open columns. A preview shows every month, how the
  columns map onto categories and what gets replaced before anything is
  written. "Before" becomes the starting balance (and a hand correction in a
  later month is kept), a day in brackets like `Vodafone(18)` becomes the due
  day, what comes back every month is marked *monatlich*, and a tab with a
  year typo ("08.2025" between July and September 2026) lands in the right
  month. Undoable.

## Budgets

- **Monthly budgets.** Give a spending category a budget (with a suggestion
  from what it cost on average): its card shows paid and open against it, a
  tick for today, "noch 212,88 €" or "50,04 € drüber", and how much is left
  per day.
- **Per year, or with the rest carried on.** A budget can run **per year**
  (*Pro Jahr*: clothes, holidays, presents — the calendar year's months count
  together, "Jahresbudget 600 € · noch 212 €"), or stay monthly and **take
  its rest along** (*Rest in den nächsten Monat mitnehmen*: what is left
  comes on top next month, what went over comes off — "inkl. 45 € Übertrag").
- **On Planen** the month's budgets sit together ("3 von 4 im Rahmen"), and
  the year review offers next year's budgets to take over in one step.

## More than one account, and the money around it

- **Cash and savings accounts.** One account is all most people need, and
  that is all a book shows until *Mehr › Konten* gets another — cash, a
  savings account or any other, each with what is on it today. From then on
  the balance card has a small switch ("🏦 Girokonto ▾", *Alle Konten* for
  the total), a new entry has an account pill, and the month's "⋯" has
  **Umbuchen**: "200 € vom Giro aufs Bargeld" as one transfer, which moves
  both balances and is neither income nor expense — it gets its own card
  under the categories, never counted in Statistik or a budget. Each account
  keeps its own opening balance; budgets, Statistik and Planen count every
  account, and Planen shows *Vermögen* — all of them together. An account
  goes only once it is empty.
- **Debts and loans.** *Mehr › Schulden und Kredite* takes a loan or a
  debt — what it was, since when, the interest a year, the monthly payment
  and the recurring entry it is paid with — or money lent to someone ("Mir
  geschuldet"). Each shows what is left and when it ends ("schuldenfrei im
  August 2028"), with the interest still to come; an extra payment, or money
  paid back, is linked from the entry sheet's *Zu einer Schuld* pill. Planen
  gets a *Schulden* card once there is one.
- **Savings pots (Spartöpfe).** Savings goals with a progress ring and "noch
  97 € im Monat bis Juni"; a "Sparen" entry can be put into a pot, recurring
  ones fill it by themselves. Money put into a savings category (an ETF plan
  in *Geldanlage*) counts as saved, not spent, everywhere in the statistics.
- **Trips and projects.** *Mehr › Reisen und Projekte*: a holiday, a
  move, the baby's room — a name (it becomes the tag), a budget in all, and
  optionally its first and last day. Everything with that tag counts towards
  it, whatever the category or month: "640 € von 2.000 € · 9.–18. Nov. · ≈
  170 € pro Tag". While it runs, the entry sheet offers it as a pill; a trip
  with both dates is preselected for new entries during those days. For a
  trip abroad, give it the local currency and a rate you type ("1 € = 38,5
  TRY"): amounts are then typed in that currency and saved in yours, with
  what was typed kept as the note. No rate is ever fetched. Planen shows a
  card once there is one; finished ones can be closed, and deleting one
  leaves its entries' tags.
- **Tax list.** *Mehr › Steuerliste*: switch on *Im Eintragsblatt
  anbieten*, and an expense gets a *Steuer* pill — Handwerker, haushaltsnahe
  Dienste, Kinderbetreuung, Spenden, Beruf und Arbeitsmittel, Gesundheit und
  Pflege, Sonstiges. The screen lists what is marked and paid by kind and
  year (a refund comes off, a recurring entry stays marked), with each kind's
  sum and the year's, and *Bericht teilen* makes the PDF for the tax return
  or the adviser. Spartopf only collects; it says so, and gives no tax advice.

## Statistik — how did it go?

- **As headlines, or whole.** Under the period's card and *Das fällt auf*,
  each card can show as one row with what it has found — "Kontostand am
  Monatsende · Dein Konto wächst: +2.992 € seit Juni", "Wofür das Geld geht
  · Wohnen 41 % · Lebensmittel 21 %" — and opens in place; *Weniger* under
  it folds it again, and the button in the bar folds or unfolds them all.
  What is open is remembered. A new book starts with headlines, a book in
  use with every card whole.
- **In the first month** there is nothing to compare yet: Statistik shows
  what stands out, where the money goes and when — and says that trends and
  the rest come with the second month. No period to choose, no chart of one
  point.
- **The period at the top**: 3, 6, 9 or 12 months, a whole **year** or all —
  everything under it follows. From 13 months on, *Mit Vorjahr vergleichen*
  adds the spending change against the year before.
- **The period at a glance**, on the accent's gradient: what it comes to as
  a sentence ("Du sparst im Schnitt rund ein Drittel deines Einkommens"),
  the savings rate as a ring with the 20 % target marked, Ø saved, and Ø
  income and Ø spending — each with a small line over the months and how it
  moved against as many months before (once the book has them).
- **Das fällt auf.** At most three ranked hints, each with a next step: a
  category above its usual, a trend, a better or weaker month, a record, a
  month with items still open or a week without entries, one big expense.
  "⋯" hides one, *Wie berechnet?* explains it.
- **Verlauf**: one chart of income and spending with what each month kept
  (still open or expected is hatched); the balance at each month's end;
  where the money goes — the whole split as one bar, then by category (Ø,
  share, how it moved against the months before, the budget as a tick), by
  payee or by tag; and the table — a month opens its **Monatsbericht**.
- **Wann du Geld ausgibst**: everyday spending per weekday — "Teuerster
  Wochentag: Samstag" when one clearly leads — and the picked month as a
  calendar, each day shaded by what went out on it. A day tapped shows its
  amount and what it was. Rent and contracts stay out, so the 1st isn't
  every month's priciest day.
- **The charts answer the finger**: put it down and drag across a chart —
  the values follow from month to month (or day to day) with a tick each.
  Lines are drawn in, columns grow, the ring sweeps round; all of it still
  under *Bewegung reduzieren*.
- **A category's screen**: its months with the Ø and its budget, so far / Ø /
  this year, the budget kept, where its money goes, its biggest entries and
  fixed costs. A payee opens a sheet with its months and *Alle Einträge*.
- **Jahresrückblick**, from 15 December to January: the year in numbers,
  budgets for the next year to take over in one step, and a picture to share
  — without amounts unless you want them.

## Planen — how is it going, what's coming?

- **As headlines, or whole** — as in Statistik: "Budgets · 16 von 17 im
  Rahmen", "Nächste 30 Tage · Tiefster Stand: 3.660 € am 21. Nov.",
  "Ausblick · Bis November 2027 ≈ 9.560 € auf dem Konto", "Abos & Verträge ·
  17 feste Kosten · 1.778 € im Monat", each opening in place. *November bis
  heute* is the answer and always whole. With the year of test data that is
  two screens instead of six.
- **On a new book** Planen shows what has something to say: the pace without
  its chart until there is a usual month to compare with, *Budget festlegen*
  and *Für etwas sparen?* as invitations instead of empty cards, the
  contracts once there is one.
- **November bis heute**: everyday spending so far against a usual month at
  the same day, where it would end, and where it goes — the finding and its
  three figures (today, usually by today, the month's end) on the accent's
  gradient, the chart under it.
- **Budgets** of the month.
- **Nächste 30 Tage**: your account day by day from today, from what is
  entered and still open — every bill on its day, the salary on its — with
  the lowest point before the next money comes in ("Tiefster Stand:
  412,00 € am 27. Nov.", or the day it would go below zero), what comes in
  and goes out in those days, and the way to *Demnächst fällig*. Nothing is
  estimated: spending you haven't entered isn't in it.
- **Ausblick**: the balance at the end of each of the next twelve months,
  with yearly bills in their month, recurring entries until they end, a
  range from calm to pricey months, and the line in figures: where it
  starts, its lowest month when it dips, where it ends.
- **Kann ich mir das leisten?** under the outlook tries a purchase in a month
  or a new monthly cost against it — "Das passt", "Es wird knapp: Februar 2027
  endet mit ≈ 1.240 €" or "Das reicht nicht", with the lowest point and the
  year's end beside what they would be without it — and, with a loan, what
  paying more every month does ("Schuldenfrei März 2028 statt August 2028,
  ≈ 310 € weniger Zinsen"). Nothing is saved; *Als offenen Eintrag vormerken*
  puts the plan into its month as an open entry.
- **Rücklage für jährliche Kosten** (when the book has a yearly bill): how
  much to set aside a month, the next bills coming up, and whether the
  account covers them.
- **Spartöpfe**, **Schulden** and **Reisen und Projekte**, once there are any.
- **Abos & Verträge**: every recurring cost with its next payment, price
  changes (with what they do in a year), new subscriptions, and regular
  payments still missing this month — one tap enters them. Tap one to note
  when the contract runs until, its notice period and how long it renews
  for; the notice deadline then shows here and gets a reminder.
- **Finanz-Check**: more in than out (the savings rate and 50/30/20), bills
  on time, and the reserve in months of basic needs (3–6 is a rule of thumb).
- Every key figure has an ⓘ that shows how it is worked out, with your own
  numbers.

## Reports

- **Monatsbericht** for any month — from the month's "⋯", Planen or the
  table: what it saved against a usual month, budgets kept, what changed,
  where the money went, what is still open, and the month after. At the
  start of a month a card on the month page sums up the one before.
- **PDF report.** *Bericht teilen* under a month's report or the year review
  makes a PDF — totals, budgets, categories, open items, and every entry if
  you like — to share or print, with amounts even when they're hidden in the
  app. The tax list has its own PDF.

## Reminders

*Mehr › Einstellungen › Sicherheit und Mitteilungen* (iPhone and Android app):

- **An offene Posten erinnern**: a notification some days before an open
  bill is due, and before a contract's last day to cancel.
- **Return and warranty**: three days before the last day to send something
  back, and a month before a warranty ends.
- **Ans Eintragen erinnern**: once a day at a time you choose ("Heute schon
  etwas ausgegeben?"), only on days without an entry of your own — and it
  falls silent by itself when the app isn't opened for five days.
- No amounts in a notification unless you switch *Beträge zeigen* on. *Als
  Nächstes* lists what is coming.

## Privacy and safety

- **Nothing leaves the device.** No account, no server, no analytics; every
  build is checked for any request to another address. Bank texts, receipts
  and QR codes are read on the phone.
- **App lock**: Face ID, Touch ID or the passcode on the iPhone, fingerprint
  or face on Android, when opening Spartopf. While it is on, Siri doesn't
  answer and Android allows no screenshots.
- **Hide amounts** (*Beträge verbergen*): every amount shows as "•••• €" — for
  using the app in public. The eye beside *Kontostand jetzt* shows them for
  30 seconds or until you leave the app; what you type stays visible, and
  VoiceOver says "Betrag verborgen". The app switcher then shows nothing to
  read either.
- **Your data, locked away** (iPhone): unreadable while the phone is locked
  (iOS Data Protection). *Im iPhone-Backup sichern* (on by default) decides
  whether the book is part of the phone's iCloud or computer backup;
  switched off, it stays on this iPhone only. On Android, *Im Gerätebackup
  sichern* does the same for Google's backup.
- **App zurücksetzen** (*Mehr › Einstellungen*) erases every month, entry, category and
  automatic backup on this device; the app then begins again with the start,
  in the phone's language and currency.

## Backup and transfer

*Mehr › Sichern und übertragen*:

- **Export and import.** Everything as one file (share sheet → Files, iCloud
  Drive, AirDrop …), and back again — also to move the book between the web
  app and a phone. The backup is **encrypted with a password by default**
  (AES-GCM, done on the device); one switch makes a readable `.json`
  instead, and old plain backups still import. Receipts are part of it.
- **CSV for Excel**: every entry, with its category, currency and tags (and
  its account, once there is more than one).
- **Automatic backups** (iPhone and Android app): a version a day, the last
  14 days and one per month for a year, kept on the device. Restoring one
  takes a tap, shows a preview and is undoable; the crash screen can restore
  the latest. After 90 days without a copy leaving the phone, a dismissable
  card reminds you to export one.

## Mehr — what is done there, and Einstellungen

The fourth tab (it was *Optionen*) holds everything that is not a month, a
statistic or a plan, on about one screen:

- **A search** on top — "Was möchtest du tun?" — over the rows below, over
  what *Einstellungen* holds ("Währung" leads there) and over the guide's
  topics.
- Two large cards: the **Anleitung**, and **Sichern und übertragen**.
- **Haushaltsbuch** — what every book has: categories and budgets,
  accounts, favourites.
- **Werkzeuge** — what you may use: importing, debts and loans, trips and
  projects, the tax list, import rules, automatic capture (iPhone).
- **Einstellungen** — one row to the screen with what is set once. On top,
  the app's card: its name and version, "ohne Konto, ohne Server", and how
  much your book holds (months and entries, never an amount). Then:
  - **Darstellung** — language, light or dark, the colour, the currency
    (picking another currency applies at once).
  - **Sicherheit und Mitteilungen** — hide amounts, the lock, reminders, the
    phone's backup.
  - **Haushaltsbuch** — the day the month begins.
  - **Ausprobieren** — the test data, in and out.
  - **Über Spartopf** — rating, feedback and the privacy policy.
  - Last, on its own, *App zurücksetzen*.

Every row has an icon in its own colour within its group; counts (21
categories, 3 favourites) sit in a small pill at the row's end.

## Look, languages, accessibility

- **A look of its own.** A cool, light canvas with a glow of the app's colour
  at the top, cards that float on a soft shadow, and an ink-blue night mode;
  light, dark or automatic. Each category brings its colour — its card's
  header, its tile, its bar, its ticks. The balance sits on a deep gradient
  card in the app's colour (eight to choose from in *Mehr › Einstellungen ›
  Darstellung*). Charts grow in with round-ended columns and smooth lines;
  cards rise in, a tick pops, the tab's symbol lands with a bounce — all of
  it off under reduced motion. On the iPhone, Apple's own fonts (SF Pro, SF
  Rounded for the money).
- **14 languages**: Deutsch, English, Türkçe, Polski, Čeština, Svenska,
  Norsk, Dansk, Français, Italiano, Español, Nederlands, Português and
  العربية (right to left, with Arabic category names; amounts typed with
  Arabic digits are understood). A new install starts in English.
- **Currency.** EUR by default; *Mehr › Einstellungen › Darstellung › Währung* switches
  to CHF, GBP, USD, SAR and more. It only relabels the amounts — nothing is
  converted.
- **Accessibility.** VoiceOver labels on everything (the paid circle is a
  real checkbox, never colour alone), larger text up to 200 %, 44-point tap
  targets, contrast checked for every colour in both themes, reduced motion.
- **Categories to choose from.** Besides the eight above, the usual
  categories of a German banking app are built in — like six of those eight
  switched off for new months until you want them: *Bekleidung, Einkäufe, Telekommunikation,
  Mobilität, Reisen, Freizeit und Unterhaltung, Sport und Hobby, Gesundheit
  und Wellness, Bildung und Erziehung, Geldanlage, Versicherungen, Bargeld,
  Steuern und Gebühren*, each with its own name suggestions. Create your own
  (income or expense, default repeat, emoji, colour), edit, drag to reorder,
  delete (undoable; asks first if entries go with it), *Standard
  wiederherstellen*.
- **Test data.** *Mehr › Einstellungen › Ausprobieren › Testdaten hinzufügen*
  (also in the guide, and on the start as *Erst mit Testdaten ansehen*) fills the
  book with a year of a family's household money — salary, child benefit,
  rent, electricity, groceries, the pharmacy, the car, a weekend away and a
  summer holiday; monthly and yearly bills (two with a price change),
  one-off spending, a split receipt, tags, a budget for every category,
  favourites, two savings pots and contracts with notice deadlines. It goes
  in beside your own entries; *Testdaten entfernen* takes out only the test
  data. Both undoable. In German when the app is in German, in English
  otherwise.
- **Über Spartopf**: rate the app in the App Store or on Google Play, send
  feedback by mail (with the app's and the system's version, nothing else),
  and the privacy policy. On the iPhone, now and then, right after something
  good — a month that saved money, a savings pot reached, a big import —
  Spartopf asks iOS for Apple's own rating prompt (at most every 120 days,
  never after trouble).

## Where it runs

- **iPhone app** (App Store): everything above. Siri, Shortcuts and automatic
  capture are iPhone only.
- **Android app** (Google Play): the same app — fingerprint or face unlock,
  no screenshots while the lock is on, *Im Gerätebackup sichern*, reports
  through the print dialog as PDF, the system back button, no Google
  services.
- **Web app**: installable from the browser and works offline. It keeps its
  own data (move it with a backup file); reminders and the lock are only in
  the phone apps.
