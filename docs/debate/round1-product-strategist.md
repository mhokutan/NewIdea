# Product Strategist (Ürün Stratejisti) Değerlendirmesi, Round 1

## 1. Kararım

Fikir bugünkü haliyle zayıf, ama içinde güçlü bir çekirdek var: pivot gerekli. "Reklam izle, point kazan, point ile reklam geç" döngüsü kullanıcıya hiçbir şey vermiyor; bu bir sosyal medya değil, bir ceza odası. Ama "reklamların içerik olduğu, insanların yeni şey keşfetmek için kendi isteğiyle girdiği bir akış" fikri gerçek bir ihtiyaca dokunuyor; bunu dar bir nişte, keşif ürünü olarak kurarsak yaşayabilir.

## 2. Reklamveren neden para versin, kullanıcı neden gelsin?

**Kullanıcı.** İnsanlar reklamdan nefret etmez, alakasız ve zorla gösterilen reklamdan nefret eder. Kanıt: Product Hunt'ta insanlar her gün kendi isteğiyle ürün tanıtımlarına bakıyor, Steam'de oyun fragmanları izleniyor, TikTok'ta "TikTok made me buy it" bir içerik türü oldu, Super Bowl reklamları ayrıca izleniyor. Yani iş (job to be done) "reklam izlemek" değil, **"benim ilgi alanımda yeni ve iyi bir şeyi ilk ben bulayım"**. Kullanıcı point için gelmez. Point'in nakit değeri yok, partner yok, hediye yok. Böyle bir point sadece oyunlaştırma süsü olur, ana motivasyon olamaz. Geri gelme sebebi şunlar olmalı: her gün yeni şeyler çıkması, oy verip "bunu ilk ben buldum" diyebilmek, kaydettiğim şeyler listesi ve reklamverenin kendisinin verdiği gerçek fayda (indirim kodu, beta erişimi, ücretsiz deneme).

**Reklamveren.** Küçük reklamveren Meta ve Google'da para yakmaktan yorgun. Ona "daha ucuz view" satmak kaybettirir, çünkü ödüllü view düşük kaliteli kabul edilir ve YouTube ile fiyatta yarışamayız. Satılabilecek şey üç tane: (1) **kendi isteğiyle keşif yapan, niyetli bir kitle**, (2) **kreatif testi ve gerçek geri bildirim** (hangi video daha iyi, insanlar neden geçti), (3) **lansman günü görünürlüğü** (Product Hunt mantığı). Bu küçük bir indie geliştirici için 50 dolara değer.

## 3. İlk gün ürün ne olmalı ve kim için?

Bu en önemli soru ve cevabım net: **"Herkes için reklamların sosyal medyası" ile başlamayın.** Global, her kategori, web ve mobil aynı anda: bu üçü birlikte sıfır parayla ölüm reçetesi.

Önerim: **Indie oyunlar ve yeni uygulamalar için video keşif akışı.** Bir cümleyle: "Yeni oyun ve uygulamaları 30 saniyelik videolarla keşfet, oy ver, ilk deneyen ol."

Neden bu niş:
* **Arz hazır.** Indie oyun ve uygulama geliştiricilerinin zaten fragmanı ve tanıtım videosu var, dağıtım sorunu çok büyük, bütçesi küçük. Ücretsiz yüklemeye seve seve gelirler. Tavuk yumurta sorununun arz tarafı burada en kolay çözülür.
* **Talep doğal.** Oyuncular yeni oyun keşfetmeyi zaten seviyor; bu bir içerik tüketimi, katlanılan bir reklam değil.
* **Ödül sorunu çözülür.** Partner anlaşmasına gerek yok: ödülü reklamverenin kendisi verir. Steam key, beta davetiyesi, premium deneme, oyun içi eşya, indirim kodu. Point de bunları açmak için kullanılır.
* **Global ama tek dil.** İngilizce, tek kategori, tek topluluk. Global olabilir çünkü dar.

İlk sürüm (MVP) şunlardan ibaret olmalı:
1. Dikey video akışı (10 ile 45 sn), her videoda "Dene / İndir" CTA'sı ve "Kaydet".
2. Beğen, oy ver, kısa yorum. Günlük ve haftalık "En çok oy alan yeniler" listesi. Bu, "reklamların sosyal medyası" vaadinin gerçek karşılığı.
3. Skip serbest ve ücretsiz. Skip bir ceza değil, sinyaldir ("ilgilenmiyorum"). Akışı kişiselleştirir.
4. Reklamveren paneli: yükle, onay bekle, basit istatistik (izlenme, tamamlama, tıklama, skip oranı, oy).
5. Point sadece itibar ve erişim için: rozet, "erken keşifçi" seviyesi, reklamverenin koyduğu kodları açma.

İlk sürümde olmayacaklar: üç paketli abonelik, A/B test, gelişmiş targeting, native iOS ve Android uygulaması.

