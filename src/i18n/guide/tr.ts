import type { GuidePages } from './de';

/* The guide's pages and the tour's sentences (see ./de.ts for the rules). */
const tr: GuidePages = {
  guideIntro: 'Kısaca anlatıldı. “Göster” seni doğru yere götürür.',
  guideSearch: 'Kılavuzda ara',
  guideShow: 'Göster',
  guideRead: 'okundu',
  guideTourBody: 'Ay sayfası birkaç adımda – bir dakikadan kısa sürer.',

  // The chapters (Planen is the tab’s own name).
  guideChBasics: 'Temel bilgiler',
  guideChEntering: 'Kayıt girme',
  guideChLooking: 'Değerlendirme',
  guideChImporting: 'İçe aktarma',
  guideChMore: 'Bütçe defterinde daha fazlası',
  guideChSafe: 'Güvenlik ve veriler',

  // The topics: a title where the feature has no label of its own in the app, and two or three sentences.
  guideBalances: 'İki bakiye',
  guideBalancesBody: '“{now}” ödenenleri ve gelenleri sayar – bankanın gösterdiği tutar budur. “{end}” bekleyen her şeyi de hesaba katar. Aradaki çizgi oraya giden yolu gösterir.',
  guidePaid: 'Ödendi mi, bekliyor mu',
  guidePaidBody: 'Her kalemin önündeki daire: boşsa bekliyor, doluysa ödendi. Bir dokunuş işaretler, sağa kaydırmak da. Sola kaydırmak siler – bu geri alınabilir.',
  guideMonths: 'Aylar ve devir',
  guideMonthsBody: '‹ › ile ay değiştirirsin; ayın adına dokununca hepsi görünür. Yeni ay kendiliğinden başlar: bakiye devreder, tekrarlayan kalemler bekliyor olarak gelir.',
  guideCategoriesBody: 'Her kategori ay sayfasında bir karttır. Başlığına dokununca katlanır; bir kalemi taşımak için basılı tut. Kendi kategorilerini, renklerini ve anahtar kelimelerini “{settings}” altında ayarlarsın.',
  guideSearchBody: 'Ay adının altındaki arama alanı adları, notları, #etiketleri ve tutarları bulur – bütün aylarda. Yanındaki düğme yalnızca bekleyenleri gösterir.',
  guideDueBody: 'Tarihi olan bekleyen kalemler içinde bulunulan ayın en üstünde durur ve orada işaretlenebilir. Günü geçince gecikti olarak işaretlenir.',
  guideAddBody: 'Yuvarlak + düğmesine dokun. Önce tutar, sonra ad – kategoriyi Spartopf önerir. Klavyenin üstünde + − × ÷ tuşları var: 12,50+4,80 kaydederken 17,30 olur.',
  guideRepeats: 'Tekrarlayan kalemler',
  guideRepeatsBody: 'Kira, maaş, abonelikler: kalemde “{repeat}” seçeneğini aylık, 2 ayda bir, üç ayda bir, altı ayda bir veya yıllık yap. Kalem sonra kendiliğinden geri gelir – istersen son bir aya kadar.',
  guideFavoritesBody: 'Sık girdiğin şeyi kalemin içinden favori olarak kaydet. Sonra her yeni kalemin üstünde durur; adı, kategoriyi ve tutarı tek dokunuşla doldurur.',
  guideSplit: 'Bölme ve iadeler',
  guideSplitBody: 'Tek fiş, birkaç kategori mi? Kalemi aç ve “{split}” seçeneğine dokun. Para geri gelirse onu “{refund}” ile alışverişin olduğu yere gir – harcamayı düşürür, gelir sayılmaz.',
  guideReceipts: 'Fişler ve etiketler',
  guideReceiptsBody: '“{receipt}” bir kaleme fotoğraf veya PDF ekler; tutarı Spartopf doğrudan cihazda okur. “# {tag}” kalemleri işaretler, örneğin #tatil – arama ve istatistikler onları yeniden bulur.',
  guideCaptureBody: 'Kart ödemeleri ve bankanın bildirimleri kendiliğinden kaydedilebilir – Kestirmeler uygulamasındaki bir otomasyonla. Adımları Spartopf gösterir.',
  guideBudgetsBody: 'Bir kategoriye aylık veya yıllık bütçe ver. Çubuğu ne kadar kaldığını gösterir; azalınca Spartopf haber verir. Kalan tutar sonraki aya geçebilir.',
  guideGoalsBody: 'Birikim kumbarası, tutarı ve tarihi olan bir hedeftir – tatil, yeni bisiklet. Ona bağladığın kalemler onu doldurur; “{plan}” ne kadar yol aldığını gösterir.',
  guideOutlookBody: '“{plan}” ileriye bakar: önümüzdeki 30 gün, gelecek aylar ve yılda bir gelen faturalar için ayrılan pay. “{whatIf}” bir alışverişi yapmadan önce sınar.',
  guideContractsBody: 'Tüm sabit giderlerin tek bakışta. Bir sözleşmenin ne zamana kadar sürdüğünü ve ne kadar önce iptal etmen gerektiğini gir – Spartopf zamanında hatırlatır.',
  guideDebtsBody: 'Krediler, taksitler veya verdiğin borç: Spartopf ne kadar kaldığını, ne zaman biteceğini ve ek ödemenin neyi değiştireceğini hesaplar.',
  guideStatsBody: 'Geriye bakış: tasarruf oranı, zaman içinde gelir ve gider, paranın nereye ve hangi günlerde gittiği. Parmağını bir grafiğin üzerinde gezdir – ⓘ işareti bir rakamın nasıl hesaplandığını açıklar.',
  guideReportsBody: 'Her ayın ardından bir rapor öne çıkanları özetler; yıl sonunda yıl özeti gelir. İkisi de PDF olarak paylaşılabilir.',
  guideBank: 'Hesap hareketlerini içe aktar',
  guideBankBody: 'Ayın “⋯” menüsünde: bankanın CSV dosyası veya PDF ekstresi ya da bankacılık uygulamasından bir fotoğraf. Bir şey kaydedilmeden önce hepsini kontrol edersin. Kurallar bir dahaki sefere kendiliğinden sınıflandırır.',
  guideInvoiceBody: 'Faturadaki QR kodunun fotoğrafını çek: alıcı, tutar ve açıklama bekleyen bir kalem olarak doldurulur.',
  guideExcelBody: 'Bütçeni şimdiye kadar Excel’de mi tuttun? Spartopf her ay için bir sayfası olan tabloyu okur ve önce neyin aktarılacağını gösterir.',
  guideReconcileBody: 'Spartopf ile banka uyuşmuyor mu? Bankanın gösterdiğini yaz – fark bir kalem olarak kaydedilir ya da başlangıç bakiyesi düzeltilir.',
  guideAccountsBody: 'Başlamak için tek hesap yeter. “{accounts}” altında nakit, birikim hesabı veya başkalarını eklersin – ve aralarındaki, ne gelir ne gider olan aktarımları.',
  guideProjectsBody: 'Tatil, taşınma veya tadilat için ayrı bir bütçe – istersen tarih aralığıyla ve gittiğin yerin para biriminde.',
  guideMonthStartBody: 'Ayın, 1’i yerine maaş gününde başlayabilir – Spartopf o zaman maaştan maaşa planlar.',
  guidePrivate: 'Her şey cihazında kalır',
  guidePrivateBody: 'Hesap yok, sunucu yok, reklam yok. Verilerin cihazdan yalnızca sen dışa aktarırsan çıkar.',
  guideBackupBody: 'Parolalı bir yedek dışa aktar ve yeni bir cihazda geri yükle. Tablo programları için CSV dışa aktarımı da orada.',
  guideLock: 'Kilit ve gizli tutarlar',
  guideLockBody: '“{settings}” altında, biri bakarken tüm tutarları gizleyebilirsin – telefondaki uygulamada da kilidi açabilirsin; böylece onu yalnızca sen açarsın.',
  guideRemindersBody: 'Bekleyen kalemler vadesi gelmeden hatırlatılsın – akşamları da günün harcamalarını girmen. Sen açmadıkça tutar gösterilmez.',
  guideLookBody: '14 dil, açık veya koyu görünüm, sekiz renk ve para birimin: hepsi “{settings}” altında, “{display}” bölümünde.',

  // The tour of the month page, one sentence a mark.
  tourBalance: 'Üstte: şu an hesabında olan. Altında: bekleyen her şey ödendiğinde ay sonunda kalacak olan.',
  tourTick: 'Daireye dokunmak kalemi işaretler: bekliyor yerine ödendi.',
  tourMonth: 'Ayı buradan değiştirirsin. Tekrarlayan kalemler kendiliğinden gelir.',
  tourTabs: '“{stats}” geriye, “{plan}” ileriye bakar. Kılavuzun tamamı “{settings}” altında.',
  tourAdd: 'Buradan da bir şey girersin – önce tutar.',
};

export default tr;
