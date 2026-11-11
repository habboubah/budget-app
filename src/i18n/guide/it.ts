import type { GuidePages } from './de';

/* The guide's pages and the tour's sentences (see ./de.ts for the rules). */
const it: GuidePages = {
  guideIntro: 'In breve. «Mostra» ti porta nel punto giusto.',
  guideSearch: 'Cerca nella guida',
  guideShow: 'Mostra',
  guideRead: 'letto',
  guideTourBody: 'La pagina del mese in pochi passi – meno di un minuto.',

  // The chapters (Planen is the tab’s own name).
  guideChBasics: 'Le basi',
  guideChEntering: 'Inserire',
  guideChLooking: 'Analizzare',
  guideChImporting: 'Importare',
  guideChMore: 'Altro nel bilancio',
  guideChSafe: 'Sicurezza e dati',

  // The topics: a title where the feature has no label of its own in the app, and two or three sentences.
  guideBalances: 'I due saldi',
  guideBalancesBody: '«{now}» conta ciò che è pagato o ricevuto – quello che mostra la tua banca. «{end}» include tutto ciò che è ancora in sospeso. La linea tra i due mostra il percorso.',
  guidePaid: 'Pagato o in sospeso',
  guidePaidBody: 'Il cerchio davanti a ogni voce: vuoto significa in sospeso, pieno significa pagata. Un tocco la spunta, e anche uno scorrimento a destra. Uno scorrimento a sinistra la elimina – e si può annullare.',
  guideMonths: 'Mesi e riporto',
  guideMonthsBody: 'Con ‹ › cambi mese; un tocco sul nome li mostra tutti. Un nuovo mese parte da solo: il saldo viene riportato e le voci ricorrenti arrivano in sospeso.',
  guideCategoriesBody: 'Ogni categoria è una scheda nella pagina del mese. Un tocco sull’intestazione la ripiega; tieni premuta una voce per spostarla. Categorie, colori e parole chiave tuoi si impostano in «{settings}».',
  guideSearchBody: 'Il campo di ricerca sotto il nome del mese trova nomi, note, #tag e importi – in tutti i mesi. Il pulsante accanto mostra solo ciò che è in sospeso.',
  guideDueBody: 'Le voci in sospeso con una data stanno in cima al mese in corso e si spuntano lì. Passato il giorno, vengono segnate come scadute.',
  guideAddBody: 'Tocca il + rotondo. Prima l’importo, poi il nome – la categoria la suggerisce Spartopf. Sopra la tastiera ci sono + − × ÷: 12,50+4,80 diventa 17,30 al salvataggio.',
  guideRepeats: 'Voci ricorrenti',
  guideRepeatsBody: 'Affitto, stipendio, abbonamenti: imposta «{repeat}» nella voce su ogni mese, ogni 2 mesi, ogni trimestre, ogni semestre o ogni anno. La voce poi torna da sola – se vuoi, solo fino a un ultimo mese.',
  guideFavoritesBody: 'Ciò che inserisci spesso salvalo come preferito dalla voce stessa. Comparirà sopra ogni nuova voce e compilerà nome, categoria e importo con un tocco.',
  guideSplit: 'Divisione e rimborsi',
  guideSplitBody: 'Uno scontrino per più categorie? Apri la voce e tocca «{split}». Quando tornano dei soldi, inseriscili con «{refund}» dove era l’acquisto – riduce la spesa e non conta come entrata.',
  guideReceipts: 'Ricevute e tag',
  guideReceiptsBody: '«{receipt}» allega una foto o un PDF a una voce; l’importo lo legge Spartopf direttamente sul dispositivo. «# {tag}» contrassegna le voci, per esempio #vacanze – la ricerca e le statistiche le ritrovano.',
  guideCaptureBody: 'I pagamenti con carta e le notifiche della banca possono registrarsi da soli – con un’automazione nell’app Comandi Rapidi. Spartopf ti mostra i passaggi.',
  guideBudgetsBody: 'Dai a una categoria un budget al mese o all’anno. La sua barra mostra quanto resta, e Spartopf ti avvisa quando sta per finire. Ciò che avanza può passare al mese successivo.',
  guideGoalsBody: 'Un salvadanaio è un obiettivo con importo e data – le vacanze, la bici nuova. Le voci che gli assegni lo riempiono; «{plan}» mostra a che punto sei.',
  guideOutlookBody: '«{plan}» guarda avanti: i prossimi 30 giorni, i mesi a venire e la riserva per le bollette che arrivano una volta l’anno. «{whatIf}» verifica un acquisto prima di farlo.',
  guideContractsBody: 'Tutti i costi fissi in un colpo d’occhio. Indica fino a quando dura un contratto e con quanto anticipo va disdetto – Spartopf te lo ricorda in tempo.',
  guideDebtsBody: 'Prestiti, rate o soldi prestati: Spartopf calcola quanto resta, quando avrai finito e cosa cambia un versamento extra.',
  guideStatsBody: 'Uno sguardo indietro: tasso di risparmio, entrate e uscite nel tempo, dove vanno i soldi e in quali giorni. Scorri il dito su un grafico – e la ⓘ spiega come è calcolata una cifra.',
  guideReportsBody: 'Dopo ogni mese un rapporto riassume ciò che è emerso; a fine anno arriva la sintesi dell’anno. Entrambi si condividono in PDF.',
  guideBank: 'Importare i movimenti bancari',
  guideBankBody: 'Nel menu «⋯» del mese: il file CSV o l’estratto conto PDF della tua banca, oppure una foto dall’app bancaria. Controlli tutto prima che venga inserito qualcosa. Le regole la volta dopo classificano da sole.',
  guideInvoiceBody: 'Fotografa il codice QR di una fattura: beneficiario, importo e causale vengono compilati, come voce in sospeso.',
  guideExcelBody: 'Finora tenevi il bilancio in Excel? Spartopf legge un foglio con una scheda per mese e mostra prima che cosa verrà ripreso.',
  guideReconcileBody: 'Spartopf e la banca non coincidono? Scrivi quello che mostra la banca – la differenza viene registrata come voce, oppure si corregge il saldo iniziale.',
  guideAccountsBody: 'Per iniziare basta un conto. In «{accounts}» aggiungi contanti, un conto risparmio o altri – e i giroconti tra loro, che non sono né entrata né uscita.',
  guideProjectsBody: 'Un budget a parte per le vacanze, il trasloco o i lavori – se vuoi, con un periodo e nella valuta locale.',
  guideMonthStartBody: 'Il tuo mese può iniziare il giorno di paga anziché il 1º – Spartopf allora pianifica da stipendio a stipendio.',
  guidePrivate: 'Tutto resta sul dispositivo',
  guidePrivateBody: 'Nessun account, nessun server, nessuna pubblicità. I tuoi dati lasciano il dispositivo solo se li esporti tu.',
  guideBackupBody: 'Esporta un backup con password e ricaricalo su un nuovo dispositivo. Lì trovi anche l’esportazione CSV per il foglio di calcolo.',
  guideLock: 'Blocco e importi nascosti',
  guideLockBody: 'In «{settings}» puoi nascondere tutti gli importi quando qualcuno guarda – e, nell’app sul telefono, attivare il blocco così la apri solo tu.',
  guideRemindersBody: 'Fatti ricordare le voci in sospeso prima della scadenza – e la sera di inserire le spese del giorno. Senza importi, finché non li attivi.',
  guideLookBody: '14 lingue, chiaro o scuro, otto colori e la tua valuta: tutto in «{settings}», sotto «{display}».',

  // The tour of the month page, one sentence a mark.
  tourBalance: 'In alto: quanto c’è ora sul conto. Sotto: quanto resterà a fine mese, una volta pagato tutto ciò che è in sospeso.',
  tourTick: 'Un tocco sul cerchio spunta una voce: pagata invece che in sospeso.',
  tourMonth: 'Qui cambi mese. Le voci ricorrenti arrivano da sole.',
  tourTabs: '«{stats}» guarda indietro, «{plan}» guarda avanti. La guida completa è in «{settings}».',
  tourAdd: 'E qui inserisci qualcosa – prima l’importo.',
};

export default it;
