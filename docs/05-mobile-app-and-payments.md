# 05. Mobil uygulama önce, ödeme sadece uygulama içinden

Tarih: 2026-10-06. Kurucu kararı. Bu belge, ödeme konusunda `01-team-verdict.md` ve `03-profiles-spec.md` içindeki Stripe notlarının yerine geçer.

Not: bu belgedeki vergi ve hukuk notları hukuki veya mali tavsiye değildir. Muhasebeci ile teyit edilmeli.

---

## 1. Kararlar

* **Önce mobil uygulama** yapılır: iOS ve Android, Expo (React Native) ile tek kod tabanı. Web sitesi vitrin, akış ve Keşfet olarak kalır, ödeme almaz.
* **Ödeme sadece uygulama içinden** alınır: Apple In-App Purchase ve Google Play Billing. Stripe şimdilik yok.
* Satılanlar dijital hizmet olduğu için zaten uygulama içi satın alma zorunlu:
  * **Boost (öne çıkarma):** Tüketilebilir (consumable) ürün olarak satılır. Örnek paketler: 1 gün, 3 gün, 7 gün.
  * **Trailer Test raporu:** Tüketilebilir ürün.
  * **Pro istatistik:** İleride gelecek, aylık abonelik olabilir. Bu, firmaya satılan bir araçtır. İzleyiciye para verme anlamına gelmez.
* Fiyatlar Apple ve Google'ın sabit fiyat basamaklarından seçilir. Örnek: $4.99, $9.99, $19.99.

## 2. Komisyon ve maliyet

