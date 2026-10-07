# Mağaza kurulumu: masaüstü Claude için talimat

Tarih: 2026-10-06. Kurucu kararı: App Store ve Google Play kurulumunu kurucunun bilgisayarındaki Claude (masaüstü uygulama, tarayıcı ve terminal) yapar. Kurucu sadece giriş, 2FA, banka ve vergi adımlarında devreye girer.

RevenueCat kullanılmıyor (kurucu kararı 2026-10-06). Satın almalar uygulamada doğrudan StoreKit ve Google Play Billing ile yapılır, doğrulama `api.promovote.com` Worker'ında yapılır:

* Apple: App Store Server API (In-App Purchase key ile) ve App Store Server Notifications V2, adres `https://api.promovote.com/v1/webhooks/apple`.
* Google: Google Play Developer API (service account ile) ve Real-time Developer Notifications (Pub/Sub push), adres `https://api.promovote.com/v1/webhooks/google`.

Ürünler sürüm 2'de gelir (kurucu kararı 2026-10-07: v1 tamamen ücretsiz). Şimdilik oluşturma, sadece kayıt için:

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
- Kısa açıklama: "Discover new game trailers and app promos. Call which ones will blow up."
- Yaş sınırı: 18+. Kumar yok, parayla ödül yok, kullanıcılara para verilmez.
- Sürüm 1 tamamen ücretsiz: uygulama içi satın alma YOK, abonelik YOK. App Store Connect'te "In-App Purchases" boş kalır. (Boost ve Trailer Test sürüm 2'de, creator Pro aboneliği v1.1'de gelecek.)
- Giriş: Sign in with Apple ve Google ile giriş. Kullanıcılar henüz video YÜKLEYEMEZ (bu build'deki bütün tanıtımlar kurucunun 3 stüdyosuna ait). Şikayet etme ve engelleme her tanıtımda ve firma sayfasında var, hesap silme uygulama içinde var (Profil > sağ üstteki ... > Hesabı sil).
- Metinlerde şu kelimeler KULLANILMAZ: "watch ads", "ad network", "earn", "For you". (Apple 3.2.2(iii): reklam göstermek için yapılmış uygulama gibi görünmemeli.)

APP REVIEW NOTES (App Store Connect > App Review Information > Notes, İngilizce, aynen yapıştır; kod satırını yazma, kodu kurucu ayrı alana girer)
PromoVote is a community where scouts discover game trailers, app promos and creator videos and call which ones will blow up. Calls resolve after 7 days and build a Scout Score, a reputation score with no cash value. Creators are separate accounts and cannot vote. All promos in this build are posted by the founder's three studios and are labeled "Made by the PromoVote founder". User video upload is not open yet. Report and Block are under the "..." button on every promo and on every creator page. Account deletion: Profile, the "..." button at the top right, Delete account. Review account: tap Profile, Sign in, Continue with email, enter review@promovote.com and the code from the sign in information field. The app is free; there are no purchases in this version.

UZUN AÇIKLAMA (App Store ve Google Play, İngilizce)
PromoVote is where new games, apps and shops get discovered first.

Every day you get Today's Drop: 7 fresh trailers and promos from indie studios and new creators. Watch, then make your call: Will blow up, or Not for me. Seven days later the crowd decides, and right calls grow your Scout Score. Early scouts who spot a hit first get the most credit.

What you can do:
- Watch Today's Drop, New and Team picks, all free
- Call which promos will blow up and see your results
- Keep a weekly streak and track your accuracy
- Save promos and follow the creators you like
- Get gifts and codes from creators (they never ask for your calls or follows)

Fair by design: paying never buys a spot on the charts, Team picks are never paid, and your Scout Score is a reputation score with no cash value.

For creators: build a page with your logo, banner, links and main button, see free stats for every promo, and offer gifts to scouts.

PromoVote is for people 18 and older.

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
1. Category: Primary "Entertainment", Secondary "Social Networking". "Games" SEÇME (uygulama oyun değil, Apple yanlış kategori için reddedebilir). Content Rights: "Yes, it contains third-party content" ve "I have the necessary rights" (kullanıcı ve creator içeriği olan bir platform).
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
Store listing: App icon store/assets/play-icon-512.png, Feature graphic store/assets/feature-graphic-1024x500.png, short description yukarıdaki kısa açıklama. Ekran görüntüleri ve uzun açıklama: Bölüm G.

====================
BÖLÜM G. İNCELEMEYE GÖNDERME (kurucu onayı 2026-10-07: "masaüstü apple ve google a yüklesin")
====================
G1. App Store (iOS build 12)
1. App Store Connect > Apps > PromoVote > iOS App > 1.0 Prepare for Submission.
2. Build: "+" ile 1.0.0 (12) seç. TestFlight'ta 12 görünmüyorsa veya "Processing" ise bekle; 11 veya 10'u SEÇME. Export compliance sorulursa: sadece standart HTTPS şifreleme, muaf (app.json içinde ITSAppUsesNonExemptEncryption false zaten var).
3. iPhone 6.9" Display ekran görüntüleri: store/assets/screens/ios/en/1-feed.png, 2-ticket.png, 3-reveal.png, 4-profile.png, 5-creator.png (bu sırayla). Daha küçük iPhone boyutlarını Apple bundan üretir. iPad yok (uygulama sadece iPhone).
4. Promotional Text: "Today's Drop is 7 fresh promos a day. Call the next big hit."
   Description: yukarıdaki UZUN AÇIKLAMA, aynen.
   Keywords: indie games,game trailers,new apps,discover,predict,hits,promos,creators,scout,trends
   Support URL: https://promovote.com/support  Marketing URL: https://promovote.com
   Copyright: 2026 Hazim Okutan
5. Ürün sayfası header ve arama sonucu görseli (API ile yüklenemiyor, tarayıcıdan): Product Page Information > "Header and Search Results" > Header = store/assets/header/header-3840x1646.png, Search Results = store/assets/header/search-3840x2560.png. Sürüm kilitliyse Asset Library üzerinden ayrı gönder. Preview ile iPhone görünümünü kontrol et.
6. App Review Information: Sign-in required evet, User name review@promovote.com, Password alanını kurucu girer (kodu kimseye yazma). Notes: yukarıdaki APP REVIEW NOTES, aynen. İletişim bilgileri zaten girili.
7. Version Release: "Manually release this version" (onaydan sonra yayın tarihini kurucu seçer).
8. "Add for Review" > "Submit to App Review". Sonucu status.md'ye yaz.
İspanyolca (es-MX) ve Türkçe (tr) ekran görüntüleri store/assets/screens/ios/es ve tr klasörlerinde hazır. Şimdilik sadece en-US listing; o dillerde listing açılırsa metinleri bulut Claude çevirir.

G2. Google Play (Android build 9, kapalı test)
1. Build 9 Expo'da hazır olunca (https://expo.dev/accounts/mhokutan/projects/promovote/builds, Android, versionCode 9, durum Finished) .aab dosyasını indir. Build 9 bitmediyse store listing adımlarını yap, AAB'yi sonra yükle. Build 7'yi YÜKLEME (eski).
2. Store listing > Main store listing: Full description = UZUN AÇIKLAMA. Phone screenshots: store/assets/screens/play/en/1-feed.png ... 5-creator.png (1080x1920, bu sırayla). Tablet ekran görüntüsü gerekmez.
3. Test and release > Testing > Closed testing: yeni track veya "Closed testing - Alpha". Create release, .aab'yi yükle. Release name "1.0.0 (9)". Release notes (en-US): "First closed test of PromoVote: Today's Drop, calls, Scout Score, creator pages and gifts."
4. Testers: email listesi. Google Personal hesap kuralı: production'a çıkmak için en az 12 test kullanıcısı 14 gün boyunca kapalı teste katılmış olmalı. Liste için kurucuya sor (en az 12 Gmail). Ülkeler: hepsi.
5. "Send for review" ile gönder. Sonucu ve opt-in linkini (test kullanıcılarının katılma linki) status.md'ye yaz; link gizli değil.

====================
BÖLÜM H. EXPO KOTASI OLMADAN BUILD (kurucu kararı 2026-10-07: "apple git üzerinden, google bilgisayardan")
====================
H1. iOS: GitHub Actions (repo public, macOS makinesi ücretsiz)
Workflow: .github/workflows/ios-build.yml. GitHub'ın macOS makinesinde "eas build --local" ile build alır (EAS build kotası harcamaz), sonra .ipa'yı App Store Connect'e (TestFlight) yükler.
1. Repo secret'larını ekle (bir kere): https://github.com/mhokutan/NewIdea/settings/secrets/actions > New repository secret. Değerleri sohbete veya dosyaya YAZMA.
   - EXPO_TOKEN: expo.dev > Account settings > Access tokens > Create (adı "github-actions"). Bulut ortamındaki EXPO_TOKEN ile aynı da olabilir.
   - ASC_KEY_ID: D:\PromoVote\SecretKeys içindeki App Store Connect API (Admin veya App Manager) key'in Key ID'si.
   - ASC_ISSUER_ID: App Store Connect > Users and Access > Integrations > App Store Connect API sayfasındaki Issuer ID.
   - ASC_KEY_P8: AuthKey_<id>.p8 dosyasının tüm içeriği (BEGIN ve END satırlarıyla birlikte).
   (In-App Purchase key DEĞİL; App Store Connect API key.)
2. Başlatma: bulut Claude mesajında "[build ios]" olan bir commit push eder. Ya da GitHub > Actions > "iOS build" > Run workflow (bu düğme sadece workflow varsayılan branch'e gelince görünür).
3. Süre 30 ile 60 dakika. Bitince Apple işlemesi 10 ile 30 dakika, sonra TestFlight'ta görünür. Build numarasını EAS otomatik artırır.
4. Hata olursa Actions sayfasındaki log'u bulut Claude'a söyle; log'da secret değerleri görünmez.

H2. Android: GitHub Actions (kurucu kararı 2026-10-07, masaüstü sadece kurulum ve düzenleme için)
Workflow: .github/workflows/android-build.yml. GitHub'ın Linux makinesinde .aab üretir ve Play Developer API ile Kapalı test - Alpha kanalına yükler (.github/scripts/play-upload.mjs). Uygulama Play'de henüz hiç incelenmediyse API sadece TASLAK sürüm kabul eder; o zaman Play Console'da sürümü açıp "İncelemeye gönder" demek gerekir.
1. Repo secret'ı ekle (bir kere): GOOGLE_PLAY_SA_JSON = Bölüm C3'te indirilen service account JSON dosyasının tüm içeriği (D:\PromoVote\SecretKeys içinde, Play Console'da yetkisi D3'te verildi). EXPO_TOKEN zaten var.
2. Başlatma: bulut Claude mesajında "[build android]" olan bir commit push eder.

H3. Android yedek yol: kurucunun Windows bilgisayarı (sadece GitHub yolu çalışmazsa)
"eas build --local" Windows'ta çalışmaz, WSL (Ubuntu) içinde çalışır. Bir kere kurulum:
1. PowerShell (yönetici): wsl --install -d Ubuntu  (yeniden başlat, Ubuntu kullanıcı adı ve şifresini kurucu girer)
2. Ubuntu içinde:
   sudo apt update && sudo apt install -y openjdk-17-jdk unzip git curl
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
   mkdir -p ~/android/cmdline-tools && cd ~/android/cmdline-tools && curl -LO https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && unzip -q commandlinetools-linux-*_latest.zip && mv cmdline-tools latest
   echo 'export ANDROID_HOME=$HOME/android; export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH' >> ~/.bashrc && source ~/.bashrc
   yes | sdkmanager --licenses && sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
   (sdkmanager daha yeni sürüm isterse build log'u söyler, onu kur.)
Her build:
   git clone --filter=blob:none --sparse -b claude/gracious-pasteur-nu8ssc https://github.com/mhokutan/NewIdea ~/promovote && cd ~/promovote && git sparse-checkout set apps/mobile   (ilk sefer; sonra: cd ~/promovote && git pull)
   cd ~/promovote/apps/mobile && npm ci
   export EXPO_TOKEN=<token>   (değeri kurucu yapıştırır)
   npx -y eas-cli@latest build -p android --profile production --local --non-interactive --output ~/promovote.aab
   cp ~/promovote.aab /mnt/d/PromoVote/   (Windows'tan D:\PromoVote\promovote.aab olarak görünür)
Sonra Play Console > Test and release > Closed testing > Create release > .aab yükle (Bölüm G2 adımları). İmza anahtarı EAS'ten iner, Play App Signing ile aynı upload key; yeni key oluşturma.

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