**Platform:** Web ve mobil aynı anda değil. Mobil öncelikli, iyi çalışan bir web uygulaması (PWA) ile başlayın. Tek kod tabanı, App Store onayı yok, ödüllü reklam kurallarıyla ilk gün uğraşmak yok, link paylaşımı kolay (her video kendi sayfası, Reddit ve Discord'da paylaşılabilir). Native uygulama, haftalık geri dönen kullanıcı kanıtlandıktan sonra.

## 4. ChatGPT ve Claude hakkında

**ChatGPT modelinde katıldıklarım:** Onay süreci (pending review) şart ve doğru. Qualified view ve funnel metriklerinin ayrı raporlanması doğru. "Up to X view" demek dürüst. Point'in nakit değeri olmaması ve feedback'in point'i etkilememesi hukuken akıllıca. 18+ başlamak doğru.

**ChatGPT modelinde katılmadıklarım:** Model ürünü değil fiyat tablosunu tasarlamış. Kullanıcısı olmayan bir platform için üç paket, add-on, slot fiyatı fazladan karmaşıklık. YouTube CPV kıyası yanıltıcı, çünkü ödüllü izlenme aynı kalitede değil. En büyük hata: skip'e point ücreti koymak. Bu, kullanıcının en temel isteğini (beğenmediğimi geçmek) cezalandırıyor ve akışı kişiselleştiren en değerli sinyali boğuyor.

**Claude'un eleştirisinde katıldıklarım:** Kullanıcı tarafının en zayıf halka olduğu, "keşif akışı" konumlandırması, skip'in veri olduğu, gerçek rakibin rewarded ad network'ler olduğu ve satış argümanının "ucuz" değil "dikkat ve geri bildirim" olması. Hepsine katılıyorum.

**Claude'da katılmadıklarım ya da eksik bulduklarım:** "Artan skip ücreti sabit ücretten iyi" demiş; bence skip hiç ücretli olmamalı. 700 DAU hesabı matematik olarak doğru ama asıl soruyu atlıyor: o 700 kişi neden her gün 15 reklam izlesin? Ve "keşif akışı" dedi ama hangi kategoride olduğunu söylemedi. Kategorisiz keşif akışı yine "her şey"dir.

**İsim hakkında:** "OnlyAds" dikkat çekici ama OnlyFans çağrışımı bir yetişkin platformu algısı yaratır, marka güvenliği isteyen reklamverenleri ve App Store incelemesini zorlar, ayrıca ticari marka riski taşır. Ürün "keşif" ise isim de keşif ve yenilik anlatmalı. Domain karar sürecini trust & safety ve legal ekibiyle birlikte netleştirelim.

## 5. En önemli 3 önerim

1. **Konumlandırmayı değiştirin: "reklam izleme uygulaması" değil, "yeni oyun ve uygulamaların video keşif akışı".** İlk 90 gün tek kategori, İngilizce, global.
2. **Ücretsiz arz ile başlayın, para sonra.** İlk 100 indie geliştirici ücretsiz yüklesin; Reddit (r/IndieDev, r/gamedev, r/androidapps), Discord ve itch.io topluluklarından elle toplayın. Ücretlendirme, kullanıcıların 7. gün geri dönüş oranı (D7 retention) örneğin yüzde 20 üzerine çıktıktan sonra tek bir basit paketle ("öne çıkarılmış lansman" veya "kreatif test raporu") başlasın.
3. **Ödülü reklamverene verdirin, point'i itibara bağlayın.** Skip ücretsiz. Point, oy ve keşif itibarı ile kazanılır ve reklamverenin koyduğu kod ve erişimleri açar. Böylece partner anlaşması ve nakit gerekmeden kullanıcıya gerçek değer verilir.

## 6. Ekibe açık sorularım

* **Ad-tech uzmanı:** Indie oyun ve uygulama için mevcut kullanıcı başı edinme maliyeti (CPI) nedir? "Kreatif test raporu" ürünü için ne kadar ödemeye razı olurlar?
* **Tüketici büyüme psikoloğu:** Gönüllü keşif akışında günlük alışkanlık nasıl oluşur? Günlük "yeni çıkanlar" ritmi mi, kişisel öneri mi daha güçlü tetikleyici?
* **Pazar yeri ekonomisti:** Arz tarafını ücretsiz açarsak, akış kalitesini nasıl koruruz? Ödemeye başlayınca organik sıralama ile ücretli öne çıkarma nasıl dengelenir?
* **Trust & safety / hukuk:** Reklamverenin verdiği kod ve key'ler "teşvikli" sayılır mı? Oylama ve yorum FTC açısından incentivized review riski taşır mı? "OnlyAds" isminin marka riski nedir?
* **CTO:** PWA ile dikey video akışı, otomatik oynatma ve sorunsuz kaydırma mobilde yeterince iyi olur mu? Bot ve sahte oy tespiti MVP'de minimum ne olmalı?
* **Creator economy uzmanı:** Bu kategoride (indie oyun, uygulama) içerik üreticileri reklamverenle kullanıcı arasında nasıl bir rol alabilir, örneğin "keşifçi" olarak kendi listelerini paylaşabilirler mi?
* **Şüpheci yatırımcı:** Product Hunt, Steam keşif kuyruğu ve TikTok'un kendisi varken bu niş neden ayrı bir ürünü taşır? Bu fikrin sonunda büyük bir şirkete mi, yoksa bir özellik olarak kopyalanmaya mı gittiğini düşünüyorsunuz?
