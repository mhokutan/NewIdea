# Ad-Tech ve Reklamveren Uzmanı: Round 2 Tartışması

Round 1'de "reklamverene ilk 3 ile 6 ay ücretsiz" demiştim. **Şüpheci Yatırımcı** beni ikna etti: ücretsiz yükleyen geliştirici, ödeme isteğini kanıtlamaz. Ücretsiz kalacak şey akışta yer almak. Kreatif test raporu ise ilk günden ücretli olmalı.

## Ç1. Ürünün kalbi: C (ikisi birlikte, ama sıralı)

Akış ve sosyal katman kullanıcı tarafı, test raporu reklamveren tarafı. **Ekonomist** ile aynı fikirdeyim. **Yatırımcı**nın B seçeneğine kısmen katılıyorum: ilk ayda raporu elle, ücretli panelle üretmek (concierge) doğru. Ama sadece B ile kalırsak Prolific'in bir kopyası oluruz. Ayrıca her izleyiciye para ödediğimiz için marj da hiç oluşmaz. Uzun vadeli değer, kendi isteğiyle gelen oyuncu kitlesinden doğar.

## Ç2. İlk para modeli: tek ürün, abonelik yok

**İlk ücretli ürün: "Trailer Test"**

* Fiyat: **$99**. İlk 20 müşteri için "kurucu reklamveren" fiyatı **$49**.
* İçerik: 2 trailer versiyonu, en az 200 doğrulanmış oyuncu izleyici ve 72 saat içinde rapor.
* Rapor: saniye saniye izlenme eğrisi, en çok geçilen an, %25/50/75 ve tamamlama, 😍/😐/👎 dağılımı, kazanan versiyon, wishlist ve Steam tıklaması. Geçersiz sayılan view'lar ayrı bir satırda.
* Aynı oyun için ikinci test $79 olacak. Asıl tekrar alma metriği bu.

Gerekçem şu: bir indie geliştirici Meta'da A/B test için $200 ile $500 harcıyor ve yine de "neden" sorusunun cevabını alamıyor. $99 karşılığında bir karar satıyoruz. Concierge döneminde panel maliyeti test başına yaklaşık $50 ile $75 tutar, yani $49 fiyat bilerek göze alınan bir zarar. Kendi akışımızdaki organik oyuncular arttıkça bu maliyet sıfıra yaklaşır. Aylık abonelik trafik garanti edemediğimiz için iade ve şikayet getirir. Ön ödemeli kredi (CPCV/CPC) ise ikinci faz, en az 1,000 DAU olduktan sonra.

## Ç3. Web + mobil: tek kod tabanı evet, mağaza sonra

**CTO**'nun Expo + React Native Web önerisini destekliyorum. Kurucunun "aynı anda" isteği kod düzeyinde karşılanmış olur, çünkü aynı kod web, iOS ve Android'de çalışır. Ama mağazaya başvuruyu 12. haftaya bağlamam. **Trust & Safety**'nin uyardığı Apple 3.2.2(iii) riski gerçek. Mağazaya, akışta reklam dışı değer görünür hale gelince ve D7 yüzde 15'i geçince çıkılmalı. Reklamveren paneli zaten sadece web olacak.

## Ç4. Indie oyun nişi vizyonu küçültmez, kapıyı açar

**Creator Economy** uzmanına katılıyorum: reklamverenin profili, takipçisi ve sıralaması Meta'da olmayan bir şey. Meta'da reklam bitince geriye hiçbir şey kalmaz, burada ise takipçi kalır. Reklamverenin "kalmak için sebebi" bu olur. Genişleme yolu, reklamın içerik olduğu sırayla ilerlemeli: oyunlar, uygulamalar, YouTuber kanal tanıtımları, gadget ve DTC ürünler, en son büyük markalar. Her yeni kategori, bir önceki kategoride D30 tutunması kanıtlandıktan sonra açılmalı. "Reklamların sosyal medyası" son durak, giriş kapısı değil.

## Ç5. Kullanıcı değeri: teklif teşvikli olsun, zorunlu olmasın

Teklifi zorunlu yaparsam arz tarafı daralır, çünkü key dağıtmak istemeyen geliştirici gelmez. Teklif ekleyen reklamın akışta "Teklif var" rozeti alması yeterli. **Hukuk** uzmanına katılıyorum: teklif sadece izlemeye ya da tıklamaya bağlı olabilir, olumlu yoruma ya da oya asla bağlanamaz. Aksi halde FTC açısından incentivized review riski doğar. Teklif nakit değil ve devredilemez olduğu sürece mağaza kurallarıyla da uyumlu.

## Ç6. İsim: OnlyAds değil

Ölçütlerim: içinde "ads" ve "Only" geçmemeli (ad blocker listeleri ve marka itirazı riski), oyunla sınırlı kalmamalı, kısa olmalı ve .com ya da .co alan adı müsait olmalı. Öneriler: **FirstLook, Scoutly, Spotlit, Peekly, Hypefeed, Trailr, Dropfeed, Previu**. Alan adı ve marka taraması yapılmadan hiçbiri kesinleşmez.

## Ç7. Doğrulama: 3 hafta, iki paralel test

1. **Talep testi:** Landing page ve Stripe ödeme linki. r/IndieDev, r/gamedev ve indie Discord'larında 40 geliştiriciye doğrudan ulaşılır, $49 Trailer Test önerilir. Başarı: 10 ödeme ve en az 3 ikinci test.
2. **İzleyici testi:** Haftalık "Bu haftanın en iyi 10 indie trailer'ı" sayfası. Basit bir oy formu, Reddit ve Discord'da paylaşılır. Başarı: 3 hafta üst üste geri dönen 300 oy veren kişi.

İkisi de olursa kod yazılır. Sadece ilki olursa B2B'ye ağırlık verilir.

## Benim nihai önerim

* İlk ücretli ürün "Trailer Test": $99, ilk 20 müşteriye $49. Abonelik yok.
* Akışa yükleme her zaman ücretsiz kalsın. Para view için değil, karar için alınsın.
* Expo ile tek kod tabanı kurulsun, önce web yayına çıksın. Mağaza başvurusu D7 yüzde 15'i geçince yapılsın.
* Reklamverenin profili ve takipçisi ilk günden olsun. Vizyonun tohumu bu, "kalmak için sebep" de bu.
* Kod yazmadan önce 3 haftalık test yapılsın: 10 ödeme yapan geliştirici ve 300 geri dönen oyuncu.
