import type { GuidePages } from './de';

/* The guide's pages and the tour's sentences (see ./de.ts for the rules). */
const da: GuidePages = {
  guideIntro: 'Kort forklaret. »Vis« fører dig til det rigtige sted.',
  guideSearch: 'Søg i vejledningen',
  guideShow: 'Vis',
  guideRead: 'læst',
  guideTourBody: 'Månedssiden i få trin – tager under et minut.',

  // The chapters (Planen is the tab’s own name).
  guideChBasics: 'Det grundlæggende',
  guideChEntering: 'Indtastning',
  guideChLooking: 'Opfølgning',
  guideChImporting: 'Import',
  guideChMore: 'Mere i husholdningsbudgettet',
  guideChSafe: 'Sikkerhed og data',

  // The topics: a title where the feature has no label of its own in the app, and two or three sentences.
  guideBalances: 'De to saldi',
  guideBalancesBody: '»{now}« tæller det, der er betalt eller modtaget – det, din bank viser. »{end}« regner alt det med, der afventer. Linjen imellem viser vejen derhen.',
  guidePaid: 'Betalt eller afventer',
  guidePaidBody: 'Cirklen foran hver post: tom betyder afventer, fyldt betyder betalt. Et tryk hakker af, et strøg til højre også. Et strøg til venstre sletter – det kan fortrydes.',
  guideMonths: 'Måneder og overførsel',
  guideMonthsBody: 'Med ‹ › skifter du måned; et tryk på navnet viser dem alle. En ny måned starter af sig selv: saldoen overføres, og tilbagevendende poster kommer med som afventende.',
  guideCategoriesBody: 'Hver kategori er et kort på månedssiden. Et tryk på overskriften folder det sammen; hold en post nede for at flytte den. Egne kategorier, farver og nøgleord sætter du op under »{settings}«.',
  guideSearchBody: 'Søgefeltet under månedens navn finder navne, noter, #tags og beløb – i alle måneder. Knappen ved siden af viser kun det, der afventer.',
  guideDueBody: 'Afventende poster med dato står øverst i den aktuelle måned og kan hakkes af der. Når dagen er gået, markeres de som forfaldne.',
  guideAddBody: 'Tryk på det runde +. Først beløbet, så navnet – kategorien foreslår Spartopf. Over tastaturet står + − × ÷: 12,50+4,80 bliver til 17,30, når du gemmer.',
  guideRepeats: 'Tilbagevendende poster',
  guideRepeatsBody: 'Husleje, løn, abonnementer: sæt »{repeat}« i posten til hver måned, hver anden måned, hvert kvartal, hvert halve år eller hvert år. Posten kommer så tilbage af sig selv – hvis du vil, kun til en sidste måned.',
  guideFavoritesBody: 'Det, du ofte indtaster, gemmer du som favorit i posten. Den står så over hver ny post og udfylder navn, kategori og beløb med ét tryk.',
  guideSplit: 'Opdeling og refusioner',
  guideSplitBody: 'Én kvittering til flere kategorier? Åbn posten, og tryk på »{split}«. Kommer der penge tilbage, indtaster du dem med »{refund}«, hvor købet var – det sænker udgifterne og tæller ikke som indtægt.',
  guideReceipts: 'Kvitteringer og tags',
  guideReceiptsBody: '»{receipt}« vedhæfter et foto eller en PDF til en post; beløbet læser Spartopf direkte på enheden. »# {tag}« mærker poster, for eksempel #ferie – søgningen og statistikken finder dem igen.',
  guideCaptureBody: 'Kortbetalinger og bankens notifikationer kan indtaste sig selv – med en automatisering i appen Genveje. Spartopf viser dig trinnene.',
  guideBudgetsBody: 'Giv en kategori et budget pr. måned eller pr. år. Dens bjælke viser, hvor meget der er tilbage, og Spartopf siger til, når det bliver knapt. Det, der er til overs, kan gå med til næste måned.',
  guideGoalsBody: 'En sparebøsse er et mål med beløb og dato – ferien, den nye cykel. Poster, du knytter til den, fylder den; »{plan}« viser, hvor langt du er.',
  guideOutlookBody: '»{plan}« ser fremad: de næste 30 dage, de kommende måneder og reserven til regninger, der kun kommer én gang om året. »{whatIf}« tjekker et køb på forhånd.',
  guideContractsBody: 'Alle faste udgifter samlet ét sted. Angiv, hvor længe en aftale løber, og hvor lang tid i forvejen du skal opsige den – Spartopf minder dig om det i tide.',
  guideDebtsBody: 'Lån, afdrag eller udlånte penge: Spartopf regner ud, hvad der mangler, hvornår du er færdig, og hvad en ekstra indbetaling ændrer.',
  guideStatsBody: 'Et blik tilbage: opsparingsrate, indtægter og udgifter over tid, hvad pengene går til og på hvilke dage. Før fingeren hen over et diagram – og ⓘ forklarer, hvordan et tal er beregnet.',
  guideReportsBody: 'Efter hver måned opsummerer en rapport det, der skilte sig ud; ved årets udgang kommer årsopsummeringen. Begge kan deles som PDF.',
  guideBank: 'Importer kontobevægelser',
  guideBankBody: 'I månedens menu »⋯«: bankens CSV-fil eller kontoudtog som PDF, eller et foto fra bankappen. Du gennemgår alt, før noget bliver indtastet. Regler sorterer af sig selv næste gang.',
  guideInvoiceBody: 'Tag et billede af QR-koden på en faktura: modtager, beløb og betalingsreference udfyldes som en afventende post.',
  guideExcelBody: 'Har du hidtil ført budgettet i Excel? Spartopf læser et regneark med ét faneblad pr. måned og viser først, hvad der tages med.',
  guideReconcileBody: 'Stemmer Spartopf ikke med banken? Indtast, hvad banken viser – forskellen bogføres som en post, eller startsaldoen justeres.',
  guideAccountsBody: 'Én konto er nok til at begynde. Under »{accounts}« tilføjer du kontanter, en opsparingskonto eller flere – og overførsler mellem dem, som hverken er indtægt eller udgift.',
  guideProjectsBody: 'Et særskilt budget til ferien, flytningen eller renoveringen – hvis du vil, med periode og i den lokale valuta.',
  guideMonthStartBody: 'Din måned kan begynde på lønningsdagen i stedet for den 1. – så planlægger Spartopf fra løn til løn.',
  guidePrivate: 'Alt bliver på enheden',
  guidePrivateBody: 'Ingen konto, ingen server, ingen reklamer. Dine data forlader kun enheden, når du selv eksporterer dem.',
  guideBackupBody: 'Eksporter en sikkerhedskopi med adgangskode, og indlæs den på en ny enhed. CSV-eksporten til regneark finder du også der.',
  guideLock: 'Lås og skjulte beløb',
  guideLockBody: 'Under »{settings}« kan du skjule alle beløb, når nogen kigger med – og i appen på telefonen slå låsen til, så kun du kan åbne den.',
  guideRemindersBody: 'Bliv mindet om afventende poster, før de forfalder – og om aftenen om at indtaste dagens udgifter. Uden beløb, indtil du slår dem til.',
  guideLookBody: '14 sprog, lyst eller mørkt, otte farver og din valuta: alt under »{settings}«, i »{display}«.',

  // The tour of the month page, one sentence a mark.
  tourBalance: 'Øverst: det, der står på kontoen nu. Under det: det, der er tilbage ved månedens slutning, når alt det afventende er betalt.',
  tourTick: 'Et tryk på cirklen hakker en post af: betalt i stedet for afventer.',
  tourMonth: 'Her skifter du måned. Tilbagevendende poster kommer med af sig selv.',
  tourTabs: '»{stats}« ser tilbage, »{plan}« ser fremad. Hele vejledningen finder du under »{settings}«.',
  tourAdd: 'Og her indtaster du noget – beløbet først.',
};

export default da;
