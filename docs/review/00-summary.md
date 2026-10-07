# Uygulama değerlendirmesi: 12 uzmanın özeti (2026-10-07)

Ekip: her alanda 2 kişi (kurucu kuralı). Brief: `docs/review/brief.md`. Ekran görüntüleri: `docs/review/screens/`. Tam raporlar bu klasörde.

Hukuki notlar hukuki tavsiye değildir.

## 1. Notlar (10 üzerinden, bugünkü TestFlight hali)

| Uzman | Geri gelme | Kalma süresi | Kopya olmama | Marka güvenliği | Kendi alanı |
|---|---|---|---|---|---|
| Mobil tasarımcı 1 | 4 | 5 | 4 | 6 | 4 (tasarım ve UX) |
| Mobil tasarımcı 2 | 4 | 5 | 5 | 6 | 3 (erişilebilirlik, hareket) |
| Mobil mühendis | 4 | 5 | 5 | 7 | 4 (uygulama ve App Store teknik) |
| Sunucu mühendisi (CTO) | 5 | 6 | 7 | 8 | 4 (sunucu ve güvenlik) |
| Davranış uzmanı | 3 | 4 | 5 | 6 | 2 (alışkanlık döngüsü) |
| Ürün stratejisti | 3 | 4 | 5 | 6 | 2 (ilk 5 dakika, ilk 7 gün) |
| Creator uzmanı | 4 | 5 | 6 | 8 | 2 (içerik üreticisi değeri) |
| Firma / reklam uzmanı | 4 | 5 | 7 | 7 | 3 (firma hazırlığı) |
| Rakip analisti | 4 | 4 | 3 | 6 | 4 (farklılaşma) |
| Pazar uzmanı | 3 | 4 | 5 | 6 | 3 (içerik ve kullanıcı değeri) |
| Hukuk (mağaza kuralları) | 4 | 5 | 6 | 7 | 5 (mağaza politikası) |
| Marka tescil uzmanı | 5 | 6 | 6 | 7 | 5 (marka ve App Store) |
| **Ortalama** | **3.9** | **4.8** | **5.3** | **6.7** | **3.4** |

Hedef: her uzmanın her notu en az 8. Bugün hiçbir uzman bu hedefte değil. Uzmanların tahmini: aşağıdaki P0 ve P1 işleri yapılınca bütün notlar 8 veya üstüne çıkar. "Geri gelme" notu gerçek veriyle (D7 en az %15) ölçülene kadar sadece bir tahmin olarak kalır.

## 2. Herkesin ortak bulduğu ana sorunlar

1. **Butonlar sessiz.** Profilini bitirmemiş ya da firma hesabı olan kullanıcıda Patlayacak ve Kaydet, görünür hiçbir şey yapmayan `router.push('/me')` çağırıyor (`PromoReel.tsx` 52 ile 62). Hatalar gizleniyor, oy ve kayıt sunucudan geri okunmuyor. Paylaş için muhtemel sebep: girişten sonra `router.replace('/me')` sekmeli ekranın ikinci bir kopyasını açık bırakıyor (`sign-in.tsx` 26).
2. **Profil boş.** Kaşif profilinde puan, seviye, bekleyen tahminler, kaydettiklerim yok. Firma profilinde logo, kapak, linkler, promo kodu, istatistik ve video yükleme yok. Veritabanı tabloları hazır, API ve ekranlar yazılmamış.
3. **Uygulama TikTok gibi görünüyor.** "For you" sekmesi, sağdaki yuvarlak buton sırası, sol alttaki firma bloğu. Bizi farklı yapan şey (tahmin et, sonucu gör, "bildim") ekranda görünmüyor.
4. **Tahminler hiç sonuçlanmıyor.** Sonuçlandırma işi yazılmamış. Ayrıca kural videonun yayına girdiği tarihe bağlı olduğu için yeni kullanıcının oyları asla sonuçlanamaz.
5. **İçerik az.** 3 firma, 21 video, 9'u İngilizce. Günlük 5 videoluk bir seçki için en az 12 aktif firma ve 60 İngilizce video lazım, ağırlıklı oyun fragmanı.
6. **Mağaza reddi riskleri.** Uygulamada Şikayet et ve Engelle butonu yok (Apple 1.2), destek emaili yok, Kullanım Şartları ve Gizlilik linkleri tıklanamıyor. Hesap silmede Apple token iptal edilmiyor. iOS'ta "Google Play'de yakında" yazıyor. "Hediyelerin kilidini aç" var olmayan bir özellik vaat ediyor. Kurucunun kendi firmaları olduğu bilgisi "daha fazla"nın arkasında gizli. App Store metninde "reklam izle" denmemeli (Apple 3.2.2).
7. **Canlı güvenlik açıkları.** Popüler listesi sahte misafir izlenmeleriyle kandırılabilir. Tek bir "reşit olmayan" şikayeti bir firmayı anında kısıtlıyor. API yazma uçlarında hız sınırı yok.
8. **30 günlük hesap silme çalışmıyor.** Günlük görev için Cloudflare'de workers.dev adresi gerekiyor (kurucu Workers & Pages sayfasını bir kez açmalı).

