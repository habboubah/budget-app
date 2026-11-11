import type { GuidePages } from './de';

/* The guide's pages and the tour's sentences (see ./de.ts for the rules). */
const nl: GuidePages = {
  guideIntro: 'Kort uitgelegd. ‘Laat zien’ brengt je naar de juiste plek.',
  guideSearch: 'Zoek in de handleiding',
  guideShow: 'Laat zien',
  guideRead: 'gelezen',
  guideTourBody: 'De maandpagina in een paar stappen – duurt nog geen minuut.',

  // The chapters (Planen is the tab’s own name).
  guideChBasics: 'De basis',
  guideChEntering: 'Invoeren',
  guideChLooking: 'Terugkijken',
  guideChImporting: 'Importeren',
  guideChMore: 'Meer in je huishoudboekje',
  guideChSafe: 'Veiligheid en gegevens',

  // The topics: a title where the feature has no label of its own in the app, and two or three sentences.
  guideBalances: 'De twee saldo’s',
  guideBalancesBody: '‘{now}’ telt wat betaald of ontvangen is – wat je bank laat zien. ‘{end}’ rekent alles mee wat nog openstaat. De lijn ertussen toont de weg ernaartoe.',
  guidePaid: 'Betaald of open',
  guidePaidBody: 'Het rondje voor elke post: leeg betekent open, gevuld betekent betaald. Een tik vinkt af, naar rechts vegen ook. Naar links vegen verwijdert – dat kun je ongedaan maken.',
  guideMonths: 'Maanden en overdracht',
  guideMonthsBody: 'Met ‹ › wissel je van maand; een tik op de naam toont ze allemaal. Een nieuwe maand begint vanzelf: het saldo wordt overgedragen en terugkerende posten komen als open mee.',
  guideCategoriesBody: 'Elke categorie is een kaart op de maandpagina. Een tik op de kop klapt haar in; houd een post ingedrukt om die te verplaatsen. Eigen categorieën, kleuren en trefwoorden stel je in onder ‘{settings}’.',
  guideSearchBody: 'Het zoekveld onder de naam van de maand vindt namen, notities, #tags en bedragen – in alle maanden. De knop ernaast toont alleen wat nog openstaat.',
  guideDueBody: 'Open posten met een datum staan bovenaan in de lopende maand en kun je daar afvinken. Is de dag voorbij, dan worden ze als te laat gemarkeerd.',
  guideAddBody: 'Tik op de ronde +. Eerst het bedrag, dan de naam – de categorie stelt Spartopf voor. Boven het toetsenbord staan + − × ÷: 12,50+4,80 wordt bij het bewaren 17,30.',
  guideRepeats: 'Terugkerende posten',
  guideRepeatsBody: 'Huur, salaris, abonnementen: zet ‘{repeat}’ in de post op elke maand, elke 2 maanden, elk kwartaal, elk halfjaar of elk jaar. De post komt dan vanzelf terug – als je wilt alleen tot een laatste maand.',
  guideFavoritesBody: 'Wat je vaak invoert, bewaar je in de post als favoriet. Die staat dan boven elke nieuwe post en vult naam, categorie en bedrag in met één tik.',
  guideSplit: 'Splitsen en terugbetalingen',
  guideSplitBody: 'Eén bon voor meerdere categorieën? Open de post en tik op ‘{split}’. Komt er geld terug, voer het dan in met ‘{refund}’ waar de aankoop stond – het verlaagt de uitgaven en telt niet als inkomen.',
  guideReceipts: 'Bonnen en tags',
  guideReceiptsBody: '‘{receipt}’ voegt een foto of pdf toe aan een post; het bedrag leest Spartopf direct op het apparaat. ‘# {tag}’ markeert posten, bijvoorbeeld #vakantie – de zoekfunctie en de statistiek vinden ze terug.',
  guideCaptureBody: 'Kaartbetalingen en meldingen van je bank kunnen zichzelf invoeren – via een automatisering in de app Opdrachten. Spartopf laat je de stappen zien.',
  guideBudgetsBody: 'Geef een categorie een budget per maand of per jaar. De balk toont hoeveel er over is, en Spartopf meldt het als het krap wordt. Wat overblijft kan mee naar de volgende maand.',
  guideGoalsBody: 'Een spaarpot is een doel met een bedrag en een datum – de vakantie, de nieuwe fiets. Posten die je eraan koppelt vullen hem; ‘{plan}’ toont hoe ver je bent.',
  guideOutlookBody: '‘{plan}’ kijkt vooruit: de komende 30 dagen, de volgende maanden en de reserve voor rekeningen die maar één keer per jaar komen. ‘{whatIf}’ toetst een aankoop vooraf.',
  guideContractsBody: 'Al je vaste lasten in één overzicht. Vul in tot wanneer een contract loopt en hoe lang van tevoren je moet opzeggen – Spartopf herinnert je er op tijd aan.',
  guideDebtsBody: 'Leningen, termijnen of uitgeleend geld: Spartopf rekent uit wat er nog openstaat, wanneer je klaar bent en wat een extra aflossing verandert.',
  guideStatsBody: 'Een blik terug: spaarquote, inkomsten en uitgaven in de tijd, waar het geld heen gaat en op welke dagen. Veeg met je vinger over een grafiek – en de ⓘ legt uit hoe een getal is berekend.',
  guideReportsBody: 'Na elke maand vat een rapport samen wat opviel; aan het eind van het jaar komt het jaaroverzicht. Beide kun je als pdf delen.',
  guideBank: 'Banktransacties importeren',
  guideBankBody: 'In het menu ‘⋯’ van de maand: het csv-bestand of het pdf-afschrift van je bank, of een foto uit de bankapp. Je controleert alles voordat er iets wordt ingevoerd. Regels delen de volgende keer vanzelf in.',
  guideInvoiceBody: 'Maak een foto van de QR-code op een factuur: ontvanger, bedrag en omschrijving worden ingevuld, als open post.',
  guideExcelBody: 'Hield je je budget tot nu toe bij in Excel? Spartopf leest een werkblad met één tabblad per maand en laat eerst zien wat er wordt overgenomen.',
  guideReconcileBody: 'Kloppen Spartopf en de bank niet? Typ wat de bank laat zien – het verschil wordt als post geboekt, of het beginsaldo wordt aangepast.',
  guideAccountsBody: 'Eén rekening is genoeg om te beginnen. Onder ‘{accounts}’ voeg je contant geld, een spaarrekening of andere toe – en overboekingen daartussen, die inkomen noch uitgave zijn.',
  guideProjectsBody: 'Een eigen budget voor de vakantie, de verhuizing of de verbouwing – als je wilt met een periode en in de lokale valuta.',
  guideMonthStartBody: 'Je maand kan op betaaldag beginnen in plaats van op de 1e – Spartopf plant dan van salaris tot salaris.',
  guidePrivate: 'Alles blijft op je apparaat',
  guidePrivateBody: 'Geen account, geen server, geen reclame. Je gegevens verlaten het apparaat alleen als je ze zelf exporteert.',
  guideBackupBody: 'Exporteer een back-up met wachtwoord en zet die terug op een nieuw apparaat. De csv-export voor een spreadsheet vind je daar ook.',
  guideLock: 'Slot en verborgen bedragen',
  guideLockBody: 'Onder ‘{settings}’ kun je alle bedragen verbergen als iemand meekijkt – en in de app op je telefoon het slot aanzetten, zodat alleen jij hem opent.',
  guideRemindersBody: 'Laat je herinneren aan open posten voordat ze vervallen – en ’s avonds om de uitgaven van de dag in te voeren. Zonder bedragen, tot je ze aanzet.',
  guideLookBody: '14 talen, licht of donker, acht kleuren en je valuta: alles onder ‘{settings}’, bij ‘{display}’.',

  // The tour of the month page, one sentence a mark.
  tourBalance: 'Bovenaan: wat er nu op je rekening staat. Daaronder: wat er aan het einde van de maand overblijft als alles wat openstaat betaald is.',
  tourTick: 'Een tik op het rondje vinkt een post af: betaald in plaats van open.',
  tourMonth: 'Hier wissel je van maand. Terugkerende posten komen vanzelf mee.',
  tourTabs: '‘{stats}’ kijkt terug, ‘{plan}’ kijkt vooruit. De hele handleiding vind je onder ‘{settings}’.',
  tourAdd: 'En hier voer je iets in – eerst het bedrag.',
};

export default nl;
