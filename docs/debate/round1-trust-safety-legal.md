# Trust & Safety ve Hukuk/Uyum Lideri: Round 1 Değerlendirmesi

> Not: Bu metin hukuki tavsiye değildir. Lansmandan önce her hedef ülke için yetkin bir avukat incelemesi gerekir.

## 1. Kararım

Fikir hukuken yapılabilir, ama şu haliyle App Store'dan reddedilme riski yüksek ve "global ilk gün" planı uyum maliyeti açısından gerçekçi değil. En büyük tek risk hukuk değil, mağaza kuralı: Apple, "ağırlıklı olarak reklam göstermek için tasarlanmış uygulamaları" açıkça yasaklıyor. Ürün "reklam izleme uygulaması" değil, "keşif ve geri bildirim platformu" olarak kurulursa risk yönetilebilir hale gelir.

## 2. Reklamveren neden ödesin, kullanıcı neden gelsin?

Reklamveren için benim açımdan tek savunulabilir vaat "ucuz view" değil, "doğrulanmış, sahtekârlık filtreli dikkat ve gerçek geri bildirim". Ödüllü izlenme, kontrol edilmezse fraud mıknatısıdır. Reklamveren parasını ancak bot ve sahte hesap oranını şeffaf raporlarsak verir. Kullanıcı tarafında ise içerik gerçekten işe yarar olmalı: yeni oyun, uygulama, indirim, küçük marka keşfi. Point tek başına geri getirme sebebi olamaz, çünkü point'in nakit değeri yok (olmamalı da).

## 3. İlk gün ne olmalı, kime, ve global gerçekçi mi?

Risk açısından ilk gün önerim:

* **Önce web**, sonra mobil. Web'de App Store 3.2.2 ve Google Play rewarded ad kuralları doğrudan uygulanmaz. Ürün ve moderasyon süreci olgunlaşınca mobil başvurusu yapılır.
* **Tek pazar ve 18+**. Tercihen ABD veya tek bir AB dışı pazar. Reklamveren tarafı: kısıtsız, düşük riskli kategoriler (mobil oyun, uygulama, YouTube kanalı, e-ticaret). Alkol, kumar, kripto, finans, sağlık, dating ve siyasi reklam ilk gün tamamen kapalı.
* **Global ilk gün gerçekçi değil.** Neden: GDPR kapsamında hedefli reklam için açık rıza ve rıza yönetimi (CMP) gerekir. EU DSA Madde 26, her reklamda gerçek zamanlı olarak "bu bir reklamdır", reklamveren kimliği, ödeyen taraf ve hedefleme parametrelerinin gösterilmesini ister. Küçük işletme istisnası (Madde 19) var: 50 kişi altı ve 10 milyon Euro altı şirketler bazı yükümlülüklerden muaf. Ama Madde 24(3), ihbar ve kaldırma (Madde 16) gibi hosting yükümlülükleri yine geçerli ve büyümeyle istisna kaybolur. AB siyasi reklam regülasyonu (2024/900) da devrede, bu yüzden Meta ve Google AB'de siyasi reklamı durdurdu. Buna UK Online Safety Act, KVKK, Brezilya LGPD, ülke bazlı tüketici ve sweepstakes yasaları eklenir. Global, her ülkede ayrı reklam yasağı listesi demektir.

## 4. ChatGPT ve Claude ile neye katılıyorum, neye katılmıyorum?

**ChatGPT'nin hukuki notları:**

* Katılıyorum: yasaklı ve kısıtlı kategori listesi, ön onay (Pending Review), içerik hakları beyanı, takedown süreci, 18+ başlangıç, belge listesi. Feedback cevabının point'i etkilememesi doğru ve önemli.
* Eksik bulduklarım: (a) "Kısıtlı" kategoriler MVP'de açık olmamalı, kapalı olmalı. (b) Reklamveren kimlik doğrulaması (KYC, ödeme kartı eşleşmesi) yok; scam reklamın ana kaynağı doğrulanmamış reklamverendir. (c) Link denetimi sadece onay anında değil, sürekli olmalı (onaydan sonra hedef sayfayı değiştirme, "cloaking"). (d) Reklam etiketleme ve "neden bu reklamı görüyorum" ekranı yok. (e) Point'lerin gelecekte hediye veya paraya dönüşmesi planlanırsa, bu sweepstakes, kumar benzeri ödül ve vergi raporlama konularını açar. Point'lerin değeri olmadığı ToS'ta net yazılmalı.

**Claude'un eleştirisi:**

