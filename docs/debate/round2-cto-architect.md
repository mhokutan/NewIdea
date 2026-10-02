# CTO / Web ve Mobil Mimar: Round 2

## Fikrimi değiştirdiğim yerler

Round 1'de abonelik, view kotası ve point/skip kurallarını sprint planına koymuştum. Ürün Stratejisti, Ekonomist ve Ad-Tech Uzmanı beni ikna etti: skip ücretsiz, point itibar, abonelik yok. Bu benim işimi kolaylaştırıyor, çünkü kota ve faturalama mantığı en çok hata çıkaran kısımdı.

## Ç1. Ürünün kalbi: C (ikisi birlikte)

Ad-Tech Uzmanı ve Ekonomist ile aynı yerdeyim. Akış ve sosyal katman izleyiciyi getirir, test raporu parayı getirir; teknik olarak ikisi aynı olay verisinden (heartbeat, skip saniyesi, oy) beslenir, yani ikinci ürün neredeyse bedava. Şüpheci Yatırımcı'nın panel fikri ise kendi kitlemizi kurmayı engeller; Prolific'i sadece ilk testte kullanırım, ürün olarak değil.

## Ç2. İlk para modeli: "$29 Feedback Report", ön ödemeli tek ürün

Ekonomist ve Ad-Tech Uzmanı haklı. Stripe Checkout ile tek seferlik ödeme bir günde kurulur, abonelik ve kota haftalar alır. İlk 50 geliştiriciye yükleme ücretsiz, rapor ücretli; kredi sistemi trafik kanıtlanınca.

## Ç3. Web + mobil: tek kod tabanını savunuyorum, ama mağaza zamanlamasını değiştiriyorum

PWA isteyen Creator Economy, Büyüme Psikoloğu ve Ekonomist'e şunu söylüyorum: PWA ile Expo + React Native Web arasında seçim yapmak zorunda değiliz. Expo Router ile yazdığımız uygulama ilk günden web'de PWA olarak yayınlanır ve paylaşılabilir linkler (her trailer'ın kendi sayfası) aynen çalışır. Aynı kod EAS Build ile iOS ve Android paketine dönüşür. PWA'ya yazıp sonra native'e geçmek ise feed, video player ve gesture katmanını ikinci kez yazmak demek; bu 6 ile 8 haftalık kayıp.

Kurucuyu ve Trust & Safety'yi aynı anda memnun eden plan:

* **Hafta 1'den itibaren:** web, iOS ve Android aynı kod, aynı sprintte. Kurucu üç platformu da her hafta telefonunda görür.
* **Hafta 6:** web herkese açık. iOS TestFlight (100 kişiye kadar internal, 10,000 kişiye kadar external beta) ve Android Play Internal/Closed Testing ile Discord topluluğuna dağıtım. Bunlar "mobil var" demek ama mağaza riskine girmemek.
* **Hafta 12 ile 16:** mağaza başvurusu, sadece şu üçü varsa: kaydetme, takip, profil ve haftalık sıralama gibi reklam dışı işlevler; D7 en az yüzde 15; isim kararı verilmiş. Trust & Safety'nin 3.2.2(iii) uyarısını ciddiye alıyorum: başvuru metninde ve ekran görüntülerinde ürün "oyun keşif ve topluluk uygulaması" olarak durmalı. Önce Google Play, sonra Apple.
* **Teknik risk:** React Native Web'de dikey video kaydırma iyi çalışır, ama web'de HTML video, mobilde expo-video kullanırız; tek arayüz, iki adaptör.

## Ç4. Niş vizyonu küçültmez, doğru kapıdır

Ürün Stratejisti ile hemfikirim. Veri modelinde "kategori" alanı ilk günden olur: oyun, sonra uygulama, sonra YouTuber, sonra DTC. Genişleme bir migration değil, bir bayrak açmak olmalı.

## Ç5. Reklamveren teklifi yeterli, ama zorunlu değil teşvikli

Büyüme Psikoloğu'na katılıyorum, Trust & Safety'nin uyarısıyla: teklif oya veya yoruma bağlı olmamalı. Teknik kural: kod, izlemeden bağımsız "Kodu al" butonuyla verilir, oy ekranı ile aynı akışta değil. Key stoğu ve tekil dağıtım tablosu küçük bir iş.

## Ç6. İsim: OnlyAds değil

Herkese katılıyorum, ayrıca "ads" kelimesi ad blocker listelerine takılır ve web sürümümüz hiç açılmayabilir. Kriterler: "ad" geçmesin, 2 hece, .com veya .gg/.app alınabilir, App Store'da çakışma olmasın. Öneriler: Trailr, FirstLook, Scoutd, Wishfeed, Playpeek, Reelscout, Hypecheck. Domain ve marka taraması kurucu kararından önce.

## Ç7. Doğrulama: 3 haftalık concierge test

Şüpheci Yatırımcı'nın testini Ad-Tech Uzmanı'nın nişiyle birleştiriyorum: landing page + "$29, 2 trailer karşılaştırma raporu". Rapor için basit bir web sayfası (Next.js, tek video player, heartbeat kaydı) yaparım; 3 günlük iş ve sonradan çöpe gitmez. Başarı: 10 ödeme, 3 tekrar.

## Güncel MVP kapsamı (12 hafta, solo kurucu + AI)

* **H1 ile 2:** Monorepo (Expo + Next.js), Supabase şeması, Auth, kategori alanı, olay tablosu.
* **H3 ile 5:** Feed (web + iOS + Android), view token, heartbeat, ücretsiz skip ve skip saniyesi, Turnstile.
* **H6 ile 8:** Profil (izleyici ve geliştirici), takip, oy, kaydetme, haftalık sıralama (Postgres cron ile). Web açık, TestFlight başlar.
* **H9 ile 10:** Geliştirici paneli (web): yükleme, onay kuyruğu, kreatif test raporu (retention eğrisi, skip noktası, A/B karşılaştırma), Stripe Checkout $29.
* **H11 ile 12:** Fraud skoru v1, App Attest ve Play Integrity, paylaşılabilir sıralama sayfası ve embed rozet.
* **Yok:** abonelik, kota, point ile skip, gelişmiş hedefleme, yorumlar (moderasyon yükü, sonraki faz).

Altyapı maliyeti 1K DAU'da hâlâ ayda yaklaşık $300. Risk maliyet değil, talep.

## Benim nihai önerim

* Tek kod tabanı (Expo + React Native Web) ile web, iOS ve Android aynı anda geliştirilir; web 6. haftada açık, mobil TestFlight ve Play Testing ile, mağaza başvurusu D7 kanıtı gelince.
* Ürün C modeli: izleyici için oyun keşif akışı + profil, takip, oy, haftalık sıralama; geliştirici için kreatif test raporu.
* İlk ve tek ücretli ürün "$29 Feedback Report", Stripe Checkout; abonelik yok.
* View doğrulama ve fraud skoru ilk sprintte; rapordaki "geçersiz view" satırı satış argümanıdır.
* Kod yazmadan önce 3 hafta concierge test; isim OnlyAds değil, domain ve marka taraması ile seçilir.