## 3. İş planı

### P0: App Store'a göndermeden önce

**A. Her dokunuş tepki versin** (mühendis, tasarımcılar)
* Misafire giriş, profilini bitirmemişe "Profilini tamamla", firmaya "Firmalar oy veremez" alt penceresi. Giriş sonrası aynı videoya dönülsün ve oy uygulansın.
* Titreşim ve animasyon. Oy verilince kilitlensin, 409 "zaten tahmin ettin" diye gösterilsin.
* Oy ve kayıt durumu sunucudan gelsin (`GET /v1/me/state`).
* Girişten çıkışta `router.dismiss()`. Paylaş'a `url` alanı eklensin.
* İzlenme sayımı düzeltmesi (`timeUpdateEventInterval`), alt güvenli alan, sekme değişince videonun durması, `expo-crypto`.

**B. Mağaza kuralları** (iki hukukçu)
* Her videoda "..." menüsü: Şikayet et ve Engelle. Firma sayfasında da aynısı.
* Profilde "Yardım ve yasal": support@promovote.com, Kullanım Şartları, Gizlilik ve Topluluk Kuralları linkleri.
* Hesap silmede Apple token iptali, hata gizlenmesin.
* "Hediyelerin kilidini aç" kaldırılsın. "Google Play'de yakında" sadece Android'de görünsün. Kurucu bilgisi her zaman görünsün. App Store butonu resmi rozetle ya da "App Store'da aç" yazısıyla. Resmi Google giriş butonu.
* Mağaza metinlerinde "reklam" kelimesi geçmesin: "firma ve içerik keşfetme, tahmin ve oylama topluluğu".

**C. Güvenlik** (CTO)
* Popüler: misafir izlenmesi 0 sayılsın, saniye video süresiyle sınırlansın, 100 parametre hatası düzeltilsin.
* Şikayetle otomatik kısıtlama en az 2 güvenilir şikayetten sonra olsun. Yazma uçlarına hız sınırı. Canlı ortamdan `exp://` ve RevenueCat webhook'u kaldırılsın.

