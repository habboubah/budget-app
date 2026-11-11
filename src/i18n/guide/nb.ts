import type { GuidePages } from './de';

/* The guide's pages and the tour's sentences (see ./de.ts for the rules). */
const nb: GuidePages = {
  guideIntro: 'Kort forklart. «Vis» tar deg til riktig sted.',
  guideSearch: 'Søk i veiledningen',
  guideShow: 'Vis',
  guideRead: 'lest',
  guideTourBody: 'Månedssiden i noen få steg – tar under ett minutt.',

  // The chapters (Planen is the tab’s own name).
  guideChBasics: 'Det grunnleggende',
  guideChEntering: 'Legge inn',
  guideChLooking: 'Følge opp',
  guideChImporting: 'Importere',
  guideChMore: 'Mer i husholdningsbudsjettet',
  guideChSafe: 'Sikkerhet og data',

  // The topics: a title where the feature has no label of its own in the app, and two or three sentences.
  guideBalances: 'De to saldoene',
  guideBalancesBody: '«{now}» teller det som er betalt eller mottatt – det banken viser. «{end}» regner med alt som venter. Linjen imellom viser veien dit.',
  guidePaid: 'Betalt eller venter',
  guidePaidBody: 'Sirkelen foran hver post: tom betyr venter, fylt betyr betalt. Et trykk haker av, et sveip til høyre også. Et sveip til venstre sletter – det kan angres.',
  guideMonths: 'Måneder og overføring',
  guideMonthsBody: 'Med ‹ › bytter du måned; et trykk på navnet viser alle. En ny måned starter av seg selv: saldoen overføres, og gjentakende poster blir med som ventende.',
  guideCategoriesBody: 'Hver kategori er et kort på månedssiden. Et trykk på overskriften folder det sammen; hold en post inne for å flytte den. Egne kategorier, farger og nøkkelord setter du opp under «{settings}».',
  guideSearchBody: 'Søkefeltet under månedens navn finner navn, notater, #tagger og beløp – i alle måneder. Knappen ved siden av viser bare det som venter.',
  guideDueBody: 'Ventende poster med dato står øverst i inneværende måned og kan hakes av der. Når dagen er passert, merkes de som forfalt.',
  guideAddBody: 'Trykk på den runde +. Først beløpet, så navnet – kategorien foreslår Spartopf. Over tastaturet står + − × ÷: 12,50+4,80 blir 17,30 når du lagrer.',
  guideRepeats: 'Gjentakende poster',
  guideRepeatsBody: 'Husleie, lønn, abonnementer: sett «{repeat}» i posten til hver måned, annenhver måned, hvert kvartal, hvert halvår eller hvert år. Posten kommer da tilbake av seg selv – om du vil, bare til en siste måned.',
  guideFavoritesBody: 'Det du legger inn ofte, lagrer du som favoritt i posten. Den står så over hver ny post og fyller ut navn, kategori og beløp med ett trykk.',
  guideSplit: 'Oppdeling og refusjoner',
  guideSplitBody: 'Én kvittering for flere kategorier? Åpne posten og trykk på «{split}». Kommer penger tilbake, legger du dem inn med «{refund}» der kjøpet var – det senker utgiftene og teller ikke som inntekt.',
  guideReceipts: 'Kvitteringer og tagger',
  guideReceiptsBody: '«{receipt}» legger et bilde eller en PDF ved en post; beløpet leser Spartopf rett på enheten. «# {tag}» merker poster, for eksempel #ferie – søket og statistikken finner dem igjen.',
  guideCaptureBody: 'Kortbetalinger og varsler fra banken kan legge seg inn selv – med en automatisering i appen Snarveier. Spartopf viser deg stegene.',
  guideBudgetsBody: 'Gi en kategori et budsjett per måned eller per år. Stolpen viser hvor mye som er igjen, og Spartopf sier fra når det begynner å bli lite. Det som er til overs, kan bli med til neste måned.',
  guideGoalsBody: 'En sparekrukke er et mål med beløp og dato – ferien, den nye sykkelen. Poster du knytter til den, fyller den; «{plan}» viser hvor langt du har kommet.',
  guideOutlookBody: '«{plan}» ser framover: de neste 30 dagene, de kommende månedene og reserven til regninger som bare kommer én gang i året. «{whatIf}» sjekker et kjøp på forhånd.',
  guideContractsBody: 'Alle faste kostnader på ett sted. Legg inn hvor lenge en avtale løper og hvor lenge i forveien du må si den opp – Spartopf minner deg på det i tide.',
  guideDebtsBody: 'Lån, avdrag eller penger du har lånt ut: Spartopf regner ut hva som gjenstår, når du er ferdig og hva en ekstra innbetaling endrer.',
  guideStatsBody: 'Et blikk tilbake: sparerate, inntekter og utgifter over tid, hva pengene går til og på hvilke dager. Dra fingeren over et diagram – og ⓘ forklarer hvordan et tall er beregnet.',
  guideReportsBody: 'Etter hver måned oppsummerer en rapport det som skilte seg ut; ved årets slutt kommer årsoppsummeringen. Begge kan deles som PDF.',
  guideBank: 'Importer kontobevegelser',
  guideBankBody: 'I månedens meny «⋯»: bankens CSV-fil eller kontoutskrift som PDF, eller et bilde fra bankappen. Du ser over alt før noe legges inn. Regler sorterer av seg selv neste gang.',
  guideInvoiceBody: 'Ta bilde av QR-koden på en faktura: mottaker, beløp og betalingsreferanse fylles ut som en ventende post.',
  guideExcelBody: 'Har du ført budsjettet i Excel til nå? Spartopf leser et regneark med én fane per måned og viser først hva som tas med.',
  guideReconcileBody: 'Stemmer ikke Spartopf med banken? Skriv inn det banken viser – differansen føres som en post, eller startsaldoen justeres.',
  guideAccountsBody: 'Én konto er nok for å begynne. Under «{accounts}» legger du til kontanter, en sparekonto eller flere – og overføringer mellom dem, som verken er inntekt eller utgift.',
  guideProjectsBody: 'Et eget budsjett for ferien, flyttingen eller oppussingen – om du vil, med periode og i lokal valuta.',
  guideMonthStartBody: 'Måneden din kan begynne på lønningsdagen i stedet for den 1. – da planlegger Spartopf fra lønn til lønn.',
  guidePrivate: 'Alt blir på enheten',
  guidePrivateBody: 'Ingen konto, ingen server, ingen reklame. Dataene dine forlater enheten bare når du selv eksporterer dem.',
  guideBackupBody: 'Eksporter en sikkerhetskopi med passord og les den inn på en ny enhet. CSV-eksporten til regneark finner du også der.',
  guideLock: 'Lås og skjulte beløp',
  guideLockBody: 'Under «{settings}» kan du skjule alle beløp når noen ser på – og i appen på telefonen slå på låsen, så bare du kan åpne den.',
  guideRemindersBody: 'Bli minnet på ventende poster før de forfaller – og om kvelden på å legge inn dagens utgifter. Uten beløp, til du slår dem på.',
  guideLookBody: '14 språk, lyst eller mørkt, åtte farger og valutaen din: alt under «{settings}», i «{display}».',

  // The tour of the month page, one sentence a mark.
  tourBalance: 'Øverst: det som står på kontoen nå. Under: det som er igjen ved slutten av måneden når alt som venter, er betalt.',
  tourTick: 'Et trykk på sirkelen haker av en post: betalt i stedet for venter.',
  tourMonth: 'Her bytter du måned. Gjentakende poster blir med av seg selv.',
  tourTabs: '«{stats}» ser tilbake, «{plan}» ser framover. Hele veiledningen finner du under «{settings}».',
  tourAdd: 'Og her legger du inn noe – beløpet først.',
};

export default nb;