| | Apple | Google |
|---|---|---|
| Normal komisyon | %30 | %30 |
| Küçük işletme | **%15** (App Store Small Business Program, yıllık 1 milyon dolar altı, başvuru gerekir) | **%15** (yıllık ilk 1 milyon dolar, Play Console'da hesap grubuna kayıt gerekir) |
| Vergi (sales tax, KDV) | Apple toplar ve öder | Google toplar ve öder |

* Satın alma kontrolü için **RevenueCat** kullanılır. Aylık 2.500 dolar gelire kadar ücretsiz, sonra %1. Makbuz doğrulama, iade bildirimi, iOS ve Android tek panel sağlar.
* ABD'de Apple ve Google artık uygulamadan web ödemesine link vermeye izin veriyor (mahkeme kararları, 2025). Gelir büyüyünce komisyonu düşürmek için web ödemesi sonradan eklenebilir. Şimdilik gerek yok.

## 3. Fatura (invoice) kimin işi

* Apple ve Google satışta **satıcı tarafı (merchant of record)** olur.
* **Alıcıya makbuzu Apple ve Google otomatik email ile gönderir.** Bizim alıcıya fatura kesmemiz gerekmez. Resmi fatura isteyen alıcı bunu Apple (reportaproblem.apple.com) veya Google Play sipariş geçmişinden alır.
* Satış vergisini Apple ve Google toplar ve öder. Biz eyalet eyalet sales tax ile uğraşmayız.
* Bize ödeme Apple ve Google'dan gelir: aylık ödeme ve finans raporu (App Store Connect ve Play Console). Muhasebede gelir olarak bu net ödemeler ve raporlar kullanılır.
* Apple ve Google bize alıcının adını, adresini veya kart bilgisini vermez. Bu iyi bir şey, çünkü tutmamız gereken hassas veri yok.

## 4. Profil oluştururken ne istenir

Kural: **ihtiyacımız olmayan veriyi toplamayız.** Bu, gizlilik yasaları (GDPR, CCPA) ve Apple App Privacy etiketi için önemli. Ödeme Apple ve Google'da olduğu için **adres, fatura bilgisi ve kart bilgisi istenmez.**

| Alan | Kaşif (izleyici) | Firma / içerik üreticisi | Neden |
|---|---|---|---|
| Email veya Sign in with Apple / Google | Evet | Evet | Giriş ve doğrulama |
| Kullanıcı adı (@handle) | Evet | Evet | Profil adresi |
| Doğum yılı | Evet | Evet | 18+ kontrolü |
| Ülke | Otomatik (değiştirilebilir) | Otomatik | Dil önceliği, yasal kurallar |
| Dil | Otomatik | Otomatik | Akış önceliği |
| Firma / marka adı | | Evet | Profil |
| Kategori, hashtag | | Evet | Keşfet |
| Linkler (App Store, Etsy, YouTube...) | | Opsiyonel | Doğrulama, güvenlik taraması |
| Şirket adı, vergi no, adres | Hayır | **Hayır** (şimdilik) | Gerek yok, ödeme Apple ve Google'da |

İleride firmalara para ödeyeceksek (örnek: içerik üreticisine gelir paylaşımı), o zaman vergi formu (W-9 / W-8BEN) ve ödeme bilgisi gerekir. O zamana kadar toplanmaz.

## 5. Apple ve Google'ın zorunlu kuralları (onay için)

* **Hesap silme uygulama içinden** yapılabilmeli (Apple 5.1.1(v)).
* Google ile giriş varsa **Sign in with Apple** da olmalı (Apple 4.8).
* Kullanıcı içeriği olan uygulama (Apple 1.2):
  * içerik şikayet etme
  * kullanıcı engelleme
  * moderasyon
  * kullanım şartları (EULA) kabulü
  * 24 saat içinde şikayetlere yanıt
* Yaş derecesi 18+, kumar ve sahte ödül yok. Kaşif Puanı parayla alınmaz, parayla satılmaz.
* Satın alınan Boost başka bir uygulamada veya web'de "açılamaz". Her şey uygulama içinde kalır.
* İadeleri Apple ve Google yapar. İade bildirimi gelince Boost otomatik durur.

## 6. Altyapı: her şey Cloudflare'de (kurucu kararı 2026-10-06)

Supabase kullanılmaz. Kurucunun Supabase'teki projeleri (hauling-empire ve diğeri) **ayrı projelerdir, PromoVote onlara dokunmaz.**

| İhtiyaç | Cloudflare |
|---|---|
| Veritabanı | D1 `promovote-db` (canlı) |
| API | Worker `promovote-api`, adres `https://api.promovote.com` (canlı), kod `services/api/` |
| Giriş | Better Auth (email ile 6 haneli kod; Apple ve Google ile giriş anahtarlar gelince) |
| Video | Stream (yükleme açılınca) |
| Resim | R2 (yükleme açılınca) |
| Email | Email Sending (kurucunun açması gerekiyor, aşağıya bak) |
| Ödeme | RevenueCat webhook, `POST /v1/webhooks/revenuecat` |

Tablolar `services/api/migrations/` içinde:

* `0001_auth.sql`: giriş tabloları
* `0002_core.sql`: profiller, videolar, oylar, takip, izlenme, şikayet, hediye kodları, satın almalar, boost
* `0003_seed_launch.sql`: kurucunun 3 firması ve 21 videosu

**Kurucunun 3 firması 3 ayrı hesaptır:** Hauling Empire, Nicheable, Poleris. Sahipleri `founder+<handle>@promovote.com` adresli yer tutucu hesaplar, yönetimi Claude'da. Kurucu isterse ileride kendi emailine devredilir.

Açık işler (kurucu):

1. **Email Sending'i aç.** Dashboard > Email > Email Sending > promovote.com. Ya da API token'a "Email Sending" izni ver. Açılana kadar giriş kodu emaili gitmez.
2. **Workers sayfasını bir kez aç.** Dashboard > Workers & Pages. Bu, workers.dev alt alanını oluşturur. Günlük temizlik görevi (cron) bunu istiyor.

## 7. Web sitesi uygulamalar onaylanınca

* Ana akış ve Keşfet uygulamaya yönlendirir: "Uygulamada izle" ekranı, App Store ve Google Play butonları.
* **Paylaşılan linkler çalışmaya devam eder.** `/@handle` ve tek video linki (`/?v=...`) web'de o videoyu ve profili gösterir, altında "Devamı uygulamada" butonu olur. Instagram ve TikTok da web'de paylaşılan tek videoyu gösterir, sonra uygulamaya çağırır. Sebep: WhatsApp veya Google'dan gelen yeni kişi linke tıklayıp boş sayfa görürse kaybolur.
* Uygulama yüklüyse linkler direkt uygulamada açılır (iOS Universal Links, Android App Links).

## 8. Para kazanan içerik üreticileri (ileride)

Instagram ve TikTok gibi: ödeme bilgisi sadece para kazanma programına katılınca istenir. O zaman uygulama içinden:

* vergi formu (W-9 veya W-8BEN)
* kimlik doğrulama
* banka bilgisi

istenir. Bu bilgiler bizim veritabanımızda değil, ödeme sağlayıcısında (örnek Stripe Connect) tutulur. O güne kadar kimseden toplanmaz.

## 9. Uygulama sırası

1. ~~Veritabanı ve API~~ Yapıldı (Cloudflare D1 + Worker, api.promovote.com).
2. Expo uygulaması:
   * giriş
   * akış (web'deki adil sıra mantığı sunucuya taşınır)
   * Keşfet (Instagram / TikTok tarzı, `04` bölüm 2.1)
   * profil
3. Video yükleme + Cloudflare Stream + moderasyon kuyruğu + link taraması.
4. RevenueCat + Boost ürünleri.
5. TestFlight ve Google kapalı test.
6. Mağaza başvurusu.
