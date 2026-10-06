# 04. Keşfet, sıralamalar, hashtag ve video yükleme

Tarih: 2026-10-06. Kurucu kararı. `docs/03-profiles-spec.md` ile birlikte okunur, çakışırsa bu belge geçerlidir.

Model hatırlatma: her şey ücretsiz (profil, takip, paylaşım, izleme). Para sadece ekstralardan gelir: Boost, Trailer Test, Pro istatistik. İzleyiciye asla para veya ödül verilmez.

---

## 1. Sıralamalar (Charts)

### 1.1 Listeler

| Liste | Dönem | Ne ile sıralanır |
|---|---|---|
| Günün en çok izlenenleri | Son 24 saat (her saat güncellenir) | Geçerli izlenme |
| Haftanın 10'u | ISO hafta, her pazartesi 00:00 UTC | Hit Score (03 spec ile aynı) |
| Ayın en çok izlenenleri | Takvim ayı, ayın 1'inde kesinleşir | Geçerli izlenme |
| En çok tıklanan | Gün, hafta, ay | Geçerli link tıklaması (indir, mağazaya git) |
| Yükselenler | Son 24 saat | İzlenme artış hızı, en az 50 geçerli izlenme |
| Kaşiflerin seçimi | Hafta | "Tutar" oyu oranı, en az 100 oy |

Her liste hem **genel** hem **kategori bazlı** (Oyun, Uygulama, Mağaza, İçerik üreticisi, Marka) yayınlanır.

### 1.2 Tanımlar

* **Geçerli izlenme:** en az 3 saniye ekranda, aynı izleyici ve aynı video için günde en fazla 1 kez sayılır, bot filtresinden geçmiş (Turnstile, hız limiti, cihaz ve IP kontrolü). Misafir izlenmesi sayılır ama ağırlığı 0.5'tir.
* **"En çok indirilen" yok:** App Store ve Google Play indirme sayısını bize vermez. Biz sadece **tıklamayı** ölçebiliriz. Listenin adı bu yüzden "En çok tıklanan" olur. İleride firma kendi mağaza istatistiğini bağlarsa (App Store Connect, Play Console) "doğrulanmış indirme" rozeti eklenebilir.
* **Alt sınır:** günlük listeye girmek için en az 50, aylık için en az 150 geçerli izlenme. Altındaki videolar listede çıkmaz.

### 1.3 Adalet kuralları

* **Boost sıralama satın alamaz.** Boost ile gelen izlenme ve tıklamalar sıralama hesabına **girmez**. Sıralamada sponsorlu video yoktur.
* Bir firma bir listede en fazla 2 video ile yer alabilir.
* Kurucunun kendi firmaları (Hauling Empire, Nicheable, Poleris) listede "Kurucunun yapımı" etiketini taşır.
* Hile tespit edilirse (bot, izlenme satın alma) video listeden çıkarılır, hesap incelemeye alınır.

### 1.4 Ne zaman açılır

Sıralamalar oylama ve hesaplar açıldığında yayınlanır. O zamana kadar Keşfet sayfası "Sıralamalar oylama açılınca başlar" der. **Sahte veya tahmini sayı gösterilmez.**

---

## 2. Keşfet sayfası (`/explore`)

| Bölüm | İçerik | Durum |
|---|---|---|
| Arama | Firma adı, video başlığı, hashtag, kategori | Canlı (şimdilik tarayıcıda, içerik az olduğu için) |
| Kategoriler | Tümü, Oyun, Uygulama, Mağaza. Sonra: İçerik üreticisi, Marka | Canlı |
| Hashtagler | En çok kullanılan hashtagler, tıklayınca o hashtag'in videoları | Canlı |
| Sıralamalar | Bugün, Bu hafta, Bu ay sekmeleri | Oylama açılınca |
| Firmalar | Profil kartları, takip butonu | Canlı |
| Videolar | Filtreye uyan videolar ızgarası, tıklayınca akışta açılır | Canlı |

Linkler paylaşılabilir: `/explore?cat=apps`, `/explore?tag=planner`, `/explore?q=truck`.

Hesaplar açılınca arama sunucuya taşınır (Supabase full text search), kişiye göre "Senin için" bölümü eklenir.

---

## 3. Hashtag kuralları

* Video başına **en fazla 5** hashtag.
* 2 ile 30 karakter, harf (Türkçe ve diğer diller dahil), rakam ve alt çizgi. Boşluk yok. Küçük harfe çevrilerek saklanır (`#Planner` ve `#planner` aynıdır).
* **Yasak liste:**
  * kapalı kategoriler (kumar, kripto, alkol, dating, siyaset, sağlık iddiası)
  * hakaret ve nefret
  * "free money", "giveaway" gibi yanıltıcı ifadeler