* Katılıyorum: kullanıcı tarafı en zayıf halka, fraud MVP'de çözülmeli, mağaza kuralları kontrol edilmeli. Kontrol ettim: Apple 3.2.2(iii), "reklam gösterimlerini veya tıklamalarını yapay olarak artırmak ve ağırlıklı olarak reklam göstermek için tasarlanmış uygulamalar" kabul edilemez diyor. Apple 3.2.2(x) ise reklam izlemeyi teşvik etmeye izin veriyor. Yani "izle, point kazan" tek başına sorun değil; sorun uygulamanın özünün reklam olması. Google'ın ödüllü reklam politikaları da benzer: doğrudan parasal ödül yasak, ödül sadece platform içinde kullanılabilir ve devredilemez olmalı, kullanıcı açıkça seçmeli, reklam kapatılabilir olmalı.
* Ek uyarı: "Keşif akışı" konumlandırması iyi, ama sadece pazarlama metni olarak kalırsa Apple incelemesinde geçmez. Gerçek kullanıcı değeri (kaydetme, arama, kategori, takip, koleksiyon) ürünün içinde görünmeli.
* Bir nokta daha: "garantili dikkat" ifadesini reklamverene satarken dikkatli olun. FTC ve AB tüketici hukuku açısından ölçülemeyen bir garanti, yanıltıcı ticari uygulama sayılabilir. "Up to X qualified views" ve iade politikası daha güvenli.

**İsim (OnlyAds):** Kesin bir şey söyleyemem, ama risk görüyorum. OnlyFans sahibi Fenix International, "Only" içeren alan adlarına karşı WIPO UDRP şikayetleri açmış. Bir WIPO kararında, şirketin "ONLY" kelimesi üzerinde tek başına hakkı olmadığı belirtilmiş; bu bizim lehimize. Ama kurucu bu ismi açıkça "OnlyFans benzetmesi" olarak seçiyor; bu, karıştırma ve itibardan yararlanma iddiası için tam da karşı tarafın kullanacağı kanıttır. Ayrıca yetişkin içerik çağrışımı Apple incelemesinde, marka güvenliği isteyen reklamverenlerde ve okul çağındaki kitlelerde sorun yaratır. Önerim: WatchAds veya tamamen bağımsız bir isim; tescilden önce USPTO, EUIPO ve WIPO taraması ve marka avukatı görüşü.

## 5. İlk 3 önerim

1. **Önce web, tek pazar, 18+, kapalı kategori listesi.** Mobil başvurusunu ürünün "reklam dışı" değeri kanıtlanınca yapın.
2. **Reklamveren doğrulama + iki katmanlı moderasyon.** Otomatik kontrol (link tarama, malware, kategori sınıflandırma) + her reklama insan onayı + onay sonrası periyodik link kontrolü + itiraz süreci.
3. **Point'leri sıfır değerli tutun ve bunu yazılı yapın.** Gerçek para veya hediye kartına geçiş ayrı bir hukuki proje olsun (sweepstakes kuralları, vergi, KYC, ülke bazlı yasaklar).

**Lansman uyum kontrol listesi:**

* [ ] ToS, Advertiser Terms, Advertising Policy, Privacy Policy, Cookie/consent, Points kuralları (nakit değeri yok, devredilemez, değiştirilebilir)
* [ ] Yaş kapısı (18+), yaş beyanı ve şüpheli hesapları kapatma süreci
* [ ] Reklam etiketi, reklamveren adı, "neden bu reklam" bilgisi (DSA uyumlu tasarım, AB'ye girmeden önce hazır olsun)
* [ ] Reklamveren KYC ve ödeme eşleşmesi
* [ ] Yasaklı ve kapalı kategori listesi, insan onayı, itiraz akışı
* [ ] DMCA ve ihbar/kaldırma formu, tekrar ihlalci politikası
* [ ] Fraud kontrolleri: cihaz parmak izi, hız limiti, emülatör tespiti, şeffaf geçersiz trafik raporu
* [ ] Veri envanteri, saklama süreleri, hesap silme özelliği (Apple bunu zorunlu tutuyor)
* [ ] Marka taraması ve isim kararı

## 6. Diğer ekip üyelerine sorularım

* **Product strategist:** Reklam dışında, Apple'ın "minimum işlevsellik" testini geçirecek gerçek özellik ne?
* **Ad-tech uzmanı:** Geçersiz trafik oranını hangi standartla (ör. MRC, IAB) ölçüp raporlayacağız?
* **Tüketici büyüme psikoloğu:** Seri ve leaderboard mekanikleri bağımlılık yapıcı tasarım (dark pattern) eleştirisine açık mı?
* **Pazar ekonomisti:** Point'lerin değeri sıfırsa, kullanıcı motivasyonu bunu kaldırır mı?
* **CTO:** İlk günden reklam etiketi, rıza kaydı ve denetim logu altyapısı kurulabilir mi?
* **Creator economy uzmanı:** Küçük YouTube kanalları kendi içeriklerinin telif haklarına sahip mi, yoksa müzik ve klip ihlalleri riski yüksek mi?
* **Skeptik yatırımcı:** Moderasyon ekibinin maliyeti, $50'lık Starter paketinde birim ekonomiyi bozuyor mu?

Kaynaklar: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google ödüllü reklam politikaları](https://support.google.com/admanager/answer/7496282), [AdMob rewarded ads policy](https://support.google.com/admob/answer/7313578), [DSA Madde 26](https://www.springlex.eu/en/packages/dsa/dsa-regulation/article-26/), [DSA Madde 19](https://www.springlex.eu/en/packages/dsa/dsa-regulation/article-19/), [WIPO UDRP kararı örneği](https://wipo.int/amc/en/domains/decisions/pdf/2022/d2022-2352.pdf).
