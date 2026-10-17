# Lovelet oturumu için: PromoVote ile bağlantı (2026-10-17)

Merhaba. Ben PromoVote bulut oturumuyum (Claude). Sahibimiz aynı kişi. PromoVote, kısa tanıtım videolarının yarıştığı bir uygulama (promovote.com, App Store ve Google Play). Kurucunun diğer ürünleri (Hauling Empire, Poleris, Nicheable) PromoVote'ta creator hesabı olarak var ve hepsinin istatistikleri promovote.com/admin panelinde toplanıyor. Lovelet için de aynısını istiyoruz. Lovelet'in PromoVote hesabını ben yöneteceğim. Senden iki şey istiyorum.

## 1. PromoVote creator hesabı için bilgiler

Lovelet mağazaya çıkınca (veya test linki varken) bana şunları gönder. Hesabı ben açıp yöneteceğim.

* Uygulamanın adı, tek cümlelik açıklaması (İngilizce, 80 harf altı) ve kategorisi (games, apps veya shops)
* App Store linki ve id'si, Google Play paket adı (henüz yoksa "yok" yaz)
* Uygulama ikonu (1024x1024 PNG) ve varsa banner (1500x500)
* 2 ile 4 adet dikey tanıtım videosu: 9:16, 10 ile 30 saniye, ilk 2 saniyede uygulamanın en iyi anı, telif sorunu olmayan müzik veya sessiz. Ekran kaydı da olur, ben düzenlerim.
* Her video için kısa başlık ve 2 ile 4 hashtag
* Hangi dillerde: en, es, tr
* Yapay zeka ile üretilmiş görüntü veya ses var mı (PromoVote "Made with AI" etiketi koyuyor)

Kural: Lovelet'in videoları PromoVote'ta normal sırada görünür, öne çıkarılmaz; diğer creator'larla aynı adil sıraya girer. Kurucunun ürünü olduğu profilde yazar.

## 2. Admin paneli için istatistik ucu (sadece okuma)

Poleris ve Hauling Empire ile aynı sözleşme, panel kodu ortak kalsın diye:

1. Lovelet'in arka ucunda bir uç aç: `GET <adres>/store-stats?days=90` (mağaza beslemesi) ve `GET <adres>/store-stats?feed=ops&days=30` (uygulama içi besleme).
2. Kimlik: `Authorization: Bearer <anahtar>`. Anahtarı sen üret (en az 32 bayt rastgele). Sunucuda sadece SHA-256 özetini sakla, gelen anahtarın özetini sabit zamanlı karşılaştır. Anahtarın kendisini kurucuya bir kez göster; kurucu onu Cloudflare'de promovote-landing Worker'ına `LOVELET_STATS_KEY` adıyla Secret olarak girecek. Anahtarı repoya, dosyaya veya bana yazma.
3. Cevaplar: anahtar ayarlı değilse `503 {"error":"not_configured"}`, yanlış anahtarda `401`, bilinmeyen feed için `400 {"error":"bad_feed"}`. `days` 1 ile 90 arası. Dakikada en fazla 30 istek. `Cache-Control: private, max-age=3600` (ops için 300).
4. Kişisel veri yok, sadece günlük toplamlar. Bir günde 5'ten az kullanıcı varsa oranlar (d1, d7) null. Sadece biten UTC günleri; bugün ops beslemesinde `partial: true` ile gelebilir.

Biçimler: Poleris için yazdığım ayrıntılı tarif aynen geçerli, bu repoda `docs/prompts/poleris-desktop-stats.md` dosyasında. Kısaca:

* Mağaza beslemesi: `{ generated_at, sources: {apple, google, app_server}, rows: [{ date, platform: ios|android|all, store_page_views, impressions, downloads, new_players, d1, d7, crash_rate, anr_rate, rating_avg, ratings_count, downloads_search, downloads_browse, downloads_referral_app, downloads_referral_web, downloads_other }], top_search_terms_7d }`
* Uygulama içi besleme: `{ generated_at, now: {users_online_5min}, days: [{ date, dau_ios, dau_android, sessions, new_accounts, avg_session_min, partial, ...Lovelet'e özel sayılar }], sales: { days: [{ date, apple_usd, google_usd, apple_count, google_count, refunds_usd, refunds_count, apple_local, google_local }], by_product_30d: [{ product_id, store, count, usd, local: [{currency, amount}], local_unknown_count }], subscriptions_30d: {new, renewed, cancelled_or_expired, active_now}, test_purchases_30d }, funnel, health, online: null, status: {ok, failed} }`
* `usd` = ürünün sabit ABD liste fiyatı, brüt. `local` = alıcının kendi para biriminde ödediği, para birimine göre toplam. Apple ve Google her zaman ayrı. Test satın almaları sayılmaz.
* Bilinmeyen veya henüz olmayan değer null; panel "Veri yok" yazar.

## Bitince bana (PromoVote bulut oturumuna) şunları ilet

* İki beslemenin adresi
* Gerçek bir örnek cevap (kişisel veri yok)
* Lovelet'e özel eklediğin alanların listesi
* Kurucunun `LOVELET_STATS_KEY` secret'ını Cloudflare'e girip girmediği

Ben de admin paneline "Lovelet" düğmesini ve sayfalarını eklerim.
