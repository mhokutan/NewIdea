# Skeptical Investor (Şüpheci Yatırımcı) Değerlendirmesi, Round 1

## 1. Kararım

Bu haliyle yatırım yapılabilir bir iş değil. "Reklamların sosyal medyası" fikri, gerçek ödülü olmayan bir rewarded ad network'tür; bu kategoride gerçek para dağıtanlar bile zorlandı veya kapandı. Tek ilginç çekirdek, "küçük reklamverene ucuz, gerçek insan geri bildirimi" kısmıdır ve o da önce manuel olarak kanıtlanmalı.

## 2. Reklamveren neden para versin, kullanıcı neden gelsin?

**Reklamveren tarafı.** Rakamlar ChatGPT'nin modelinin aleyhine. ABD'de rewarded video eCPM ortalaması 2025'te yaklaşık $12 ile $15 (iOS ortalama $13.75, Android $12.01). Yani AppLovin, Unity, ironSource gibi ağlar zaten tamamlanmış izlenme başına yaklaşık 1.2 ile 1.5 cent fiyatla, milyonlarca oyuncuya, hazır hedeflemeyle ve yüzde 80 ile 90 tamamlanma oranıyla satıyor. OnlyAds 1.25 ile 1.67 cent istiyor ama ne erişimi, ne hedeflemesi, ne de ölçüm geçmişi var. "YouTube'dan ucuz" argümanı da yanlış kıyas: YouTube izleyicisi içerik için gelmiş biri, OnlyAds izleyicisi point için gelmiş biri. Reklamveren için daha düşük kaliteli dikkat, daha düşük fiyat demek.

**Kullanıcı tarafı.** Döngü kapalı: reklam izle, point kazan, point harcayıp reklam geç, karşına yine reklam gelsin. Point'in nakit değeri yok, partner yok, hediye yok. Bu kategorideki hayatta kalanlar gerçek değer dağıtıyor: Swagbucks (Prodege) 2008'den beri nakit ve hediye kartı veriyor, video izleme ise orada bile en düşük ödeyen iş (playlist başına 2 ile 4 cent). Mistplay oyunculara 150 milyon dolardan fazla ödül dağıttığını söylüyor. Brave, reklam gelirinin yüzde 70'ini kullanıcıya BAT olarak veriyor ve 100 milyon MAU'lu bir tarayıcının üstüne oturuyor. OnlyAds kullanıcıya bunların hiçbirini veremiyor.

**Geçmiş başarısızlıklar:**
* **Perk.com:** video izleyip point kazandıran uygulamalar paketi. RhythmOne 2016'da yaklaşık 42.5 milyon dolara aldı, Aralık 2019'da tüm uygulamalar kapandı.
* **Viggle:** TV izleyerek ödül. Perk'e satıldı, 2019'da onunla birlikte kapandı.
* **Kiip:** Coca Cola, P&G, McDonald's gibi markalarla ödül tabanlı reklam ağı, Verizon dahil yatırımcılar. 2019'da foreclosure, veri davası, varlıkları NinthDecimal'a satıldı.
* **Moat Ad Search:** reklam arama aracıydı, artık yok. Bugün reklam keşfi ücretsiz: TikTok Creative Center (Top Ads), Meta Ad Library, Google Ads Transparency Center. "Reklamları gezmek isteyen kitle" (pazarlamacılar) zaten bunları bedavaya kullanıyor.

## 3. Bir şansı varsa, ilk gün ne olmalı ve kimin için?

Tüketici uygulaması değil, **küçük reklamverenler için "yayın öncesi kreatif test" hizmeti.** Hedef: Meta/TikTok'ta ayda $500 ile $5,000 harcayan DTC markaları, mobil oyun ve uygulama geliştiricileri, küçük YouTube kanalları. Vaat: "Reklamını yayına almadan önce 200 gerçek insana göster, hangi saniyede kaybettiğini ve hangi versiyonun kazandığını 48 saatte öğren." Bu, Claude'un "geri bildirim + kreatif testi" önerisiyle örtüşüyor. Bu modelde izleyiciye para ödemek normal bir maliyet kalemi olur (panel modeli), "point'in değeri yok" sorunu çözülür. Rakipler de var (UserTesting, Wynter, Zappi, System1 gibi araştırma araçları), ama hepsi pahalı ve kurumsal; ucuz uç boş olabilir.

## 4. ChatGPT modeli ve Claude eleştirisi

**ChatGPT'de katılmadıklarım:** Abonelik paketleri, olmayan bir trafiği satıyor. "Up to X views" demek, reklamverenin gözünde "garanti yok" demek. Paket tablosu, A/B, slot, add-on fiyatları erken optimizasyon. Point ekonomisi oyunlaştırma üzerine kurulu ama altında değer yok.
**ChatGPT'de katıldıklarım:** Qualified view tanımının ayrıştırılması, onay süreci, yasaklı kategoriler, 18+ başlamak, feedback'e göre point değiştirmemek.
**Claude'da katıldıklarım:** Kullanıcı tarafı en zayıf halka, rewarded view daha az değerli, fraud ilk günden sorun, satış argümanı "ucuz" değil "geri bildirim" olmalı.
**Claude'da katılmadığım:** 700 DAU hesabı fazla iyimser. 700 kişiyi her gün 15 reklam izletmeye getirmek, gerçek ödül olmadan, tüm şirketin en zor işi. "Keşif akışı" konumlandırması da TikTok Shop ve Instagram Reels'in zaten yaptığı şey.

