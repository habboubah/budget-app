import type { GuidePages } from './de';

/* The guide's pages and the tour's sentences (see ./de.ts for the rules). */
const fr: GuidePages = {
  guideIntro: 'En bref. « Montrer » vous amène au bon endroit.',
  guideSearch: 'Rechercher dans le guide',
  guideShow: 'Montrer',
  guideRead: 'lu',
  guideTourBody: 'La page du mois en quelques étapes – moins d’une minute.',

  // The chapters (Planen is the tab’s own name).
  guideChBasics: 'Les bases',
  guideChEntering: 'Saisir',
  guideChLooking: 'Analyser',
  guideChImporting: 'Importer',
  guideChMore: 'Plus dans votre budget',
  guideChSafe: 'Sécurité et données',

  // The topics: a title where the feature has no label of its own in the app, and two or three sentences.
  guideBalances: 'Les deux soldes',
  guideBalancesBody: '« {now} » compte ce qui est payé ou reçu – ce qu’affiche votre banque. « {end} » inclut tout ce qui est encore en attente. La ligne entre les deux montre le chemin.',
  guidePaid: 'Payé ou en attente',
  guidePaidBody: 'Le cercle devant chaque écriture : vide, elle est en attente ; plein, elle est payée. Un toucher la coche, un balayage vers la droite aussi. Un balayage vers la gauche la supprime – et cela s’annule.',
  guideMonths: 'Mois et report',
  guideMonthsBody: '‹ › changent de mois ; touchez son nom pour les voir tous. Un nouveau mois démarre de lui-même : le solde est reporté et les écritures récurrentes suivent, en attente.',
  guideCategoriesBody: 'Chaque catégorie est une carte sur la page du mois. Touchez son en-tête pour la replier ; maintenez une écriture pour la déplacer. Vos propres catégories, couleurs et mots-clés se règlent dans « {settings} ».',
  guideSearchBody: 'Le champ de recherche sous le nom du mois trouve noms, notes, #étiquettes et montants – dans tous les mois. Le bouton à côté n’affiche que ce qui est en attente.',
  guideDueBody: 'Les écritures en attente qui ont une date figurent en haut du mois en cours et se cochent sur place. Une fois le jour passé, elles sont marquées en retard.',
  guideAddBody: 'Touchez le + rond. D’abord le montant, puis le nom – Spartopf propose la catégorie. Au-dessus du clavier, les touches + − × ÷ : 12,50+4,80 devient 17,30 à l’enregistrement.',
  guideRepeats: 'Écritures récurrentes',
  guideRepeatsBody: 'Loyer, salaire, abonnements : réglez « {repeat} » dans l’écriture sur chaque mois, tous les 2 mois, chaque trimestre, chaque semestre ou chaque année. Elle revient ensuite d’elle-même – jusqu’à un dernier mois, si vous le souhaitez.',
  guideFavoritesBody: 'Ce que vous saisissez souvent, enregistrez-le comme favori depuis l’écriture. Il apparaît ensuite au-dessus de chaque nouvelle écriture et remplit nom, catégorie et montant d’un toucher.',
  guideSplit: 'Répartition et remboursements',
  guideSplitBody: 'Un ticket pour plusieurs catégories ? Ouvrez l’écriture et touchez « {split} ». Quand de l’argent revient, saisissez-le avec « {refund} » là où était l’achat – il réduit la dépense et ne compte pas comme un revenu.',
  guideReceipts: 'Justificatifs et étiquettes',
  guideReceiptsBody: '« {receipt} » joint une photo ou un PDF à une écriture ; Spartopf lit le montant directement sur l’appareil. « # {tag} » marque des écritures, par exemple #vacances – la recherche et les statistiques les retrouvent.',
  guideCaptureBody: 'Les paiements par carte et les notifications de votre banque peuvent s’enregistrer d’eux-mêmes – grâce à une automatisation dans l’app Raccourcis. Spartopf vous montre les étapes.',
  guideBudgetsBody: 'Donnez à une catégorie un budget par mois ou par an. Sa barre montre ce qu’il reste, et Spartopf vous prévient quand il s’épuise. Le reste peut passer au mois suivant.',
  guideGoalsBody: 'Une cagnotte est un objectif avec un montant et une date – les vacances, le nouveau vélo. Les écritures que vous lui attribuez la remplissent ; « {plan} » montre où vous en êtes.',
  guideOutlookBody: '« {plan} » regarde devant : les 30 prochains jours, les mois à venir et la réserve pour les factures qui n’arrivent qu’une fois par an. « {whatIf} » vérifie un achat avant de le faire.',
  guideContractsBody: 'Tous vos frais fixes d’un coup d’œil. Indiquez jusqu’à quand court un contrat et combien de temps à l’avance il faut le résilier – Spartopf vous le rappelle à temps.',
  guideDebtsBody: 'Crédits, mensualités ou argent prêté : Spartopf calcule ce qu’il reste, quand vous aurez fini et ce que change un versement supplémentaire.',
  guideStatsBody: 'Un regard en arrière : taux d’épargne, revenus et dépenses dans le temps, où va l’argent et quels jours. Passez le doigt sur un graphique – et le ⓘ explique comment un chiffre est calculé.',
  guideReportsBody: 'Après chaque mois, un rapport résume ce qui a marqué ; en fin d’année vient le bilan de l’année. Les deux se partagent en PDF.',
  guideBank: 'Importer les opérations bancaires',
  guideBankBody: 'Dans le menu « ⋯ » du mois : le fichier CSV ou le relevé PDF de votre banque, ou une photo de l’app bancaire. Vous vérifiez tout avant que rien ne soit saisi. Des règles classent d’elles-mêmes la fois suivante.',
  guideInvoiceBody: 'Photographiez le QR code d’une facture : bénéficiaire, montant et référence sont remplis, comme écriture en attente.',
  guideExcelBody: 'Vous teniez votre budget dans Excel ? Spartopf lit un tableau avec un onglet par mois et montre d’abord ce qui sera repris.',
  guideReconcileBody: 'Spartopf et la banque ne concordent pas ? Saisissez ce qu’affiche la banque – la différence est passée en écriture, ou le solde de départ est ajusté.',
  guideAccountsBody: 'Un compte suffit pour commencer. Dans « {accounts} », ajoutez les espèces, un compte d’épargne ou d’autres – et des virements entre eux, qui ne sont ni revenu ni dépense.',
  guideProjectsBody: 'Un budget à part pour les vacances, le déménagement ou les travaux – avec des dates et dans la devise locale, si vous le souhaitez.',
  guideMonthStartBody: 'Votre mois peut commencer le jour de la paie plutôt que le 1er – Spartopf planifie alors de salaire en salaire.',
  guidePrivate: 'Tout reste sur l’appareil',
  guidePrivateBody: 'Pas de compte, pas de serveur, pas de publicité. Vos données ne quittent l’appareil que si vous les exportez vous-même.',
  guideBackupBody: 'Exportez une sauvegarde avec un mot de passe et rechargez-la sur un nouvel appareil. L’export CSV pour tableur s’y trouve aussi.',
  guideLock: 'Verrouillage et montants masqués',
  guideLockBody: 'Dans « {settings} », vous pouvez masquer tous les montants quand quelqu’un regarde – et, dans l’app sur votre téléphone, activer le verrouillage pour être seul à l’ouvrir.',
  guideRemindersBody: 'Recevez un rappel des écritures en attente avant leur échéance – et le soir, pour saisir les dépenses du jour. Sans montants, tant que vous ne les activez pas.',
  guideLookBody: '14 langues, clair ou sombre, huit couleurs et votre devise : tout est dans « {settings} », sous « {display} ».',

  // The tour of the month page, one sentence a mark.
  tourBalance: 'En haut : ce qu’il y a sur votre compte maintenant. En dessous : ce qu’il restera en fin de mois, une fois tout ce qui est en attente payé.',
  tourTick: 'Un toucher sur le cercle coche une écriture : payée au lieu d’en attente.',
  tourMonth: 'C’est ici que vous changez de mois. Les écritures récurrentes suivent d’elles-mêmes.',
  tourTabs: '« {stats} » regarde en arrière, « {plan} » regarde devant. Le guide complet se trouve dans « {settings} ».',
  tourAdd: 'Et c’est ici que vous saisissez quelque chose – le montant d’abord.',
};

export default fr;
