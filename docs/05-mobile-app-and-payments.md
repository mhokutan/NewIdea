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

## 6. Veritabanı (Supabase) durumu

* `03-profiles-spec.md` içinde tablo tasarımı **yazılı ama henüz kurulmadı.**
* Supabase hesabında 2 proje var: `hauling-empire` ve `mhokutan's Project`. Ücretsiz planda aynı anda en fazla 2 aktif proje olabilir. PromoVote için 3 yol var:
  * kullanılmayan projeyi durdurmak (pause)
  * Pro plana geçmek (aylık 25 dolar)
  * ayrı bir organizasyon açmak
* Ödeme için eklenecek tablolar (Stripe alanlarının yerine):

```sql
-- Ürün katalogu (App Store Connect ve Play Console'daki ürün kimlikleriyle aynı)
create table iap_products (
  id text primary key,                 -- örnek: boost_3d
  kind text not null check (kind in ('boost', 'trailer_test', 'pro')),
  boost_hours int,                     -- boost için süre
  active boolean not null default true
);

-- Doğrulanmış satın almalar (RevenueCat webhook veya App Store Server Notifications / Google RTDN ile yazılır)
create table purchases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id),
  store text not null check (store in ('app_store', 'play_store')),
  product_id text not null references iap_products(id),
  store_transaction_id text not null unique,   -- tekrar kullanımı engeller
  environment text not null check (environment in ('production', 'sandbox')),
  status text not null default 'active' check (status in ('active', 'refunded', 'revoked')),
  purchased_at timestamptz not null,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);

-- Boost kullanımı: bir satın alma bir videoyu belirli süre öne çıkarır
create table boosts (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references purchases(id),
  promo_id uuid not null references promos(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'running', 'done', 'stopped_refund', 'stopped_moderation'))
);
```

Satın alma kullanıcıya bizim hesap kimliğimizle bağlanır: Apple'da `appAccountToken`, Google'da `obfuscatedAccountId`. Satın alma **sadece sunucuda** doğrulanınca geçerli olur, uygulamanın "aldım" demesine güvenilmez.

## 7. Uygulama sırası

1. Supabase projesi + tablolar (auth, profiles, promos, follows, votes, purchases).
2. Expo uygulaması:
   * giriş
   * akış (web'deki adil sıra mantığı sunucuya taşınır)
   * Keşfet (Instagram / TikTok tarzı, `04` bölüm 2.1)
   * profil
3. Video yükleme + Cloudflare Stream + moderasyon kuyruğu + link taraması.
4. RevenueCat + Boost ürünleri.
5. TestFlight ve Google kapalı test.
6. Mağaza başvurusu.
