# Mağaza kurulumu: masaüstü Claude için talimat

Tarih: 2026-10-06. Kurucu kararı: App Store ve Google Play kurulumunu kurucunun bilgisayarındaki Claude (masaüstü uygulama, tarayıcı ve terminal) yapar. Kurucu sadece giriş, 2FA, banka ve vergi adımlarında devreye girer.

RevenueCat kullanılmıyor (kurucu kararı 2026-10-06). Satın almalar uygulamada doğrudan StoreKit ve Google Play Billing ile yapılır, doğrulama `api.promovote.com` Worker'ında yapılır:

* Apple: App Store Server API (In-App Purchase key ile) ve App Store Server Notifications V2, adres `https://api.promovote.com/v1/webhooks/apple`.
* Google: Google Play Developer API (service account ile) ve Real-time Developer Notifications (Pub/Sub push), adres `https://api.promovote.com/v1/webhooks/google`.

Ürünleri (consumable) bulut oturumundaki Claude API ile oluşturur:

| Product ID | Ürün | Fiyat |
|---|---|---|
| `com.miapera.promovote.boost.1d` | Boost 1 gün | $4.99 |
| `com.miapera.promovote.boost.3d` | Boost 3 gün | $9.99 |
| `com.miapera.promovote.boost.7d` | Boost 7 gün | $19.99 |
| `com.miapera.promovote.trailertest` | Trailer Test raporu | $49.99 |

Masaüstü Claude bu dosyadaki kod bloğunu talimat olarak uygular. Bütün repoyu değil, sadece `store/` ve `apps/mobile/` klasörlerini indirir (sparse checkout).

---

