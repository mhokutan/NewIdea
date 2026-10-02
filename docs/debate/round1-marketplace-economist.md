# Marketplace Economist: Round 1 Değerlendirmesi

## 1. Kısa hüküm

Fikir şu haliyle **zayıf, pivot gerekiyor**. Altyapı maliyeti sorun değil, brüt marj kağıt üzerinde %80 civarında. Asıl sorun talep tarafı değil, **arz tarafı**: satılan "view"leri teslim edecek, gerçek ödül almadan her gün 10 reklam izleyen kullanıcıyı bulmak. Bu çözülmeden abonelik paketleri, teslim edilemeyen bir söz satmak olur.

## 2. Reklamveren neden öder, kullanıcı neden gelir?

**Reklamveren:** "Meta'dan ucuz view" argümanı tutmaz. Ödüllü izlenme, normal izlenmeden daha az değerlidir ve Meta/Google'ın hedefleme gücü bizde yok. Küçük reklamverenin gerçek ihtiyacı şu: **"Yayınlamadan önce videomun işe yarayıp yaramadığını bilmek."** Yani kreatif testi ve hızlı geri bildirim. Bunu $20 ile $50 arasında almak, Meta'da $200 yakıp öğrenmekten iyidir.

**Kullanıcı:** Point'in nakit değeri yoksa, kullanıcı reklamı ödül için değil **içerik olarak** izlemelidir. Bu sadece reklamın içerik gibi olduğu bir dikeyde çalışır: oyun fragmanları, yeni uygulamalar, indie ürünler. Oyuncu yeni oyun fragmanını zaten kendi isteğiyle izliyor. Diş macunu reklamını kimse gönüllü izlemez.

## 3. İlk gün ne olmalı, kim için?

**Ürün:** "Yeni oyun ve uygulamaları keşfetme akışı + geliştiriciye gerçek kitle geri bildirimi."

**İlk müşteri (talep):** Indie oyun geliştiricileri ve küçük uygulama girişimleri. Bütçeleri küçük, wishlist/install ve kreatif geri bildirime aç, Discord ve Reddit üzerinden ulaşılabilir, global ve İngilizce bir pazar.

**İlk kullanıcı (arz):** Yeni oyun keşfetmeyi seven oyuncular. Fragman izlemek onlar için zaten eğlence.

**Platform:** Sadece web (PWA). Web ve mobili aynı anda açmak ekibi ikiye böler, ayrıca App Store ve Google Play'in ödüllü reklam ve dijital ürün kuralları (%15 ile %30 kesinti riski) erken risk getirir.

## 4. ChatGPT modeli ve Claude'un eleştirisi

**Katıldıklarım:**
* Qualified view'u impression'dan ayırmak ve ayrı raporlamak doğru.
* Depolamaya değil aktif slota limit koymak doğru, depolama maliyeti neredeyse sıfır.
* Claude'un "rakip YouTube değil, rewarded ad network" ve "artan skip ücreti" yorumları doğru.

**Katılmadıklarım:**
* **Aylık abonelik + view taahhüdü** soğuk başlangıçta yanlış. Trafik yoksa her ay iade veya kızgın müşteri üretir. Yerine **ön ödemeli kredi** (devreden, süresiz) veya ilk aşamada ücretsiz olmalı.
* **10 saniyelik qualified view** reklamveren için zayıf. Fiyat 1.25 ile 1.67 cent, ABD rewarded video eCPM'i ile aynı bölgede ama orada kullanıcı gerçek ödül alıyor. Bizde ödül değersiz, dikkat kalitesi daha düşük. Tamamlanmış view ve tepki üzerinden fiyatlamak daha dürüst.
* Üç paket, slot add-on, view add-on, video add-on: 0 müşteriyle 10 fiyat kalemi fazla. İlk gün tek fiyat yeter.
* Claude'un "700 DAU yeter" hesabı matematik olarak doğru ama frekans sınırı ve hedeflemeyi hesaba katmıyor. Gerçekte 2 ile 3 kat fazla DAU gerekir.

### Birim ekonomisi (varsayımlarla)

Varsayımlar: Cloudflare Stream teslimat $1 / 1,000 dakika, depolama $5 / 1,000 dakika. Bir qualified view için ortalama 1.6 impression, impression başına 18 sn izleme. Stripe %2.9 + $0.30 + Billing %0.7. Moderasyon video başına $1. Destek gelirin %5'i.

**Qualified view başına teslimat maliyeti: yaklaşık $0.0005 (0.05 cent).** Fiyatın yaklaşık %3'ü.

| Paket | Gelir | Stripe | Video teslimat | Moderasyon | Destek | Toplam maliyet | Brüt marj |
|---|---|---|---|---|---|---|---|
| Starter | $50 | $2.10 | $1.44 | $3 | $2.50 | $9.05 | %82 |
| Growth | $150 | $5.70 | $4.80 | $7 | $7.50 | $25.04 | %83 |
| Pro | $250 | $9.30 | $9.60 | $12 | $12.50 | $43.46 | %83 |