* **Başka markanın adı** hashtag olarak kullanılabilir ama "resmi" gibi görünemez. Örnek: `#nike` serbest, `#nikeofficial` yasak. Marka şikayet ederse kaldırılır.
* Videoyla alakasız popüler hashtag eklemek (hashtag spam) yasak. Moderasyon bunu kontrol eder, tekrarında hashtag hakkı 30 gün kapanır.
* Hashtag sayfası sadece organik videoları sıralar. Sponsorlu video varsa ayrı ve etiketli gösterilir.

---

## 4. Video yükleme (firma ve içerik üreticisi)

### 4.1 Ücretsiz limitler

| Kural | Değer |
|---|---|
| Video süresi | 10 ile 60 saniye |
| Format | Dikey 9:16 önerilir, yatay video bulanık arka planla dikeye çevrilir |
| Dosya | MP4 veya MOV, en fazla 200 MB |
| Haftalık yükleme | Yeni hesap ilk hafta 2, sonra haftada 3 video |
| Aynı anda yayında | En fazla 15 video |
| İlk 3 video | Elle onaydan geçer, sonra otomatik moderasyon + rastgele kontrol |

### 4.2 Yükleme formu

| Alan | Zorunlu | Kurallar |
|---|---|---|
| Video | Evet | Yükleme hakkı onayı ("bu videonun hakları bende") |
| Başlık | Evet | 3 ile 60 karakter |
| Açıklama | Hayır | En fazla 280 karakter, link yazılamaz (link sadece link alanında) |
| Kategori | Evet | Listeden seçilir |
| Hashtag | Hayır | En fazla 5, bölüm 3 kuralları |
| Dil | Evet | Videonun dili (akıştaki dil önceliği için) |
| Ana link | Hayır | Bölüm 4.3 güvenlik kontrolü |
| Buton türü | Link varsa evet | İndir (App Store, Google Play), Mağazaya git, İzle, Web sitesi |
| Promo kodu | Hayır | Bölüm 4.4 |

### 4.3 Link güvenliği (spam link olmasın)

Her link yayına girmeden önce:

1. **Https zorunlu.** Link kısaltıcılar (bit.ly, tinyurl vb.) yasak.
2. **Yönlendirmeler sunucuda takip edilir.** Son adres kontrol edilir.
3. **Kara listede mi bakılır.** Google Safe Browsing, URLhaus ve kendi kara listemiz kullanılır.
4. **Alan adı uyumu:** Link, profilde doğrulanmış bir alan adına veya bilinen mağazalara gidiyorsa hızlı onay alır. Bilinen mağazalar: App Store, Google Play, Steam, Etsy, Shopify, YouTube, Twitch. Başka bir alan adıysa elle onaya düşer.
5. **Tekrar tarama:** Yayındaki linkler her gün yeniden taranır. Sorun çıkarsa video otomatik durdurulur, firmaya email gider.
6. **Etiket:** Kullanıcı linke tıklayınca dış siteye gittiği yazılır, link `rel="sponsored noopener"` taşır.

### 4.4 Promo kodu ve hediyeler

| Alan | Kural |
|---|---|
| Kod | 3 ile 30 karakter, harf ve rakam |
| Teklif metni | Örnek "Tüm mağazada %25 indirim", en fazla 60 karakter |
| Bitiş tarihi | Zorunlu, en fazla 6 ay sonra |
| Tek kullanım | Firma işaretler (bilgi amaçlı, kontrolü firmanın sitesinde) |
| Bölge | Opsiyonel (örnek: sadece ABD) |
| Kod linki | Opsiyonel, ana link ile aynı güvenlik kontrolü |

Kurallar:

* **Kod sadece email ile kayıtlı ve emaili doğrulanmış kullanıcılara gösterilir.** Sayfa kaynağında görünmez, sunucudan gelir (bugün Nicheable'da çalışan sistemin aynısı).
* Kod **oy, yorum veya takip karşılığı verilmez.** Herkes aynı şekilde alır.
* Firma kodun kendisine ait olduğunu ve çalıştığını onaylar. Kod çalışmazsa kullanıcı "Kod çalışmıyor" diyebilir. 5 şikayette kod otomatik durur, firmaya email gider.
* Steam key, beta daveti gibi tek kullanımlık kodlar için ileride kod havuzu eklenecek: firma liste yükler, her kullanıcıya bir tane verilir.
* Kapalı kategorilerde (kumar, kripto vb.) promo kodu yok.

---

## 5. Uygulama sırası

| Aşama | Ne | Durum |
|---|---|---|
| A | Keşfet sayfası: arama, kategori, hashtag, firma kartları, video ızgarası (statik içerikle) | Bu oturumda yapıldı |
| B | Hesaplar (Supabase auth), email doğrulama | Sırada |
| C | Yükleme formu, Cloudflare Stream, link güvenlik taraması, moderasyon kuyruğu | B'den sonra |
| D | İzlenme ve tıklama sayımı (sunucu), bot filtresi | C ile birlikte |
| E | Sıralamalar: günlük, haftalık, aylık | D yeterli veri toplayınca |
| F | Promo kodu formu ve kod havuzu | C'den sonra |
