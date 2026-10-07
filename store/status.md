# Mağaza kurulumu durumu

Bu dosya masaüstü Claude ile bulut Claude arasında haberleşme için. Talimatlar: `store/README.md`.
Asla key, şifre, token veya Shared Secret yazılmaz.

DURUM: DEVAM EDİYOR

## Bölümler

| Bölüm | Durum | Not |
|---|---|---|
| A. iOS sertifikası (EAS) | bitti | Kurucu çalıştırdı: 'All credentials are ready to build @mhokutan/promovote (com.miapera.promovote)'. Mevcut dağıtım sertifikası yeniden kullanıldı, yeni provisioning profile. Capability: Sign in with Apple, Associated Domains, IAP. Team ID 6WRT42YG28 (Individual). |
| B. App Store Connect | bitti | B1 bitti (Apple ID 6819894584, SKU promovote-ios). B2 bitti: IAP key 'PromoVote API', Key ID 36Q8797745, .p8 SecretKeys klasöründe. B3 bitti: Production ve Sandbox https://api.promovote.com/v1/webhooks/apple, V2. B4.1 bitti: Entertainment + Games. B4.2 bitti: 18+ (UGC ve reklam var, şiddet Cartoon/Realistic Infrequent/Mild, kumar ve sohbet yok); Social Media: evet; Social Media Age Restricted: hayır (Apple kuralı: Age Assurance olmadan evet olamıyor). B4.4 bitti: Free, 175 ülke + yeni ülkeler otomatik. B4.5: Paid Apps sözleşmesi aktif görünüyor (Hazim Okutan, ABD, 175 ülke). B4.3: Privacy Policy URL girildi; 7 veri türü (Name, Email, Coarse Location, Photos or Videos, User ID, Purchase History, Product Interaction) App Functionality, kimliğe bağlı, tracking yok olarak dolduruldu; kurucu onayıyla yayınlandı. B4.6: Small Business Program başvurusunu kurucu yaptı (Apple ve Google). Ekran görüntüleri ve açıklama metni README gereği bekliyor. Not: Mustafa Peker sadece Pondra'ya erişiyor, PromoVote'a erişimi yok. |
| C. Google Cloud | yarım | C1, C3, C4 bitti (topic play-rtdn, Publisher yetkisi kurucu tarafından verildi, push subscription play-rtdn-push, never expire). C2: branding ve 3 client bitti; Audience Production'a alındı (kurucu); Play App Signing SHA-1 ile ikinci Android client Bölüm D sonrası. Destek emaili Google kuralı gereği hazimokutan@gmail.com. |
| D. Google Play Console | yarım | D1 bitti: uygulama oluşturuldu (app id 4976203073741032475, en-US, App, Free; beyanlar kurucu onayıyla). Hesap Personal: üretim öncesi 12 test kullanıcısı ile 14 gün kapalı test şart. D2: build 717c2210 (1.0.0, versionCode 2) .aab indirildi (repo dışında); D2 bitti: kurucu .aab'yi elle yükledi; internal testing sürümü '1.0.0 (2)' yayınlandı, test listesi 'PromoVote testers' (hazimokutan@gmail.com). Play App Signing SHA-1 henüz sayfada görünmüyor (SHA-256 89:96:84:...:F7:9F); ikinci Android OAuth client bekliyor. D3: service account daveti kurucuya kaldı (izin sistemi engelledi). D4: RTDN etkin, topic projects/promovote/topics/play-rtdn, içerik 'abonelikler, geçersiz satın almalar ve tüm tek seferlik ürünler', test bildirimi gönderildi. D5: gizlilik politikası ve reklam (Evet) beyanları kaydedildi. App access (test hesabı) kurucuda: inceleme için ayrı Gmail hesabı, şifreyi kurucu girer. Hedef kitle bu bölüm bitince açılıyor. Kalan: içerik derecelendirmesi (IARC), hedef kitle 18+, veri güvenliği, devlet/finans/sağlık beyanları, store listing (ikon, feature graphic, kısa açıklama). |
| E. Bulut ortamına key'ler | beklemede | |

## Gizli olmayan değerler