```
PromoVote mobil uygulaması için App Store ve Google Play kurulumunu yapacaksın. Tarayıcıda benim açık oturumlarımı kullan, terminal gerekirse aç.

KURALLAR
- GOOGLE HESABI: Google ile ilgili her işi (Google Cloud Console, Google Play Console, Pub/Sub, OAuth) SADECE hazimokutan@gmail.com hesabıyla yap. Google Play geliştirici hesabı bu hesapta. Tarayıcıda başka bir Google hesabı da açık olabilir: her sayfada sağ üstteki profil resmine bakıp hazimokutan@gmail.com olduğunu kontrol et. Değilse hesabı değiştir veya linkin sonuna ?authuser=hazimokutan@gmail.com ekle. Başka hesapla proje, key veya uygulama oluşturma. Yanlış hesapta bir şey oluşturduysan dur ve bana söyle.
- Şifre, 2FA kodu, banka, vergi, kimlik doğrulama veya ödeme bilgisi gereken bir yere gelirsen dur ve bana sor. Onları ben girerim.
- Yasal sözleşme kabul etmen gerekirse önce bana sor.
- Hiçbir key, .p8, .json veya şifre içeriğini sohbete yazma.
- Key dosyaları D:\PromoVote\SecretKeys klasöründe. Var olanları oradan oku, yeni indirdiğin bütün key dosyalarını da oraya kaydet. Bu klasörü asla repoya kopyalama.
- Emin olmadığın bir soru olursa tahmin etme, bana sor.
- İlerlemeyi repodaki store/status.md dosyasına yaz (Bölüm F). Bu dosyaya asla key, şifre veya gizli değer yazma.

BİLGİLER
- Uygulama: PromoVote
- iOS Bundle ID ve Android package: com.miapera.promovote
- Apple ve Google geliştirici hesapları Individual (bireysel), şirket hesabı değil (kurucu kararı). Satıcı adı kurucunun kendi adı. Organization'a çevirme veya D-U-N-S isteme. Vergi formu sorulursa bireysel W-9 olacak, onu kurucu girer.
- Site: https://promovote.com
- Gizlilik: https://promovote.com/privacy
- Şartlar: https://promovote.com/terms
- Destek emaili: support@promovote.com
- Repo: https://github.com/mhokutan/NewIdea, branch claude/gracious-pasteur-nu8ssc. Yerel klasör: D:\PromoVote\repo (sadece store/ ve apps/mobile/)
- Mağaza görselleri: store/assets/ (app-store-icon-1024.png, play-icon-512.png, feature-graphic-1024x500.png)
- Expo projesi: @mhokutan/promovote (https://expo.dev/accounts/mhokutan/projects/promovote)
- Kısa açıklama: "Discover, vote and rank the best game trailers and app promos."
- Yaş sınırı: 18+. Kumar yok, parayla ödül yok, kullanıcılara para verilmez.
- Uygulama içi satın alma var (consumable: Boost ve Trailer Test). Abonelik yok.
- Giriş: Sign in with Apple ve Google ile giriş. Kullanıcı video yükleyebilir (moderasyonlu), şikayet etme ve engelleme var, hesap silme uygulama içinde var.

====================
BÖLÜM A. iOS SERTİFİKASI (EAS, terminal)
====================
1. Repo yoksa PowerShell'de sadece gereken klasörleri indir:
   git clone --filter=blob:none --sparse -b claude/gracious-pasteur-nu8ssc https://github.com/mhokutan/NewIdea D:\PromoVote\repo
   cd D:\PromoVote\repo
   git sparse-checkout set store apps/mobile
   Repo varsa: cd D:\PromoVote\repo ve git pull.
   Sonra apps/mobile klasöründe "npm ci" çalıştır (EAS, uygulama ayarlarını okumak için paketlere ihtiyaç duyuyor). Node.js yoksa LTS sürümünü kur.
2. Expo'ya giriş: "npx eas-cli@latest whoami". Giriş yoksa "npx eas-cli@latest login" çalıştır ve dur, giriş bilgilerini ben yazarım.
3. Gerçek bir terminal penceresinde (sorulara cevap verebileceğin şekilde) çalıştır:
   npx eas-cli@latest credentials -p ios
   Seçimler:
   - Build profile: production
   - Apple girişi: şifresiz geçmek için komuttan önce aynı terminalde şu değişkenleri ayarla (değerler D:\PromoVote\SecretKeys içindeki App Store Connect API (Admin) key'den):
     $env:EXPO_ASC_API_KEY_PATH="D:\PromoVote\SecretKeys\<AuthKey_XXXX>.p8"
     $env:EXPO_ASC_KEY_ID="<key id>"
     $env:EXPO_ASC_ISSUER_ID="<issuer id>"
     $env:EXPO_APPLE_TEAM_ID="<team id>"
     Bu değerler klasörde yoksa veya Apple ID ve şifre sorulursa dur, ben yazarım.
   - Distribution Certificate: yeni oluştur (Yes)
   - com.miapera.promovote için Provisioning Profile: yeni oluştur (Yes)
   - Push Notifications key sorulursa: No
4. Sonunda credentials listesinde Distribution Certificate ve Provisioning Profile göründüğünü kontrol et.

====================
BÖLÜM B. APP STORE CONNECT
====================
B1. Uygulama kaydı
1. https://appstoreconnect.apple.com/apps
2. PromoVote yoksa: "+" > New App. iOS, Name "PromoVote", Primary Language "English (U.S.)", Bundle ID com.miapera.promovote, SKU "promovote-ios", Full Access.
3. App Information sayfasındaki "Apple ID" numarasını (sadece rakam) not al.

B2. In-App Purchase key
1. Users and Access > Integrations > In-App Purchase sekmesi.
2. "+" ile key oluştur, adı "PromoVote API".
3. .p8 dosyasını D:\PromoVote\SecretKeys klasörüne kaydet (sadece bir kez indirilebilir). Key ID'yi not al.

B3. Sunucu bildirimleri
1. Apps > PromoVote > App Information > App Store Server Notifications.
2. Production Server URL ve Sandbox Server URL: https://api.promovote.com/v1/webhooks/apple
3. Version 2 seç, kaydet.

B4. Uygulama bilgileri
1. Category: Primary "Entertainment", Secondary "Games" yoksa "Social Networking".
2. Age Rating anketini doldur: kullanıcı içeriği var, sınırsız web erişimi yok, kumar yok. Sonuç 18+ olmalı.
3. App Privacy: Privacy Policy URL yukarıdaki. Toplanan veriler: Email, Name (Apple ile girişte), User ID, Coarse Location (ülke), Product Interaction (izleme, oy), Purchases. Hepsi "App Functionality", kimliğe bağlı, tracking YOK, satılmıyor.
4. Pricing and Availability: Free, tüm ülkeler.
5. Business bölümünde Paid Apps Agreement durumuna bak. Tamamlanmamışsa dur ve bana söyle, banka ve vergi bilgisini ben girerim.
6. Small Business Program başvurusu: https://developer.apple.com/app-store/small-business-program/ . Form doldurmak gerekiyorsa şirket bilgilerini kullan, yasal onay kısmında bana sor.
7. App icon olarak store/assets/app-store-icon-1024.png kullanılır (build içinde de aynı ikon var). Ekran görüntüleri ve açıklama metni için şimdilik dur, uygulama ekranları hazır olunca yapılacak.

====================
BÖLÜM C. GOOGLE CLOUD
====================
C1. Proje
1. hazimokutan@gmail.com ile https://console.cloud.google.com/?authuser=hazimokutan@gmail.com adresinde "PromoVote" projesi yoksa oluştur.

C2. Google ile giriş (OAuth)
1. Google Auth Platform > Branding: App name PromoVote, support email support@promovote.com, home page, privacy ve terms linkleri yukarıda, authorized domain promovote.com. Audience: External, Publish (production).
2. Clients bölümünde oluştur:
   - Web application, adı "PromoVote server". Ayar yok.
   - iOS, bundle id com.miapera.promovote.
   - Android, package com.miapera.promovote, SHA-1: expo.dev > promovote projesi > Credentials > Android > production keystore'daki SHA-1.
   - İkinci Android client: aynı package, SHA-1 olarak Play Console > Test and release > App integrity > App signing key certificate SHA-1 (Bölüm D bittikten sonra).
3. Client ID'leri not al. Client secret'ları kullanmıyoruz, indirme.

C3. Google Play API için service account
1. APIs and Services > Library: "Google Play Android Developer API" etkinleştir. "Cloud Pub/Sub API" da etkinleştir.
2. IAM and Admin > Service Accounts > Create: adı "play-api". Rol verme.
3. Bu hesap > Keys > Add key > JSON. Dosyayı D:\PromoVote\SecretKeys klasörüne kaydet.
4. Service account email adresini not al.

C4. Satın alma bildirimleri (Pub/Sub)
1. Pub/Sub > Topics > Create: "play-rtdn".
2. Topic izinleri: "google-play-developer-notifications@system.gserviceaccount.com" hesabına "Pub/Sub Publisher" rolü ver.
3. Subscription oluştur: adı "play-rtdn-push", Delivery type Push, endpoint https://api.promovote.com/v1/webhooks/google

====================
BÖLÜM D. GOOGLE PLAY CONSOLE
====================
D1. Uygulama
1. hazimokutan@gmail.com ile https://play.google.com/console/?authuser=hazimokutan@gmail.com > Create app: "PromoVote", English (United States), App, Free. Beyanlar için bana sor.
2. Hesap türünü kontrol et (Organization mı Personal mı). Personal ise üretime çıkmadan önce 12 test kullanıcısı ile 14 gün kapalı test şartı var, bunu bana yaz.

D2. İlk Android dosyası (elle yükleme şart)
1. Build sayfası: https://expo.dev/accounts/mhokutan/projects/promovote/builds/717c2210-d583-43ab-bce7-68a9379979e9
2. Build bittiyse .aab dosyasını indir. Bitmediyse bekle. Hata verdiyse bana söyle.
3. Play Console > Test and release > Testing > Internal testing > Create new release. Play App Signing'i kabul et (Google yönetsin). .aab dosyasını yükle, release notes "First internal build", kaydet ve yayınla.
4. Testers: email listesi oluştur, içine hazimokutan@gmail.com ekle.

D3. Service account izinleri
1. Users and permissions > Invite new users > Bölüm C3'teki service account email.
2. App permissions: PromoVote. İzinler: View app information, Manage store presence, Release to testing tracks, Release to production, View financial data, Manage orders and subscriptions.
3. Davet et.

D4. Para alma
1. Setup > Payments profile durumuna bak. Yoksa dur ve bana söyle, banka ve vergi bilgisini ben girerim.
2. Monetize with Play > Monetization setup > Real-time developer notifications: topic adı "projects/<GOOGLE_CLOUD_PROJECT_ID>/topics/play-rtdn". "Send test notification" ile dene.
3. Play Console'daki 15% servis ücreti programı (hesap grubu kaydı) varsa kayıt ol, yasal onay kısmında bana sor.

D5. App content
Policy and programs > App content bölümünü doldur:
- Privacy policy: https://promovote.com/privacy
- Ads: Yes (uygulamada sponsorlu tanıtımlar var)
- App access: giriş gerekiyor. Test hesabı bilgisi için bana sor.
- Content rating: anketi doldur (kullanıcı içeriği var, kumar yok, şiddet yok), email support@promovote.com.
- Target audience: 18 and over.
- Data safety: B4 maddesi 3'teki verilerle aynı. Şifreli iletim: evet. Kullanıcı silme isteyebilir: evet (uygulama içinde ve support@promovote.com).
- Government apps, financial features, health, news: hayır.
Store listing: App icon store/assets/play-icon-512.png, Feature graphic store/assets/feature-graphic-1024x500.png, short description yukarıdaki kısa açıklama. Ekran görüntüleri ve uzun açıklama için şimdilik dur.

====================
BÖLÜM E. KEY'LERİ BULUT ORTAMINA EKLEME
====================
Claude Code bulut oturumlarının ortamına (claude.ai/code, NewIdea oturumlarının kullandığı ortam, Edit > Environment variables) şu değişkenleri ekle. Her değişken TEK SATIR olmalı (KEY=value), tırnak yok.
- ASC_APP_ID=<B1 Apple ID rakamı>
- APPLE_IAP_KEY_ID=<B2 Key ID>
- APPLE_IAP_KEY_P8=<B2 .p8 dosyasının içeriği, BEGIN ve END satırları hariç, satır sonları silinmiş, tek satır>
- GOOGLE_PLAY_SA_JSON_B64=<C3 JSON dosyasının base64 hali, tek satır>
  PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\PromoVote\SecretKeys\<dosya>.json"))
- GOOGLE_CLOUD_PROJECT_ID=<proje id>
- GOOGLE_OAUTH_WEB_CLIENT_ID=<C2 web client id>
- GOOGLE_OAUTH_IOS_CLIENT_ID=<C2 iOS client id>
- GOOGLE_OAUTH_ANDROID_CLIENT_IDS=<C2 Android client id'leri, virgülle>
Ortamda zaten olanlar: EXPO_TOKEN, EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID, EXPO_APPLE_TEAM_ID, EXPO_ASC_API_KEY_P8. Onlara dokunma.

====================
BÖLÜM F. GIT İLE HABERLEŞME
====================
Bulut oturumundaki Claude ile bu repo üzerinden haberleşiyorsun.
1. Her bölüm bitince store/status.md dosyasını güncelle: bölüm adı, durum (bitti / yarım / beklemede), not. Gizli olmayan değerleri yazabilirsin: App Store Apple ID, Google Cloud project id, service account email, OAuth client id'leri, Google Play hesap türü.
2. Asla yazma: .p8 içeriği, JSON key içeriği, şifre, token, Shared Secret.
3. Commit et ve branch claude/gracious-pasteur-nu8ssc'ye push et. Commit mesajı örneği: "Store setup: section B done".
4. Her bölüme başlamadan önce "git pull" yap. Bulut Claude bu dosyaya sana not veya yeni iş bırakabilir ("Bulut Claude notları" bölümü). Oradaki işleri de yap.
5. Hepsi bitince dosyanın en üstüne "DURUM: TAMAMLANDI" yaz, push et, bana kısa özet ver.
```

---

Masaüstü Claude bitirince bulut oturumundaki Claude şunları yapar:

1. iOS production build (non-interactive) ve Android build.
2. 4 ürünü App Store Connect API ve Google Play Developer API ile oluşturur.
3. Uygulamaya StoreKit ve Play Billing ekler (`expo-iap`).
4. Worker'a `/v1/webhooks/apple` ve `/v1/webhooks/google` uçlarını ve satın alma doğrulamasını ekler, key'leri Worker secret olarak yükler.
5. Google ile giriş client id'lerini API ve EAS ortamına yazar.
