# Yapılacaklar listesi

Kurucu ile konuşulan, zamanı gelince yapılacak işler. Bitince [x] yapılır ve tarih yazılır.

## Uygulama mağazada onaylanınca

### Web sitesinden uygulama reklamı testi (kurucu fikri 2026-10-07)
Fikir: reklam parasını doğrudan uygulama indirme reklamına değil promovote.com'a harcamak. Ziyaretçi sitede videoları izler (kurucunun ürünleri de reklam olmuş olur), sonra App Store veya Google Play'e gider.
- [ ] Sitede App Store ve Google Play butonları. Cihaza göre doğru olan gösterilir; iPhone'da Google Play butonu ve linki asla görünmez.
- [ ] iPhone Safari için Smart App Banner (`<meta name="apple-itunes-app" content="app-id=6819894584">`).
- [ ] Kampanya linkleri: App Store `pt` ve `ct` (örnek `ct=web-test`), Google Play `referrer=utm_source%3Dpromovote_web%26utm_campaign%3D...`. Hangi indirme siteden geldi, App Store Connect ve Play Console raporlarında görünür.
- [ ] Mağaza butonu tıklama sayacı (kendi visit counter'ımız gibi, çerezsiz), admin panelinde günlük sayı.
- [ ] Reklamdan gelenler için sade sayfa (`/get` gibi): otomatik oynayan video akışı ve sabit "Uygulamayı indir" butonu. Video izlemek ZORUNLU değil, buton baştan görünür.
- [ ] Bekleme listesi bölümü "Uygulamayı indir" olarak değişir; bekleme listesindekilere duyuru emaili (Email Sending açılınca).
- [ ] Test: 50 dolar ikiye bölünür. 25 dolar siteye trafik reklamı (hedef: mağaza butonu tıklaması), 25 dolar doğrudan PromoVote indirme reklamı. 1 hafta sonra karşılaştır: indirme başına maliyet, artı sitedeki ürün tıklamaları (Etsy, Google Play). Ucuz olan kazanır.
- [ ] Reklam hedefleme 18+ (uygulama 18+).

### Diğer
- [ ] Workers Paid (5 dolar) aç: Email Sending ve email ile giriş (kurucu kararı: bir mağaza onaylayınca).
- [ ] Apple App Information: Secondary category "Social Networking", Content Rights "Yes" (inceleme sırasında kilitliyse onaydan sonra, yayından önce).
- [ ] Apple ürün sayfası header ve arama görseli (store/assets/header), alan açıksa.
- [ ] App Privacy: v1'de olmayan "Photos or Videos" ve "Purchase History" beyanlarını gözden geçir (yükleme ve satın alma gelince geri eklenir).

## Sonraki sürümler
- [ ] Oylama kapanış tarihi (örnek 7 gün), sonra herkese açık sonuç ("%71 Will blow up dedi") ve creator sayfasında Hits sekmesi.
- [ ] Sunucu push bildirimleri (takip edilen üreticinin yeni tanıtımı, tahmin sonucu).
- [ ] v1.1: PromoVote Pro, Story'ler (sadece takipçilere, yeşil halka), creator koleksiyonları.
- [ ] Yorum yerine oylama bitince görünen "neden böyle tahmin ettim" notu.
- [ ] "Calm" promosunun adı (kurucu), Apple token revoke key (kurucu).