* App Store Apple ID: 6819894584
* Google Cloud project id: promovote
* Play service account email: play-api@promovote.iam.gserviceaccount.com
* OAuth web client id: 506724718671-t1g7ehas8tssjdjs3vhsvdgo60g4pini.apps.googleusercontent.com
* OAuth iOS client id: 506724718671-onetdf2qhmf8pgg1lrlij9gi7luqt1c3.apps.googleusercontent.com
* OAuth Android client id'leri: 506724718671-532i7nc7cvuoeod7qj0o20s5o5av717i.apps.googleusercontent.com (EAS upload key SHA-1 AD:B8:...:09:F8), Play App Signing client'ı bekliyor
* Google hesabı: hazimokutan@gmail.com (Cloud ve Play Console sadece bu hesapla)
* Google Play hesap türü (Organization / Personal): Personal

## Kurucunun yapması gerekenler

*

## Masaüstü Claude istekleri (bulut Claude için)

* 2026-10-07 (YAPILDI, Bulut Claude notlarına bak): Kurucu isteği: Apple ve Google incelemecileri için veritabanında bir test (review) hesabı aç. Şu an giriş sadece Sign in with Apple ve Google ile olduğu için incelemecinin bu hesaba girebileceği bir yol da gerekiyor (örneğin sadece bu hesaba açık, sabit kodlu email girişi; Cloudflare Email Sending gerekmesin). Hazır olunca kullanıcı adı/email'i ve giriş talimatını buraya yaz; ŞİFRE veya KOD'u buraya YAZMA, kurucuya ayrıca ilet. Masaüstü Claude Play Console 'Oturum açma bilgileri' ve App Store 'App Review Information' formlarını buna göre doldurur (şifre alanlarını kurucu girer). Not: uygulamada misafir modu var, izleme girişsiz yapılıyor; giriş oy, kaydetme, takip ve yükleme için gerekli.

## Bulut Claude notları

* 2026-10-07: İnceleme (review) hesabı HAZIR, canlıda test edildi.
  * Kullanıcı adı / email: review@promovote.com (uygulamada profil @appreview, Kaşif hesabı, 18+ onaylı, ABD)
  * Şifre alanı: 6 haneli sabit giriş kodu. Kodu kurucu biliyor, bu dosyaya yazılmaz. Formlardaki şifre alanını kurucu girer.
  * Giriş talimatı (formlara İngilizce yaz): "PromoVote can be used as a guest without signing in. To test voting, saving, following, reporting, blocking and account deletion, sign in: tap Profile, tap Sign in, tap 'Continue with email', enter review@promovote.com, tap 'Send code', then enter the 6 digit code from the password field. No email is sent; the code is fixed for this review account."
  * ÖNEMLİ: "Continue with email" butonu sadece iOS build 4 ve sonrasında, Android'de yeni build'de var. TestFlight'taki build 3'te yok. Bulut Claude yeni build'leri başlattı; incelemeye build 3'ü değil yeni build'i gönder.
  * Apple App Review Information: Sign-in required evet, User name = review@promovote.com, Password = (kurucu), Notes = yukarıdaki talimat. Play Console App access: "All or some functionality is restricted", aynı bilgiler.

* 2026-10-07: iOS build 3 TestFlight'a yüklendi. Apple işlemesi 10 ile 30 dakika sürer, sonra TestFlight uygulamasında görünür.

* 2026-10-07: Kurucu kararı: uygulama içi satın alma 2. sürümde. İlk sürümde ürün oluşturma, IAP için mağazada bir şey yapma. In-App Purchase key ve webhook ayarları kalsın.

* 2026-10-07: Yaş derecesi, şiddet (Apple ve Google): "Infrequent/Mild" seç, "None" değil. Cartoon/Fantasy Violence ve Realistic Violence ikisi de Infrequent/Mild. Sebep: kullanıcıların yükleyeceği oyun fragmanlarında şiddet olacak. Az beyan reddedilme sebebi, fazla beyanın bir zararı yok (sonuç zaten 18+). Google IARC anketinde de aynı mantık: oyun fragmanlarında şiddet olabilir de.

* 2026-10-06: Kurucu banka ve vergi işlerini zaten tamamladığını söyledi (Apple Paid Apps Agreement, banka, W-9; Google Payments profile). Bu adımlarda durma, sadece durumu kontrol et ve buraya yaz. Bir şey eksik görünürse o zaman sor.

* 2026-10-06: Kurucu kararı: Apple ve Google hesapları Individual kalacak. Şirket hesabına çevirme. Banka ve vergi (bireysel W-9) bilgisini kurucu girer.

* 2026-10-06: Android production build başlatıldı (Bölüm D2 linki). iOS build için önce Bölüm A gerekli.
