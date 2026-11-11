import type { GuidePages } from './de';

/* The guide's pages and the tour's sentences (see ./de.ts for the rules). */
const sv: GuidePages = {
  guideIntro: 'Kort förklarat. ”Visa” tar dig till rätt ställe.',
  guideSearch: 'Sök i guiden',
  guideShow: 'Visa',
  guideRead: 'läst',
  guideTourBody: 'Månadssidan i några steg – tar mindre än en minut.',

  // The chapters (Planen is the tab’s own name).
  guideChBasics: 'Grunderna',
  guideChEntering: 'Lägga in',
  guideChLooking: 'Följa upp',
  guideChImporting: 'Importera',
  guideChMore: 'Mer i hushållsbudgeten',
  guideChSafe: 'Säkerhet och data',

  // The topics: a title where the feature has no label of its own in the app, and two or three sentences.
  guideBalances: 'De två saldona',
  guideBalancesBody: '”{now}” räknar det som är betalt eller mottaget – det som banken visar. ”{end}” räknar med allt som väntar. Linjen däremellan visar vägen dit.',
  guidePaid: 'Betald eller väntar',
  guidePaidBody: 'Cirkeln framför varje post: tom betyder väntar, fylld betyder betald. Ett tryck bockar av, ett svep åt höger också. Ett svep åt vänster raderar – det går att ångra.',
  guideMonths: 'Månader och överföring',
  guideMonthsBody: 'Med ‹ › byter du månad; ett tryck på namnet visar alla. En ny månad startar av sig själv: saldot förs över och återkommande poster följer med som väntande.',
  guideCategoriesBody: 'Varje kategori är ett kort på månadssidan. Ett tryck på rubriken fäller ihop det; håll en post nedtryckt för att flytta den. Egna kategorier, färger och nyckelord ställer du in under ”{settings}”.',
  guideSearchBody: 'Sökfältet under månadens namn hittar namn, anteckningar, #taggar och belopp – i alla månader. Knappen bredvid visar bara det som väntar.',
  guideDueBody: 'Väntande poster med datum står högst upp i den aktuella månaden och kan bockas av där. När dagen har passerat markeras de som förfallna.',
  guideAddBody: 'Tryck på det runda +. Först beloppet, sedan namnet – kategorin föreslår Spartopf. Ovanför tangentbordet finns + − × ÷: 12,50+4,80 blir 17,30 när du sparar.',
  guideRepeats: 'Återkommande poster',
  guideRepeatsBody: 'Hyra, lön, abonnemang: ställ in ”{repeat}” i posten på varje månad, varannan månad, varje kvartal, varje halvår eller varje år. Posten kommer sedan tillbaka av sig själv – om du vill bara till en sista månad.',
  guideFavoritesBody: 'Det du lägger in ofta sparar du som favorit i posten. Den står sedan ovanför varje ny post och fyller i namn, kategori och belopp med ett tryck.',
  guideSplit: 'Dela upp och återbetalningar',
  guideSplitBody: 'Ett kvitto för flera kategorier? Öppna posten och tryck på ”{split}”. När pengar kommer tillbaka lägger du in dem med ”{refund}” där köpet var – det sänker utgifterna och räknas inte som inkomst.',
  guideReceipts: 'Kvitton och taggar',
  guideReceiptsBody: '”{receipt}” bifogar ett foto eller en PDF till en post; beloppet läser Spartopf direkt på enheten. ”# {tag}” märker poster, till exempel #semester – sökningen och statistiken hittar dem igen.',
  guideCaptureBody: 'Kortbetalningar och bankens notiser kan läggas in av sig själva – med en automation i appen Genvägar. Spartopf visar stegen.',
  guideBudgetsBody: 'Ge en kategori en budget per månad eller per år. Stapeln visar hur mycket som är kvar, och Spartopf säger till när det börjar ta slut. Det som blir över kan följa med till nästa månad.',
  guideGoalsBody: 'En sparburk är ett mål med belopp och datum – semestern, den nya cykeln. Poster som du kopplar till den fyller den; ”{plan}” visar hur långt du har kommit.',
  guideOutlookBody: '”{plan}” ser framåt: de närmaste 30 dagarna, de kommande månaderna och reserven för räkningar som bara kommer en gång om året. ”{whatIf}” prövar ett köp i förväg.',
  guideContractsBody: 'Alla fasta kostnader på ett ställe. Ange hur länge ett avtal löper och hur långt i förväg du måste säga upp det – Spartopf påminner i tid.',
  guideDebtsBody: 'Lån, avbetalningar eller utlånade pengar: Spartopf räknar ut vad som återstår, när du är klar och vad en extra betalning ändrar.',
  guideStatsBody: 'En blick bakåt: sparkvot, inkomster och utgifter över tid, vart pengarna går och vilka dagar. Dra fingret över ett diagram – och ⓘ förklarar hur en siffra är beräknad.',
  guideReportsBody: 'Efter varje månad sammanfattar en rapport det som stack ut; i slutet av året kommer årssammandraget. Båda kan delas som PDF.',
  guideBank: 'Importera kontotransaktioner',
  guideBankBody: 'I månadens meny ”⋯”: bankens CSV-fil eller kontoutdrag som PDF, eller ett foto från bankappen. Du granskar allt innan något läggs in. Regler sorterar av sig själva nästa gång.',
  guideInvoiceBody: 'Fotografera QR-koden på en faktura: mottagare, belopp och referens fylls i som en väntande post.',
  guideExcelBody: 'Har du haft budgeten i Excel hittills? Spartopf läser in ett kalkylblad med en flik per månad och visar först vad som tas med.',
  guideReconcileBody: 'Stämmer Spartopf inte med banken? Skriv in vad banken visar – skillnaden bokförs som en post, eller så justeras startsaldot.',
  guideAccountsBody: 'Ett konto räcker för att börja. Under ”{accounts}” lägger du till kontanter, ett sparkonto eller fler – och överföringar mellan dem, som varken är inkomst eller utgift.',
  guideProjectsBody: 'En egen budget för semestern, flytten eller renoveringen – om du vill med period och i den lokala valutan.',
  guideMonthStartBody: 'Din månad kan börja på lönedagen i stället för den 1:a – då planerar Spartopf från lön till lön.',
  guidePrivate: 'Allt stannar på enheten',
  guidePrivateBody: 'Inget konto, ingen server, ingen reklam. Dina data lämnar enheten bara när du själv exporterar dem.',
  guideBackupBody: 'Exportera en säkerhetskopia med lösenord och läs in den på en ny enhet. CSV-exporten för kalkylprogram finns också där.',
  guideLock: 'Lås och dolda belopp',
  guideLockBody: 'Under ”{settings}” kan du dölja alla belopp när någon tittar – och i appen på telefonen slå på låset så att bara du kan öppna den.',
  guideRemindersBody: 'Bli påmind om väntande poster innan de förfaller – och på kvällen om att lägga in dagens utgifter. Utan belopp, tills du slår på dem.',
  guideLookBody: '14 språk, ljust eller mörkt, åtta färger och din valuta: allt under ”{settings}”, i ”{display}”.',

  // The tour of the month page, one sentence a mark.
  tourBalance: 'Överst: vad som finns på kontot nu. Under det: vad som blir kvar vid månadens slut när allt som väntar är betalt.',
  tourTick: 'Ett tryck på cirkeln bockar av en post: betald i stället för väntar.',
  tourMonth: 'Här byter du månad. Återkommande poster följer med av sig själva.',
  tourTabs: '”{stats}” ser bakåt, ”{plan}” framåt. Hela guiden hittar du under ”{settings}”.',
  tourAdd: 'Och här lägger du in något – beloppet först.',
};

export default sv;
