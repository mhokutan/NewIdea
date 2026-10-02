# CTO / Web ve Mobil Mimar: Round 1 Değerlendirmesi

## 1. Kararım

Teknik olarak bu ürün zor değil: kısa video akışı, onay kuyruğu, olay kaydı ve abonelik. Asıl zor kısım "qualified view" sayısına reklamverenin güvenmesini sağlamak, ve bu bir ekran değil, ürünün kalbi. Solo kurucu için yapılabilir, ama sadece kapsam çok dar tutulursa ve web ile mobil tek kod tabanından çıkarsa.

## 2. Reklamveren neden öder, kullanıcı neden gelir?

Reklamveren "ucuz view" için ödemez, çünkü Meta ve YouTube'da zaten ucuz view var. Ödeyeceği şey: doğrulanmış dikkat (gerçek bir insan, ön planda, sesi açık, 10 sn izledi) ve kreatif hakkında hızlı geri bildirim (hangi video daha çok ilgi çekiyor). Teknik olarak satabileceğimiz en güçlü şey "şeffaf ve denetlenebilir rapor".

Kullanıcı tarafında Claude'a katılıyorum: sadece point döngüsü kimseyi geri getirmez. Geri getiren şey içeriğin kendisi olmalı: yeni oyunlar, indie uygulamalar, küçük YouTube kanalları, fırsatlar. Bu yüzden akış algoritması ve "ilgilenmiyorum" sinyali ilk günden veri modelinde olmalı.

## 3. İlk gün ne inşa edilmeli, kime?

İlk müşteri reklamveren değil, küçük ve teknik açıdan kolay ikna edilen bir niş: indie oyun geliştiricileri, küçük YouTube kanalları, yeni uygulamalar. Bunlar zaten creative testi yapar ve 50 dolar harcamaya alışkındır. İzleyici tarafında da bu içeriğe meraklı kitle (oyuncular, erken kullanıcılar) hedeflenir.

Web ve mobil aynı anda: tam native iki uygulama solo kurucu için gerçekçi değil. Gerçekçi olan şu:

* **Reklamveren paneli sadece web.** Kimse telefondan video yükleyip kampanya yönetmek istemez.
* **İzleyici uygulaması tek kod tabanı:** Expo (React Native) + Expo Router + React Native Web. Aynı kod iOS, Android ve web'de çalışır. Web'i ilk 6 haftada PWA gibi yayınlarız, mağaza onayını beklemeyiz.
* **Monorepo:** Turborepo veya pnpm workspaces. `apps/mobile` (Expo, web dahil), `apps/admin` (Next.js, reklamveren ve moderasyon paneli), `packages/core` (tipler, Zod şemaları, Supabase client, point kuralları).
* **Backend:** Supabase (Postgres, Auth, RLS, Edge Functions, Realtime). Kurucunun Salesforce geçmişi burada avantaj: onay akışı, rol bazlı erişim ve kayıt mantığı ona tanıdık.
* **Video:** Başlangıçta Cloudflare Stream (yükleme, transcode, HLS, imzalı URL tek yerde). Ölçek büyüyünce R2 + kendi ffmpeg işçisi ile önceden encode edilmiş MP4'e geçiş, çünkü R2'de egress ücreti yok.
* **Ödeme:** Stripe Billing + Customer Portal. Paketler Stripe Product olarak, view kotası bizim veritabanında.
* **Analitik ve olaylar:** Postgres'te `view_events` tablosu (aylık partition), sonra ClickHouse veya Tinybird.

## 4. ChatGPT modeli ve Claude eleştirisi

**Katıldıklarım:** Impression, 10 sn, %25/50/75, tamamlama ve CTA'nın ayrı raporlanması doğru ve endüstri standardı. Point'in nakit değeri olmaması teknik olarak büyük bir avantaj: fraud teşviki düşük olur. Claude'un "fraud MVP'de çözülmeli" tespiti çok doğru.