**Ölümcül kusurlar ve "çalışması için ne doğru olmalı":**
1. **Kullanıcıya değer yok.** Doğru olması gereken: kullanıcı ödül olmadan da reklam izlemek istiyor olmalı (ör. indirim kodları, yeni oyun erken erişimi) veya kullanıcıya gerçek para ödenebilmeli ve bu reklamverenden karlı şekilde tahsil edilmeli.
2. **Fiyat avantajı yok.** Doğru olması gereken: reklamveren buradan, AppLovin/Meta'da alamadığı bir şey almalı (ölçülebilir geri bildirim, test sonucu).
3. **Fraud ve düşük kalite dikkat.** Doğru olması gereken: izleyicinin gerçek ve hedef kitleye uygun olduğu kanıtlanabilmeli; ödül arttıkça bot ve click farm da artar.
4. **Odak yok (global + web + mobil + iki taraflı pazar).** Doğru olması gereken: tek ülke, tek dikey, tek platform ile başlanmalı.
5. **İsim riski.** "OnlyAds" OnlyFans çağrışımı yüzünden marka güvenliği isteyen reklamverenleri ve App Store incelemesini zorlaştırabilir; ayrıca ticari marka itirazı riski var.
6. **Mağaza politikaları.** Google Play opt-in rewarded reklama izin veriyor ama ana ürünü "reklam izle, ödül al" olan uygulamalar inceleme riski taşır; bu kontrol edilmeli.

## 5. En önemli 3 önerim

1. **Önce reklamvereni doğrula, uygulama yazma.** Landing page + Typeform: "Reklamını 200 gerçek kişiye göster, 48 saatte rapor, $49." Meta/TikTok reklamcı topluluklarında (Reddit r/PPC, r/FacebookAds, indie oyun Discord'ları) 30 küçük reklamverene doğrudan ulaş.
2. **2 ile 4 haftalık en ucuz test (Concierge MVP):** Ödeme yapan ilk 5 ile 10 müşterinin videolarını Prolific veya benzeri bir panelde gerçek insanlara göster (kişi başı birkaç dolar), sonuçları elle Google Slides raporuna dök. Ölç: kaç kişi ödedi, kaçı ikinci kez sipariş verdi, rapor gerçek bir karar değiştirdi mi. Maliyet: birkaç yüz dolar.
3. **İsim ve kapsamı küçült.** Tek pazar (ABD veya İngilizce konuşan pazar), sadece web, tek dikey (ör. mobil oyun reklamları). Kullanıcı uygulaması ancak reklamveren talebi kanıtlandıktan sonra.

## 6. Pre-seed yatırım yapar mıyım?

**Bugün hayır.** Tüketici tarafında gerçek ödül yok, reklamveren tarafında fiyat veya kalite avantajı yok, kurucunun dağıtım avantajı yok.
**Fikrimi değiştirecek kilometre taşı:** 8 ile 12 hafta içinde en az 20 ödeme yapan reklamveren, bunların yüzde 40'ından fazlasının tekrar alması ve tek bir kanaldan öngörülebilir müşteri kazanımı. Ya da tüketici tarafı için: ödülsüz ortamda 1,000 kullanıcıda 30. gün tutunmasının yüzde 15 üzerinde olması.

## 7. Diğer ekip üyelerine sorularım

* **Product strategist:** "Sosyal medya" kısmı tam olarak ne? Takip, yorum, paylaşım reklama ne katar?
* **Ad tech expert:** AppLovin/Unity rewarded ağlarına karşı tek savunulabilir fark ne olabilir? İzlenmeleri nasıl doğrularız?
* **Consumer growth psychologist:** Nakit değeri olmayan point, 30. gün tutunması yaratabilir mi? Hangi örnek var?
* **Marketplace economist:** Hangi tarafı önce sübvanse etmeliyiz, ve bunun parası nereden gelir?
* **Trust & safety legal:** "OnlyAds" ismi ticari marka ve mağaza açısından ne kadar riskli? Kullanıcıya ödeme yaparsak hangi vergi ve KYC yükü doğar?
* **CTO:** Web + mobil aynı anda yerine en hızlı doğrulama yolu ne? Fraud tespitine ilk günden ne kadar mühendislik gerekir?
* **Creator economy expert:** Küçük YouTuber'lar kendi kanal tanıtımı için gerçekten para harcıyor mu, yoksa bedava büyümeyi mi tercih ediyor?

**Kaynaklar:** Perk kapanışı (moneypantry.com/perk-rewards-review), Viggle kapanışı (slickdeals.net), Kiip (en.wikipedia.org/wiki/Kiip), Brave Rewards (adexchanger.com, sacra.com/c/brave), Mistplay (exchangewire.com), Swagbucks video oranları (thecollegeinvestor.com), rewarded video eCPM (businessofapps.com/ads/rewarded-video, appodeal.com), reklam kütüphaneleri (creatify.ai), Google Play incentivized politika (android-developers.googleblog.com/2017/06).