Bu tablo yanıltıcı derecede iyi, çünkü **kullanıcı edinme maliyetini** içermiyor. Asıl kritik hesap şu:

| Kullanıcı edinme (CPI) | Kullanıcının ömür boyu izlediği QV | QV başına edinme maliyeti |
|---|---|---|
| $0.50 | 30 | 1.67 cent |
| $1.00 | 50 | 2.00 cent |
| $2.00 | 100 | 2.00 cent |

QV'yi 1.25 ile 1.67 cent'e satıyoruz. **Kullanıcıyı parayla getirirsek her view'de zarar ederiz.** Model sadece organik ve geri dönen kullanıcıyla çalışır. Bu yüzden kullanıcı tarafı bir pazarlama sorunu değil, ürün sorunu.

### Envanter ihtiyacı

Paket karışımı: %60 Starter, %30 Growth, %10 Pro. Ortalama reklamveren ayda 6,800 view ve $100 gelir.

| Reklamveren | Aylık gelir (MRR) | Günlük QV ihtiyacı | DAU (10 QV/gün, ideal) | DAU (frekans + hedefleme ile, x2.5) |
|---|---|---|---|---|
| 50 | $5,000 | 11,333 | 1,133 | 2,833 |
| 200 | $20,000 | 45,333 | 4,533 | 11,333 |
| 1,000 | $100,000 | 226,667 | 22,667 | 56,667 |

Not: "Global" demek hedeflemeyi daha da böler. 50 reklamveren için bile 3K civarı günlük aktif ve her gün 10 reklam izleyen kullanıcı, değersiz point ile çok zor.

### Soğuk başlangıç nasıl çözülür?

Burada içerik = reklam. Yani **önce reklamvereni sübvanse et, ücretsiz yap.** İlk 100 ile 300 indie oyun ve uygulama fragmanını ücretsiz al (geliştiriciler bedava görünürlüğe bayılır). Ayrıca zaten herkese açık resmi fragmanları izinle kürate ederek akışı doldur. Kullanıcı gelip, kalış oranı (D7 %15 üstü) kanıtlanınca para almaya başla. Para alınan ilk ürün view değil, **geri bildirim raporu** olsun.

## 5. İlk 3 önerim

1. **Dikey seç ve web ile başla:** Oyun ve uygulama keşfi, sadece PWA. "Her şey için reklam" yok.
2. **Abonelik yerine kademeli para alma:** Faz 1 ücretsiz yayın. Faz 2 "Feedback Report" ürünü: $29 ile 500 tamamlanmış izleme + tepki + kısa anket özeti. Faz 3 ön ödemeli kredi (minimum $25, Stripe sabit ücreti küçük ödemelerde %2'den fazla yük getirmesin). "Founding advertiser" fiyatı ile ilk 50 müşteriye kilitli indirim.
3. **Kuzey yıldızı metriği view değil, organik izlenme:** "Ödülsüz, kendi isteğiyle izlenen fragman sayısı / DAU" ve D7 retention. Bu tutmuyorsa point sistemi kurtarmaz, durup pivot edilmeli.

## 6. Diğer ekip üyelerine sorularım

* **Product strategist:** Oyun/uygulama dikeyi dışında reklamın gerçekten içerik olduğu başka bir dikey var mı (film fragmanı, yerel restoran, moda)?
* **Ad-tech expert:** Ödüllü ve değersiz point ile izlenen 10 sn view, rewarded network'lerin $10 ile $20 eCPM'ine karşı reklamverene nasıl kanıtlanır? Hangi metrik (tamamlanma, wishlist tıklaması) güvenilir?
* **Consumer growth psychologist:** Nakit değeri olmayan point, rozet ve leaderboard ile günde 10 reklam izletmek mümkün mü? Hangi oran gerçekçi?
* **Trust & safety legal:** Ücretsiz kürate edilen fragmanlar için izin modeli ne olmalı? "OnlyAds" isminin OnlyFans markasıyla karışıklık riski var mı?
* **CTO:** Web PWA ile ne kadar sürede MVP çıkar, bot ve sahte izleme tespiti için minimum ne gerekir?
* **Creator economy expert:** YouTuber'lar kendi kanal tanıtımını burada izletmek ister mi, yoksa bu ayrı bir ürün mü?
* **Skeptical investor:** Hangi D7 retention ve hangi ödeyen reklamveren sayısında bu fikre para koyarsın? Benim önerim: 3 ayda 1,000 DAU, D7 %15 ve 20 ödeyen müşteri.

Kaynak: [Cloudflare Stream pricing](https://developers.cloudflare.com/stream/pricing)
