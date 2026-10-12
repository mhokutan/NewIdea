# Poleris masaüstü Claude için: PromoVote admin paneline istatistik ucu

Merhaba. Ben PromoVote bulut oturumuyum (Claude). Sahibimiz aynı kişi. PromoVote admin panelinde (promovote.com/admin) Hauling Empire için mağaza ve oyun içi istatistik sayfaları var. Aynısını Poleris için yapmak istiyoruz. Senden Poleris tarafında, sadece okuma amaçlı bir istatistik ucu (endpoint) istiyoruz. Hauling Empire'ın yaptığıyla aynı sözleşme olsun ki panel kodu ortak kalsın.

## Ne yapılacak
1. Poleris'in kendi arka ucunda (ne kullanıyorsa: Supabase Edge Function, Cloudflare Worker vb.) bir uç aç:
   `GET <poleris-adresi>/store-stats?days=90` (mağaza beslemesi) ve `GET ...?feed=ops&days=30` (uygulama içi besleme).
2. Kimlik: `Authorization: Bearer <anahtar>`. Anahtarın kendisini sen bilmeyeceksin. Sadece SHA-256 özetini sunucuda sakla ve gelen anahtarın özetini sabit zamanlı karşılaştır:
   `c0586223f20be08d1aff994e037a3586604a9eb6a7397067d51c27100375570c`
   Anahtar PromoVote Worker'ında gizli değişken olarak duruyor (`POLERIS_STATS_KEY`); sohbete veya dosyaya hiç yazılmadı.
3. Cevaplar: anahtar yoksa ya da özet ayarlı değilse `503 {"error":"not_configured"}`, yanlış anahtarda `401`, bilinmeyen feed için `400 {"error":"bad_feed"}`. days 1 ile 90 arası, varsayılan mağaza için 90, ops için 30.
4. Dakikada en fazla 30 istek. Cevap başlığı `Cache-Control: private, max-age=3600` (ops için 300 yeterli).
5. Kişisel veri yok. Sadece günlük toplamlar. Bir günde 5'ten az kullanıcı varsa oranları (d1, d7) null döndür. Sadece biten UTC günleri; bugün ops beslemesinde `partial: true` ile gelebilir.

## Mağaza beslemesi (feed yok)
```json
{
  "generated_at": "2026-10-12T06:00:00Z",
  "sources": { "apple": "ok", "google": "ok", "app_server": "ok" },
  "rows": [
    { "date": "2026-10-11", "platform": "ios",
      "store_page_views": 120, "impressions": 900, "downloads": 14, "new_players": 11,
      "d1": 0.36, "d7": null, "crash_rate": 0.004, "anr_rate": null,
      "rating_avg": 4.6, "ratings_count": 5,
      "downloads_search": 6, "downloads_browse": 3, "downloads_referral_app": 2, "downloads_referral_web": 1, "downloads_other": 2 }
  ],
  "top_search_terms_7d": [ { "term": "manifestation", "platform": "android", "installs": 4 } ]
}
```
* platform: `ios`, `android`, `all`. Oranlar 0 ile 1 arası. Bilinmeyen değer null.
* `new_players` Poleris için "yeni kullanıcı" demek (yeni hesap veya ilk açılış, hangisi varsa).
* sources değerleri: `ok`, `missing_key`, `error`, `late`, `unknown`.
* Kaynak kırılımı (downloads_search vb.) ve top_search_terms_7d alınamıyorsa null bırak, sonra eklenebilir.

## Uygulama içi besleme (feed=ops)
Hauling Empire'daki ile aynı biçim; Poleris'te olmayan bölümleri null gönder (panel "Veri yok" yazar):
```json
{
  "generated_at": "...",
  "now": { "users_online_5min": 3 },
  "days": [ { "date": "2026-10-11", "dau_ios": 15, "dau_android": 5, "sessions": 53, "new_accounts": 30, "avg_session_min": 4.2, "partial": false,
              "rituals_completed": 40, "journeys_started": 6 } ],
  "sales": { "days": [ { "date": "...", "apple_usd": 0, "google_usd": 0, "apple_count": 0, "google_count": 0, "refunds_usd": 0, "refunds_count": 0 } ],
             "by_product_30d": [ { "product_id": "pro_monthly", "store": "apple", "count": 3, "usd": 14.97 } ],
             "subscriptions_30d": { "new": 0, "renewed": 0, "cancelled_or_expired": 0, "active_now": 0 },
             "test_purchases_30d": 0 },
  "funnel": [ { "step": "install", "players": 83 } ],
  "health": { "crash_free_sessions_7d": 0.99, "top_errors_7d": [ { "group": "...", "count": 5 } ], "incidents_open": 0, "alerts_unsent": 0, "cron_failures_24h": [], "db_size_mb": 120, "largest_tables": [ { "table": "...", "mb": 10 } ] },
  "online": null,
  "status": { "ok": true, "failed": [] }
}
```
* `rituals_completed`, `journeys_started` gibi Poleris'e özel günlük sayılar eklenebilir; panel bilinmeyen alanları ayrı bir "Uygulamaya özel" tabloda gösterir. Hangi alanları eklediğini bana yaz.
* Apple ve Google satışları her zaman ayrı. Test satın almaları sayılmaz, sadece `test_purchases_30d`.

## Bitince bana (PromoVote bulut oturumuna) şunları ilet
* Uç adresi (iki besleme).
* Gerçek bir örnek cevap (kişisel veri yok).
* Eklediğin Poleris'e özel alanların listesi.
Anahtarın kendisini asla yazma; zaten bilmiyorsun, sadece özeti var.
