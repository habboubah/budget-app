import type { GuidePages } from './de';

/* The guide's pages and the tour's sentences (see ./de.ts for the rules). */
const en: GuidePages = {
  guideIntro: 'In brief. “Show me” takes you to the right place.',
  guideSearch: 'Search the guide',
  guideShow: 'Show me',
  guideRead: 'read',
  guideTourBody: 'The month page in a few steps – takes less than a minute.',

  // The chapters (Planen is the tab’s own name).
  guideChBasics: 'The basics',
  guideChEntering: 'Entering',
  guideChLooking: 'Looking back',
  guideChImporting: 'Importing',
  guideChMore: 'More in your budget book',
  guideChSafe: 'Security and data',

  // The topics: a title where the feature has no label of its own in the app, and two or three sentences.
  guideBalances: 'The two balances',
  guideBalancesBody: '“{now}” counts what is paid or received – what your bank shows. “{end}” includes everything still pending. The line between them shows the way there.',
  guidePaid: 'Paid or pending',
  guidePaidBody: 'The circle in front of every entry: empty means pending, filled means paid. A tap ticks it off, and so does a swipe to the right. A swipe to the left deletes – and can be undone.',
  guideMonths: 'Months and carry-over',
  guideMonthsBody: '‹ › switch the month; a tap on its name shows them all. A new month starts on its own: the balance is carried over, and recurring entries come along as pending.',
  guideCategoriesBody: 'Every category is a card on the month page. A tap on its header folds it; press and hold an entry to move it. Your own categories, colours and keywords are set up under “{settings}”.',
  guideSearchBody: 'The search field under the month’s name finds names, notes, #tags and amounts – in every month. The button beside it shows only what is still pending.',
  guideDueBody: 'Pending entries with a date stand at the top of the running month and can be ticked off right there. Once the day has passed they are marked overdue.',
  guideAddBody: 'Tap the round +. The amount first, then the name – Spartopf suggests the category. The keys + − × ÷ sit above the keyboard: 12.50+4.80 becomes 17.30 when you save.',
  guideRepeats: 'Recurring entries',
  guideRepeatsBody: 'Rent, salary, subscriptions: set “{repeat}” in the entry to monthly, every 2 months, quarterly, half-yearly or yearly. The entry then comes back on its own – until a last month, if you like.',
  guideFavoritesBody: 'Save what you enter often as a favourite, from the entry itself. It then sits above every new entry and fills in name, category and amount with one tap.',
  guideSplit: 'Splitting and refunds',
  guideSplitBody: 'One receipt for several categories? Open the entry and tap “{split}”. When money comes back, enter it with “{refund}” where the purchase was – it lowers the spending and doesn’t count as income.',
  guideReceipts: 'Receipts and tags',
  guideReceiptsBody: '“{receipt}” attaches a photo or PDF to an entry; Spartopf reads the amount right on the device. “# {tag}” marks entries, #holiday for instance – search and the statistics find them again.',
  guideCaptureBody: 'Card payments and your bank’s notifications can enter themselves – through an automation in the Shortcuts app. Spartopf shows you the steps.',
  guideBudgetsBody: 'Give a category a budget per month or per year. Its bar shows how much is left, and Spartopf tells you when it runs low. What is left can move on to the next month.',
  guideGoalsBody: 'A savings pot is a goal with an amount and a date – the holiday, the new bike. Entries you assign to it fill it up; “{plan}” shows how far you are.',
  guideOutlookBody: '“{plan}” looks ahead: the next 30 days, the coming months, and the reserve for bills that come only once a year. “{whatIf}” checks a purchase before you make it.',
  guideContractsBody: 'All your fixed costs at a glance. Enter until when a contract runs and how long ahead you must cancel – Spartopf reminds you in time.',
  guideDebtsBody: 'Loans, instalments or money you lent: Spartopf works out what is left, when you will be done and what an extra payment would change.',
  guideStatsBody: 'A look back: savings rate, income and spending over time, where the money goes and on which days. Run a finger over a chart – and the ⓘ explains how a figure is calculated.',
  guideReportsBody: 'After every month a report sums up what stood out; at the end of the year comes the year in review. Both can be shared as a PDF.',
  guideBank: 'Import bank transactions',
  guideBankBody: 'In the month’s “⋯” menu: your bank’s CSV file or PDF statement, or a photo from the banking app. You check everything before anything is entered. Rules sort it by themselves next time.',
  guideInvoiceBody: 'Take a photo of the QR code on an invoice: payee, amount and reference are filled in, as a pending entry.',
  guideExcelBody: 'Kept your budget in Excel so far? Spartopf reads a spreadsheet with one tab per month and shows first what it will take over.',
  guideReconcileBody: 'Spartopf and the bank disagree? Type in what the bank shows – the difference is booked as an entry, or the starting balance is adjusted.',
  guideAccountsBody: 'One account is enough to start. Under “{accounts}” you add cash, a savings account or others – and transfers between them, which are neither income nor spending.',
  guideProjectsBody: 'A budget of its own for the holiday, the move or the renovation – with dates and in the local currency, if you like.',
  guideMonthStartBody: 'Your month can begin on payday instead of the 1st – Spartopf then plans from salary to salary.',
  guidePrivate: 'Everything stays on your device',
  guidePrivateBody: 'No account, no server, no ads. Your data leaves the device only when you export it yourself.',
  guideBackupBody: 'Export a backup with a password and bring it back in on a new device. The CSV export for a spreadsheet is there too.',
  guideLock: 'Lock and hidden amounts',
  guideLockBody: 'Under “{settings}” you can hide every amount when someone is looking – and, in the app on your phone, switch on the lock so that only you can open it.',
  guideRemindersBody: 'Get reminded of pending entries before they are due – and in the evening to enter the day’s spending. Without amounts, unless you switch them on.',
  guideLookBody: '14 languages, light or dark, eight colours and your currency: all under “{settings}”, in “{display}”.',

  // The tour of the month page, one sentence a mark.
  tourBalance: 'At the top: what is on your account now. Below it: what will be left at the end of the month, once everything pending is paid.',
  tourTick: 'A tap on the circle ticks an entry off: paid instead of pending.',
  tourMonth: 'This is where you switch months. Recurring entries come along on their own.',
  tourTabs: '“{stats}” looks back, “{plan}” looks ahead. Under “{settings}” you’ll find the whole guide.',
  tourAdd: 'And this is where you enter something – the amount first.',
};

export default en;
