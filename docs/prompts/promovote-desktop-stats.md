# PromoVote masaüstü Claude için: PromoVote'un kendi mağaza istatistikleri

Merhaba. Ben PromoVote bulut oturumuyum (Claude). PromoVote admin panelinde (promovote.com/admin) Hauling Empire'ın mağaza istatistikleri görünüyor. Aynısını PromoVote uygulamasının kendisi için yapacağım. PromoVote'un arka ucu bizim (Cloudflare Worker `promovote-api`), o yüzden toplama kodunu ben yazacağım. Senden sadece mağaza hesaplarında anahtar ve izin işleri gerekiyor, çünkü bunlar konsol tıklamaları.

Kurallar: hiçbir anahtarı, şifreyi veya JSON içeriğini sohbete, ekrana veya git'e yazma. Gizli değerleri sadece `npx wrangler secret put` ile ver (değer ekrandan değil dosyadan veya panodan gelsin). `store/status.md` dosyasına sadece "yapıldı" notu yaz.

## 1. Google Play (öncelik)
1. Play Console, sol menü **Users and permissions**. Mevcut servis hesabını bul (GitHub'daki `GOOGLE_PLAY_SA_JSON` ile aynı hesap). İzinlerine şunu ekle (hesap düzeyinde): **View app information and download bulk reports (read only)**. Diğer izinleri değiştirme.
2. Play Console, **Download reports**, sonra **Statistics**. Sayfadaki **Copy Cloud Storage URI** düğmesiyle `gs://pubsite_prod_rev_...` adresini kopyala. Bu bir sır değil; `store/status.md`'ye yazabilirsin.
3. Servis hesabı JSON dosyasını PromoVote API Worker'ına koy:
   `cd services/api && npx wrangler secret put GOOGLE_PLAY_SA_JSON < /yol/servis-hesabi.json`
   Sonra dosyanın bu kopyasını bilgisayardan sil (asıl kopya senin güvenli yerinde kalsın).
4. Bucket adresini Worker'a değişken olarak ekle: `npx wrangler secret put PLAY_REPORTS_BUCKET` (değer: `pubsite_prod_rev_...` kısmı).
Not: Google, yeni izin verilen hesaba rapor erişimini 24 saate kadar geç açabilir.

## 2. App Store Connect
1. App Store Connect, **Users and Access**, **Integrations**, **App Store Connect API**, **Team Keys**.
2. Yeni anahtar: adı `promovote-stats`, rol **Sales** ve **App Manager** (analytics rapor isteği için gerekirse Apple **Admin** isteyebilir; isterse sadece bu anahtar için Admin seç ve bana söyle).
3. .p8 dosyasını indir (Apple bir kez verir). Üç değeri Worker'a koy:
   `npx wrangler secret put ASC_STATS_KEY_ID`, `npx wrangler secret put ASC_STATS_ISSUER_ID`, `npx wrangler secret put ASC_STATS_KEY_P8 < /yol/AuthKey_XXXX.p8`
4. .p8 dosyasını güvenli yerine taşı, indirilenler klasöründen sil.
5. App Store Connect'te PromoVote'un **Apple ID** numarasını (uygulama bilgileri sayfasında) `store/status.md`'ye yaz; sır değil.

## 3. Bitince
`store/status.md`'ye kısa not: "PromoVote istatistik anahtarları Worker'a kondu (Google: tarih, Apple: tarih), bucket: ..., Apple ID: ...". Commit at ve push et. Gerisini bulut oturumu yapar: her sabah raporları çeken iş, admin panelinde PromoVote sekmesi, aramayla bulanlar kırılımı.
