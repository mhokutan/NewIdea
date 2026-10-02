# Fikir Brief'i (çalışma adı: OnlyAds / WatchAds)

Bu dosya ekibin değerlendirdiği ham fikirdir. Kaynaklar: kurucunun fikri, ChatGPT ile yapılan konuşma, Claude'un yorumları ve kurucunun cevapları.

## 1. Kurucunun ana fikri

"Her şeyin bir sosyal medyası var, OnlyFans bile var. Reklamların neden bir sosyal medyası olmasın?"

Reklamların içeriğin kendisi olduğu bir platform. Reklamverenler (YouTube kanalları, markalar, oyunlar, uygulamalar, e-ticaret, küçük işletmeler) 10 ile 45 saniye arası video reklam yükler. Kullanıcılar bu reklamları TikTok benzeri bir akışta izler.

Temel kurallar:

* Reklamverenin yüklediği video ve link onaydan geçmeden yayına girmez (Pending Review, Approve / Reject / Request Changes).
* Video süresi en az 10 sn, en fazla 45 sn.
* Kullanıcının reklam başına (veya günde) bir ücretsiz skip hakkı var, sonraki skip'ler point harcar.
* Kullanıcı reklam izleyerek point kazanır.

## 2. ChatGPT ile şekillenen model

### Reklamveren paketleri (aylık abonelik)

| | Starter | Growth (en popüler) | Pro |
|---|---|---|---|
| Aylık fiyat | $50 | $150 | $250 |
| Aylık qualified view | 3,000 | 10,000 | 20,000 |
| Efektif CPV | 1.67¢ | 1.50¢ | 1.25¢ |
| Aktif reklam slotu | 3 | 7 | 12 |
| Video süresi | 10 ile 45 sn | 10 ile 45 sn | 10 ile 45 sn |
| CTA link | ✓ | ✓ | ✓ |
| Targeting | Basic | Advanced | Advanced |
| Analytics | Basic | Advanced | Advanced |
| Audience feedback | yok | yok | ✓ |
| A/B test | yok | ✓ | ✓ |
| Ekstra video slotu | $10/ay | $8/ay | $5/ay |

* Enterprise: $1,000+ custom (sonraki aşama).
* Add-on: ekstra view (+1K $20, +5K $75, +10K $125), ekstra aktif reklam slotu (+1 $10, +3 $25, +5 $35).
* Depolanan video için para alınmaz, aynı anda aktif olan reklam sayısı sınırlıdır.
* Başlangıçta "Up to X qualified views" denmesi önerildi (trafik garanti edilemeyebilir).

### Qualified view tanımı

* Impression, 10 sn qualified view, %25 / %50 / %75, completed view, CTA click ayrı ayrı raporlanır.
* Anında ücretsiz skip: 1 impression, 0 qualified view.

### Benchmark (ABD, 2026, ChatGPT'nin verdiği rakamlar)

* Instagram/Meta CPM yaklaşık $11 ile $18. $50 ile yaklaşık 3,300 impression.
* YouTube TrueView CPV yaklaşık $0.024. $50 ile yaklaşık 2,083 view.
* Hedef: $50 ile YouTube'dan daha fazla qualified view vermek.

### Point ekonomisi

* Normal izleme +2, tam izleme +3 (veya paket bazlı: Starter reklam +2, Growth +3, Pro +5).
* CTA tıklamasına point verilmez (analytics kirlenmesin).
* Günlük 10 reklam bonusu +10, 7 günlük seri +50.
* Skip: günün ilk skip'i ücretsiz, 2. skip 5, 3. skip 10, 4. ve sonrası 15 point. Gün değişince sıfırlanır.
* Point'lerin nakit değeri yok, devredilemez. Kullanım: skip, profil özelleştirme, rozet, leaderboard.
* Feedback cevabı point miktarını etkilemez (FTC incentivized review kuralları).

### Pro'nun farkı: Audience feedback

Reklam sonunda "Bu ürün ilgini çekti mi? 😍 / 😐 / 👎" veya reklamverenin A/B sorusu. Reklam + mini pazar araştırması.

### Hukuki notlar

* Yasaklı kategoriler: yasa dışı ürün, scam/phishing, malware, sahte ürün, pornografi, silah, uyuşturucu, aldatıcı finans, telif ihlali.
* Kısıtlı kategoriler: alkol, kumar, finans, sağlık, siyasi reklam, dating, kripto.
* Reklamveren tüm içerik hakları için onay checkbox'ı işaretler, IP/takedown süreci olur.
* 18+ ile başlamak (COPPA ve targeted ads riski).
* Gerekli belgeler: ToS, Advertiser Terms, Privacy Policy, Advertising Policy, Copyright/IP takedown, yaş/veri politikası.

## 3. Claude'un ilk yorumu (özet)

1. **Kullanıcı tarafı en zayıf halka.** "Reklam izle, point kazan, reklam geçmek için point harca" döngüsü kendi içinde kapalı. Sadece reklam olan bir uygulamada skip edince yine reklam geliyor. Kullanıcı neden girsin? Öneri: "keşif akışı" konumlandırması (yeni oyunlar, kanallar, ürünler, fırsatlar). Skip = "ilgilenmiyorum" verisi.
2. **Ödüllü izlenme normal izlenmeden daha az değerli.** YouTube kıyası adil değil, gerçek rakip rewarded ad network'ler. Satış argümanı "daha ucuz" değil, "gerçek geri bildirim + garantili dikkat + kreatif testi" olmalı.
3. **Bot ve fraud** MVP'de çözülmeli.
4. **Tavuk yumurta:** 100 Starter = ayda 300K view = günde yaklaşık 10K view, kullanıcı başı günde 15 reklamla yaklaşık 700 DAU yeter.
5. **App Store / Google Play** ödüllü reklam kuralları kontrol edilmeli.
6. Artan skip ücreti sabit ücretten iyi.

## 4. Kurucunun cevapları

1. **İsim:** Domain bulunabilirliği önemli. "OnlyAds" gibi bir isim düşünülüyor (OnlyFans benzetmesi).
2. **Ödül:** Hiçbir partner anlaşması yok. Kullanıcılara hediye veya gerçek para nasıl verilecek bilinmiyor.
3. **Platform:** Web ve mobil aynı anda.
4. **Salesforce:** Şu an gerek yok.
5. **Pazar:** Global.
6. **Vizyon:** "Her şeyin bir sosyal medyası var. Reklamların neden olmasın?" Arayüz sonra. Önemli olan ilk başta neye ve kime hizmet edeceği.

## 5. Ekibin cevaplaması gereken ana sorular

1. Reklamveren neden buraya para versin (Meta, Google, TikTok yerine veya yanında)?
2. Kullanıcı neden bu uygulamaya girsin ve geri gelsin?
3. Bu bir "reklamların sosyal medyası" mı, rewarded ad network mü, keşif platformu mu, pazar araştırması aracı mı? İlk gün kime hizmet ediyor?
4. Partner anlaşması olmadan kullanıcıya gerçek değer nasıl verilir?
5. Global + web + mobil aynı anda başlamak gerçekçi mi?
6. Fiyatlar ve paketler mantıklı mı?
7. İsim ve domain.