**D. PromoVote'un kendi kimliği** (rakip analisti, pazar uzmanı, davranış uzmanı, tasarımcılar)
* "For you" sekmesi "Bugünün seçkisi" (Today's Drop) olsun: günde 7 video, "3 / 7" ilerleme, sonunda "Bugünlük bitti, sonuçlar 7 gün sonra" kartı ve "İzlemeye devam et" seçeneği.
* Oy verilince "Tahmin edildi. Sonuç 14 Ekim. Sen 37. kaşifsin" damgası ve logodaki çift ok animasyonu. Topluluk dağılımı sadece oy verdikten sonra gösterilsin.
* Tahmin sonuçlandırma işi: her oy kendi verildiği andan itibaren sonuçlansın (kalabalık sonucu). "Tahminin tuttu, +30" kartı.
* Profil resimlerinin etrafında renk geçişli halka yok. Düz yeşil yay kullanılsın (Instagram'a benzememek için).
* Dil önceliği hatası düzeltilsin (`fair-queue.ts`, sitede `feed.js`).

**E. Profiller** (creator, firma, ürün, davranış)
* 3 adımlı profil oluşturma: tür seçimi, Apple'dan gelen isim ve önerilen kullanıcı adı, tek bir tarih seçici (taşma hatası da çözülür). Firmalar için logo, kategori ve ana link.
* Kaşif profili: Kaşif Puanı ("nakit değeri yok"), seviye, bekleyen tahminler ve geri sayım, Kaydettiklerim, Takip ettiklerim. Çıkış ve hesap silme Ayarlar'a taşınsın.
* Firma stüdyosu: profil düzenleme (logo, kapak, bio, en fazla 8 link, ana buton türü), kurulum listesi, ücretsiz istatistik kartı (izlenme, izlenme oranı, tıklama, kayıt, takipçi, geçersiz sayılan izlenme).
* Herkese açık firma sayfası: 10 takipçinin altında "0 takipçi" yerine "Yeni firma", cihaza göre buton, video kartlarında başlık.
* 7 kategori: Oyunlar, Uygulamalar, Yayınlar, Videolar, Mağazalar, Markalar, Yerel (Yerel 20 firmaya ulaşınca açılır).

### P1: Herkese açık yayından önce
* Video yükleme (R2, telefonda 720p, ilk 3 video elle onay, admin onay kuyruğu).
* Promo kodu ve hediyeler: firma oluşturur, kaşif cüzdanına alır. Hiçbir zaman oya bağlı değil (bunu bir test kontrol eder).
* Sola kaydırma: aynı firmanın diğer videoları olduğun yerde oynar. Oy için kaydırma kullanılmayacak (yanlışlıkla oy olur, ayrıca Match Group'un kaydırma patentleri riski var).
* Günlük yerel bildirim ("Yarınki seçki saat 19'da gelsin mi?"), haftalık affedici seri, sonuç bildirimi.
* Outbound linklere UTM etiketi (firma kendi raporunda PromoVote'u görür).
* `apple-app-site-association` ve `assetlinks.json` (paylaşılan linkler uygulamada açılır).
* Sitedeki fontlar uygulamaya (Bricolage Grotesque, Inter).
* İçerik: izinli 20 ile 30 gerçek indie oyun fragmanı, en az 12 firma.
* Marka tescili: PROMOVOTE kelime markası, USPTO sınıf 9, 42 ve 35. Sosyal medya hesaplarını almak, promovote.app domaini. DMCA ajan kaydı ($6) video yükleme açılmadan önce.
* Workers Paid ($5/ay) herkese açık yayından önce.

### P2: Sonra
* Story'ler ve aylık üyelik (aşağıdaki karara göre).
* Uygulama doğrulama (App Attest, Play Integrity), ağırlıklı oylar.
* Logo marka tescili, AB ve İngiltere başvurusu.

## 4. Kurucunun kararları (2026-10-07)

* Sekmeler: 4 sekme, yeni isimler (Bugünün seçkisi, Yeni, Takımın seçimleri; Popüler Keşfet'e Listeler olarak).
* Story ve üyelik: ücretsiz firmalara haftada 1 story, Pro üyelere günde 10. Pro $9.99/ay veya $99.99/yıl, v1.1.
* Oy butonları: altta tahmin çubuğu.
* Marka tescili: sonra karar verilecek (herkese açık yayından önce).

## 4b. Kararlar öncesi seçenekler (kayıt için)

1. **Ana sayfa sekmeleri.** Uzmanların çoğu "For you" adının değişmesini istiyor. Seçenekler:
   * a) 4 sekme kalsın, isimler değişsin: Bugünün seçkisi, Yeni, Takımın seçimleri. Popüler Keşfet'e "Listeler" olarak taşınsın.
   * b) Ürün stratejistinin önerisi, 2 sekme: Bugünün seçkisi ve Takip ettiklerim. Yeni ve Popüler Keşfet'e taşınsın.
2. **Story ve aylık üyelik.** Bu, 2026-10-06 "abonelik yok" kararını değiştirir.
   * a) Pazar uzmanı: story bütün firmalara ücretsiz, adil sırayla. Üyelik 100 firma ve günde 1000 kullanıcıya ulaşınca, sadece araç satar.
   * b) Firma uzmanı: ücretsiz firmalara haftada 1 story, Pro üyelere günde 10. Pro $9.99/ay veya $99.99/yıl, v1.1'de. Görünürlük ya da rozet asla satılmaz, story'leri sadece takipçiler görür.
   * c) Ürün stratejisti ve hukuk: story satırı akışın en üstünde olmasın, sadece "Takip ettiklerim" altında olsun ve adı "Story" olmasın.
3. **Oy butonları.** Sağdaki yuvarlak sıra mı kalsın, yoksa altta logodaki çift oklu bir "tahmin çubuğu" mu olsun? 4 uzman tahmin çubuğunu öneriyor. Kopya görünümünü en çok azaltan değişiklik bu.
4. **Marka tescili.** Başvuru sahibi kim olacak (mevcut LLC, sen bireysel, ya da kuracağın yeni şirket)? Kendin mi başvuracaksın (yaklaşık $1.100) yoksa avukatla mı ($2.500 ile $4.000)? Not: niyet beyanıyla yapılan başvuru, kullanım kanıtlanmadan başka şirkete devredilemiyor.
5. **İçerik.** 20 ile 30 izinli gerçek indie oyun fragmanı bulmak için geliştiricilere ulaşmak.

## 5. Kurucunun yapacağı küçük işler

* Cloudflare panelinde **Workers & Pages** sayfasını bir kez aç (günlük görev ve 30 günlük hesap silme için).
* Poleris videosundaki **"Calm"** başlığını başka bir isimle değiştir (Calm.com'un markası).
* İstersen raporun 7.2 bölümündeki 1 saatlik marka ön aramasını kendin yap (USPTO sitesi buradan açılmadı).