**Katılmadıklarım:** "$50 ile YouTube'dan fazla view" vaadi trafik yokken tehlikeli. Paket sayısı (3 paket, add-on'lar, slot fiyatları) MVP için fazla karmaşık; faturalama ve kota mantığı haftalar yer. İlk sürümde tek paket + kullanım bazlı top-up yeter. Ayrıca A/B test ve gelişmiş targeting ilk 3 ayda yapılmamalı, çünkü yeterli trafik olmadan istatistiksel anlamı yok.

**Gerçek bir insanın 10 saniye izlediğini nasıl doğrularım:**

1. **Sunucu tarafından verilen view token:** Reklam gösterilince Edge Function imzalı, tek kullanımlık bir token üretir (user, device, ad, başlangıç zamanı). Qualified view sadece sunucu saatine göre en az 10 sn geçtiyse kabul edilir. İstemcinin "10 sn izledim" demesine güvenmeyiz.
2. **Heartbeat olayları:** Her 2 ile 3 saniyede bir player `currentTime`, ses durumu, ekran görünürlüğü (web'de Page Visibility API ve IntersectionObserver, mobilde AppState) gönderilir. Atlanan, geri sarılan veya arka planda geçen süre sayılmaz.
3. **Cihaz doğrulama:** Mobilde Apple App Attest ve Google Play Integrity API. Web'de Cloudflare Turnstile. Emülatör ve rootlu cihaz puanı düşürür.
4. **Davranış sinyalleri:** Aynı cihazda çok hesap, sabit aralıklı izleme, hiç kaydırma veya dokunma olmaması, datacenter IP. Bunlara bir risk skoru verilir. Yüksek skorlu view'lar reklamverenden düşülür ama kullanıcıya gösterilmez (shadow invalidation).
5. **Günlük limitler:** Kullanıcı başına günlük qualified view ve point tavanı.
6. **Rastgele dikkat kontrolü:** Ara sıra feedback sorusu (😍 / 😐 / 👎). Cevap point'i etkilemez ama cevap verilmesi insan sinyalidir.

Raporda "geçersiz sayılan view" ayrı satırda gösterilmeli. Reklamverene güven bu şeffaflıktan gelir.

**App Store riski:** Apple, uygulama içi reklam izletip karşılığında dijital değer vermeye izin veriyor, ama point'in gerçek paraya veya hediye kartına dönmesi işin rengini değiştirir. Şimdilik nakit yok, bu iyi.

## 5. İlk 3 önerim, MVP planı ve maliyet

**Öneriler:**
1. Reklamveren paneli web, izleyici uygulaması Expo ile tek kod. Önce web, sonra mağazalar.
2. Doğrulama ve olay kaydı ilk sprintte, feed tasarımından önce.
3. Tek paket, manuel moderasyon, manuel onboarding. Karmaşık fiyatlama sonra.

**MVP planı (solo kurucu + AI, yaklaşık 12 hafta):**
* Hafta 1 ile 2: Monorepo, Supabase şeması, Auth, RLS, Stripe ürünü.
* Hafta 3 ile 5: Reklamveren web paneli: yükleme (Cloudflare Stream direct upload), süre kontrolü (10 ile 45 sn), onay kuyruğu, Stripe ödeme.
* Hafta 6 ile 8: İzleyici feed'i (web), view token, heartbeat, qualified view mantığı, point ve skip kuralları.
* Hafta 9 ile 10: Reklamveren raporu, fraud skoru v1, Turnstile.
* Hafta 11 ile 12: Expo ile iOS ve Android build (EAS), App Attest ve Play Integrity, mağaza başvurusu.

**Aylık altyapı maliyeti (tahmin):** Varsayım: DAU başına günde 15 reklam, ortalama 25 sn, yani ayda yaklaşık 190 dakika izleme. Cloudflare Stream teslimat ücreti 1,000 dakika için yaklaşık 1 dolar, depolama 1,000 dakika için 5 dolar.

| | 1K DAU | 10K DAU | 100K DAU |
|---|---|---|---|
| Video (Stream) | ~$200 | ~$1,900 | ~$19,000 (R2 + MP4 ile ~$1,500 ile 3,000) |
| Supabase | $25 | $100 ile 300 | $600 ile 1,500 |
| Expo EAS, Vercel, e-posta, izleme | ~$50 | ~$200 | ~$600 |
| **Toplam** | **~$300** | **~$2,300** | **~$4,000 (R2 ile) / ~$21,000 (Stream ile)** |

Stripe ayrıca gelirin yaklaşık %3.6'sı (kart + Billing). Önemli not: 100 Starter müşteri ayda 5,000 dolar getirir ama yaklaşık 700 DAU'luk izleme demektir, bu da altyapı için rahattır. Gerçek risk maliyet değil, talep.

## 6. Diğer ekip üyelerine sorularım

* **Product strategist:** İlk 90 günde tek bir dikey (örneğin mobil oyunlar) seçebilir miyiz?
* **Ad-tech uzmanı:** MRC standardına yakın bir "qualified view" tanımı reklamverene satışta ne kadar fark yaratır? Üçüncü parti doğrulama (IAS, DoubleVerify) ne zaman gerekir?
* **Consumer growth psikoloğu:** Nakit ödül olmadan günlük geri dönüşü ne sağlar? Streak ve leaderboard yeterli mi?
* **Marketplace economist:** Trafik yetmezse "up to X view" kotası kullanılmayan bakiye nasıl ele alınır: devir mi, iade mi?
* **Trust & safety / legal:** Moderasyonu ilk aşamada insan mı yapacak? Global başlarken GDPR ve cihaz parmak izi verisi için hangi rıza akışı lazım?
* **Creator economy uzmanı:** Küçük YouTube kanalları 50 dolar öder mi, yoksa ilk müşteri indie oyun stüdyoları mı?
* **Skeptical investor:** 700 DAU'yu reklamveren parası gelmeden nasıl toplarız? İlk kullanıcıları ücretsiz kampanyalarla mı çekeceğiz?
