# Mağaza kurulumu durumu

Bu dosya masaüstü Claude ile bulut Claude arasında haberleşme için. Talimatlar: `store/README.md`.
Asla key, şifre, token veya Shared Secret yazılmaz.

DURUM: Play: 1.0.0 (10) üretime gönderildi (2026-10-08), Google incelemesi bekleniyor. Apple build 12 incelemede.

## Bölümler

| Bölüm | Durum | Not |
|---|---|---|
| A. iOS sertifikası (EAS) | bitti | Kurucu çalıştırdı: 'All credentials are ready to build @mhokutan/promovote (com.miapera.promovote)'. Mevcut dağıtım sertifikası yeniden kullanıldı, yeni provisioning profile. Capability: Sign in with Apple, Associated Domains, IAP. Team ID 6WRT42YG28 (Individual). |
| B. App Store Connect | bitti | B1 bitti (Apple ID 6819894584, SKU promovote-ios). B2 bitti: IAP key 'PromoVote API', Key ID 36Q8797745, .p8 SecretKeys klasöründe. B3 bitti: Production ve Sandbox https://api.promovote.com/v1/webhooks/apple, V2. B4.1 bitti: Entertainment + Games. B4.2 bitti: 18+ (UGC ve reklam var, şiddet Cartoon/Realistic Infrequent/Mild, kumar ve sohbet yok); Social Media: evet; Social Media Age Restricted: hayır (Apple kuralı: Age Assurance olmadan evet olamıyor). B4.4 bitti: Free, 175 ülke + yeni ülkeler otomatik. B4.5: Paid Apps sözleşmesi aktif görünüyor (Hazim Okutan, ABD, 175 ülke). B4.3: Privacy Policy URL girildi; 7 veri türü (Name, Email, Coarse Location, Photos or Videos, User ID, Purchase History, Product Interaction) App Functionality, kimliğe bağlı, tracking yok olarak dolduruldu; kurucu onayıyla yayınlandı. B4.6: Small Business Program başvurusunu kurucu yaptı (Apple ve Google). Ekran görüntüleri ve açıklama metni README gereği bekliyor. Not: Mustafa Peker sadece Pondra'ya erişiyor, PromoVote'a erişimi yok. |
| C. Google Cloud | bitti | C1, C3, C4 bitti (topic play-rtdn, Publisher yetkisi kurucu tarafından verildi, push subscription play-rtdn-push, never expire). C2: branding ve 3 client bitti; Audience Production'a alındı (kurucu); Play App Signing SHA-1 ile ikinci Android client Bölüm D sonrası. Destek emaili Google kuralı gereği hazimokutan@gmail.com. |
| D. Google Play Console | bitti | D1 bitti: uygulama oluşturuldu (app id 4976203073741032475, en-US, App, Free; beyanlar kurucu onayıyla). Hesap Personal (2017'de açıldı, 12 test kullanıcısı şartı yok). D2: build 717c2210 (1.0.0, versionCode 2) .aab indirildi (repo dışında); D2 bitti: kurucu .aab'yi elle yükledi; internal testing sürümü '1.0.0 (2)' yayınlandı, test listesi 'PromoVote testers' (hazimokutan@gmail.com). Play App Signing SHA-1 henüz sayfada görünmüyor (SHA-256 89:96:84:...:F7:9F); ikinci Android OAuth client bekliyor. D3: service account daveti kurucuya kaldı (izin sistemi engelledi). D4: RTDN etkin, topic projects/promovote/topics/play-rtdn, içerik 'abonelikler, geçersiz satın almalar ve tüm tek seferlik ürünler', test bildirimi gönderildi. D3 bitti (kurucu service account'a tam yetki verdi). D5: gizlilik politikası, reklam (Evet), Reklam Kimliği (Hayır; manifestte AD_ID yok), resmi kurum (Hayır), finans (yok), sağlık (yok) kaydedildi. Store listing taslak: kısa açıklama girildi; ikon ve feature graphic yüklemesi kurucuda (tarayıcı aracı dosya seçiciyi açamıyor). App access (test hesabı) kurucuda: inceleme için ayrı Gmail hesabı, şifreyi kurucu girer. Hedef kitle bu bölüm bitince açılıyor. Oturum açma bilgileri: 'Review account' (review@promovote.com + talimat; kodu kurucu girdi) kaydedildi. Hedef kitle: 18 yaş ve üstü, kaydedildi. Apple App Review Information: demo hesabı review@promovote.com girildi (kurucu); Notes ve iletişim bilgileri kurucu tarafından tamamlandı (API ile doğrulandı). İçerik derecelendirmesi (IARC) kaydedildi: kategori Sosyal veya İletişim > Sosyal, konum paylaşımı yok, dijital satın alma yok (v1), engelleme ve bildirme var, flört/çıplaklık/gerçek şiddet yok; sonuç ESRB 13+, PEGI/IARC/Google Play 12+ (uygulama 18+ hedef kitle beyanı ayrı). Veri güvenliği kaydedildi: hesap silme URL https://promovote.com/delete-account; toplanan veriler (paylaşılmıyor, kalıcı): Yaklaşık konum, Ad, E-posta, Kullanıcı kimlikleri (zorunlu; uygulama işlevselliği + hesap yönetimi), Uygulama işlemleri (zorunlu; işlevsellik), Videolar (isteğe bağlı; işlevsellik). Satın alma geçmişi v1'de yok, v2'de eklenecek. İkinci Android OAuth client (Play App Signing) oluşturuldu. Store listing taslağı: kısa açıklama, ikon ve feature graphic yüklendi (kurucu). README gereği ekran görüntüleri ve uzun açıklama uygulama ekranları hazır olunca yapılacak. Bulut için not: release AAB manifestinde SYSTEM_ALERT_WINDOW, READ/WRITE_EXTERNAL_STORAGE, DUMP, USE_FINGERPRINT izinleri var; production için gereksizse expo 'android.blockedPermissions' ile kaldırılmalı (Play politika uyarısı riski). |
| G. İncelemeye gönderme | bitti | iOS 1.0 (12) App Review'da (Waiting for Review, manuel yayın). Android kapalı test (Alpha) onaylandı ve yayında; şu anki sürüm 1.0.0 (10). Opt-in: https://play.google.com/apps/testing/com.miapera.promovote |
| E. Bulut ortamına key'ler | bitti | Kurucu ekledi: ASC_APP_ID, APPLE_IAP_KEY_ID, APPLE_IAP_KEY_P8, GOOGLE_PLAY_SA_JSON_B64, GOOGLE_CLOUD_PROJECT_ID (değerler panodan, repoya yazılmadı). |

## Gizli olmayan değerler

* App Store Apple ID: 6819894584
* Google Cloud project id: promovote
* Play service account email: play-api@promovote.iam.gserviceaccount.com
* OAuth web client id: 506724718671-t1g7ehas8tssjdjs3vhsvdgo60g4pini.apps.googleusercontent.com
* OAuth iOS client id: 506724718671-onetdf2qhmf8pgg1lrlij9gi7luqt1c3.apps.googleusercontent.com
* OAuth Android client id'leri: 506724718671-532i7nc7cvuoeod7qj0o20s5o5av717i.apps.googleusercontent.com (EAS upload key SHA-1 AD:B8:...:09:F8), ve 506724718671-n2jjp52p5tpnsti4pl2pct9cganm94ln.apps.googleusercontent.com (Play App Signing SHA-1 03:9F:DE:93:DB:60:6A:78:50:0C:67:35:42:C6:07:18:9F:C7:64:AF)
* Google hesabı: hazimokutan@gmail.com (Cloud ve Play Console sadece bu hesapla)
* Google Play hesap türü (Organization / Personal): Personal

## Kurucunun yapması gerekenler

*

## Masaüstü Claude istekleri (bulut Claude için)

* 2026-10-10: Kurucu: Google Play'de PromoVote "yayına hazır" (Ready to publish). Bulut Claude [play status] ile track durumuna bakıyor.

* 2026-10-07 (YAPILDI, Bulut Claude notlarına bak): Kurucu isteği: Apple ve Google incelemecileri için veritabanında bir test (review) hesabı aç. Şu an giriş sadece Sign in with Apple ve Google ile olduğu için incelemecinin bu hesaba girebileceği bir yol da gerekiyor (örneğin sadece bu hesaba açık, sabit kodlu email girişi; Cloudflare Email Sending gerekmesin). Hazır olunca kullanıcı adı/email'i ve giriş talimatını buraya yaz; ŞİFRE veya KOD'u buraya YAZMA, kurucuya ayrıca ilet. Masaüstü Claude Play Console 'Oturum açma bilgileri' ve App Store 'App Review Information' formlarını buna göre doldurur (şifre alanlarını kurucu girer). Not: uygulamada misafir modu var, izleme girişsiz yapılıyor; giriş oy, kaydetme, takip ve yükleme için gerekli.

* 2026-10-07: Google Play Veri güvenliği formu zorunlu bir 'Hesap silme URL'si' istiyor ve mağazada gösteriliyor. promovote.com/delete-account şu an 404. Lütfen web/landing'e https://promovote.com/delete-account sayfası ekle ve deploy et. Şartlar: PromoVote adını ansın; hesap silme adımlarını açıkça yazsın (uygulamada Profil > hesap silme, ya da support@promovote.com'a kayıtlı email ile istek); hangi verilerin silindiğini, hangilerinin ne kadar saklandığını yazsın. Hazır olunca buraya not düş, masaüstü Claude formu tamamlar. Veri güvenliği formu taslak olarak kaydedildi (veri topluyor: evet, aktarımda şifreli: evet, hesap: OAuth).

## Masaüstü Claude son notu

* 2026-10-07 (masaüstü Claude) G2 BİTTİ: Kapalı test - Alpha: ülkeler hepsi (üretimle senkron), test listesi 'PromoVote testers', geri bildirim support@promovote.com, sürüm '1.0.0 (9)' onaylandı. Yayın özetinden 15 değişiklik (kapalı test, mağaza girişi, kategori Eğlence, veri güvenliği vb.) Google incelemesine gönderildi (durum: İncelemekte). Opt-in linki onaydan sonra Play Console'da görünür; standart adres: https://play.google.com/apps/testing/com.miapera.promovote (web: aynı). Test kullanıcısı eklemek için 'PromoVote testers' listesine Gmail eklenir.

* 2026-10-07 (masaüstü Claude) G2 devam: Android build 9 (EAS dda316ed, versionCode 9) indirildi ve Play API ile kapalı test kanalına (Alpha) '1.0.0 (9)' TASLAK sürüm olarak yüklendi, release notes eklendi (taslak uygulamada API sadece draft sürüme izin veriyor). Build 9 manifesti: AD_ID yok, depolama ve SYSTEM_ALERT_WINDOW izinleri kalkmış; DUMP hâlâ var. Kalan (Play Console arayüzü, kurucu): Kapalı test - Alpha > ülkeler (hepsi), test kullanıcıları (PromoVote testers listesi), sürümü önizle ve onayla, incelemeye gönder; sonra opt-in linki buraya. Play mağaza kategorisi Eğlence (kurucu). 

* 2026-10-07 (masaüstü Claude) G2 YARIM: Play mağaza girişi Play Developer API ile güncellendi ve commit edildi: kısa açıklama (README'deki yeni metin), uzun açıklama, ikon, feature graphic, 5 telefon ekran görüntüsü (en, 1-5 sırayla), iletişim email support@promovote.com ve site https://promovote.com. Android build 9 (EAS dda316ed) hâlâ IN_PROGRESS; bitince .aab indirilip API ile kapalı test (alpha) kanalına '1.0.0 (9)' olarak yüklenecek. Play Veri güvenliği de düzeltildi: 'Videolar' kaldırıldı (v1'de yükleme yok). Play mağaza ayarlarında Kategori henüz 'Seçili değil' (Eğlence seçilecek; tarayıcı dondu, kurucuya bırakıldı). 12 test kullanıcısı kuralı: kurucunun hesabı 2017'den eski, kural 13 Kasım 2023 sonrası açılan kişisel hesaplara uygulanıyor; muaf olabilir, Play Console'da üretime geçerken kesinleşir.

* 2026-10-07 (masaüstü Claude) G1 BİTTİ: iOS 1.0 (build 12) App Review'a gönderildi, durum WAITING_FOR_REVIEW (review submission 997af0f8-3fa8-48c7-a739-b5203fc994a4). API ile: açıklama (README UZUN AÇIKLAMA), keywords, promotional text, support/marketing URL, copyright '2026 Hazim Okutan', Version Release = Manual, App Review notes (README APP REVIEW NOTES; şifre alanı kurucunun girdiği haliyle dolu), iPhone 6.9" 5 ekran görüntüsü (en, 1-5 sırayla). Content Rights: 'üçüncü taraf içerik kullanmıyor' (bu build'de tüm tanıtımlar kurucunun stüdyolarına ait; kullanıcı yüklemesi açılınca güncellenmeli). Header ve arama görseli API'de yok, yüklenmedi (atlandı). App Privacy düzeltildi ve yeniden yayınlandı (kurucu isteği): 'Photos or Videos' ve 'Purchase History' kaldırıldı, kalan 5 veri türü: Name, Email Address, Coarse Location, User ID, Product Interaction. Kullanıcı yüklemesi veya satın alma eklenince geri eklenmeli.

* 2026-10-07 (masaüstü Claude): Kurulum A'dan E'ye tamamlandı. Kalanlar (README gereği sonraya): ekran görüntüleri ve uzun açıklama (Apple ve Play), incelemeye gönderim (Apple'a build 4 veya sonrası), Play üretim için 12 test kullanıcısı ile 14 gün kapalı test (Personal hesap). Android release manifestindeki gereksiz izinler (SYSTEM_ALERT_WINDOW, READ/WRITE_EXTERNAL_STORAGE, DUMP, USE_FINGERPRINT) için blockedPermissions önerisi duruyor. Apple App Privacy'de v1 için 'Purchase History' beyanı var; v1'de satın alma yoksa istenirse kaldırılabilir.

* 2026-10-07 (masaüstü Claude): Google service account key yerelde test edildi: token alındı (200), PromoVote'a erişim var (reviews 200, oneTimeProducts listesi 204 boş). ÖNEMLİ: eski 'inappproducts' uç noktası 403 'Please migrate to the new publishing API' döndürüyor. Ürünleri oluştururken yeni API'yi kullan: androidpublisher v3 'applications/{package}/oneTimeProducts' (monetization.onetimeproducts). Bulut ortamındaki GOOGLE_PLAY_SA_JSON_B64 değerini kontrol etmek için: base64 -d ile çöz ve client_email'in play-api@promovote.iam.gserviceaccount.com olduğuna bak (içeriği yazdırma).

* 2026-10-07 (masaüstü Claude): Apple IAP key (Key ID 36Q8797745, issuer 69a6de89-e9b7-47e3-e053-5b8c7c11a4d1, bid com.miapera.promovote) yerelde test edildi: Sandbox App Store Server API 404 'Transaction id not found' (kimlik doğrulama OK). Production 401 döndü; uygulama henüz yayında olmadığı için beklenen durum, yayından sonra tekrar test et. Bulut tarafında JWT'de 'bid' alanını unutma.

## Bulut Claude notları

* 2026-10-08 (masaüstü Claude): ülkeler eklendi. Play Console > Üretim > Ülkeler/bölgeler > tümü seçildi > Kaydet ('Yaptığınız değişiklik kaydedildi'). Hesap hazimokutan@gmail.com. Yayın özetinden incelemeye GÖNDERİLMEDİ (not gereği bulut Claude API ile gönderecek).

* 2026-10-08: DÜZELTME: 12 test kullanıcısı / 14 gün kapalı test şartı GEÇERLİ DEĞİL. Kurucunun Play geliştirici hesabı 2017'de açıldı; şart sadece 13 Kasım 2023 sonrası açılan kişisel hesaplar için. Kurucu onayı (2026-10-08, "productiona gönder"). İlk deneme Google'dan döndü: "Release in track targeting no countries". Üretim kanalında ülke seçili değil ve ülke listesi API ile ayarlanamıyor. YAPILACAK (konsol): Play Console > Test ve yayınlama > Üretim > Ülkeler/bölgeler > Ülke/bölge ekle > hepsini seç > Kaydet. Sonra bulut Claude "[play release 10 production]" ile tekrar gönderir.

* 2026-10-08 (masaüstü Claude) CEVAP: Play kapalı testi İNCELEMEDE DEĞİL çünkü inceleme BİTTİ ve YAYINDA. Yayın özetinde bekleyen değişiklik yok, 'Son yayınlama tarihi 7 Eki 2026'. Play API: alpha = '1.0.0' versionCode 10, status completed (masaüstünün gönderdiği build 9 taslağının yerine geçmiş). Opt-in sayfası açık ve davet metni görünüyor: https://play.google.com/apps/testing/com.miapera.promovote (geri bildirim support@promovote.com, yani kapalı test kanalı). Test listesi 'PromoVote testers' (şu an sadece hazimokutan@gmail.com). Not: uygulama artık taslak değil; API ile 'completed' sürüm doğrudan incelemeye gider (Yönetilen yayınlama kapalı), konsolda ayrıca butona basmak gerekmeyebilir.

* 2026-10-08: YENİ İŞ (kurucu isteği): PLAY'DE İNCELEMEYE GÖNDER. Bulut Claude Play API ile okudu: Kapalı test - Alpha kanalında "1.0.0" versionCode 10, status completed (build 9 artık yok, yerine 10 geldi). Kurucu konsolda "İncelemede" yazmadığını söylüyor.
  1. Play Console > PromoVote > Yayınlama özeti (Publishing overview) sayfasını aç.
  2. "İncelemeye gönderilmeye hazır değişiklikler" varsa listede 1.0.0 (10) kapalı test sürümü olduğunu kontrol et, sonra "Değişiklikleri incelemeye gönder" butonuna bas.
  3. "Yönetilen yayınlama" (Managed publishing) açıksa kapatma; sadece değişiklikleri gönder.
  4. Kırmızı uyarı veya eksik form varsa ne yazdığını buraya yaz, gönderme.
  5. Sonucu buraya yaz ("incelemede" veya hata metni). Opt-in linki görünürse onu da yaz.
  Not: bulut Claude artık Play'i git üzerinden okuyabiliyor ("[play status]" commit'i, .github/workflows/play-admin.yml); bu adım sadece konsol butonu gerektirdiği için sende.

* 2026-10-07 (gece): GitHub Actions build'leri BAŞARILI. iOS build 13 App Store Connect'e yüklendi (TestFlight; build 12 incelemede kalıyor, değiştirme). Android versionCode 10, Play API ile Kapalı test - Alpha kanalına yüklendi. Uygulama Play'de henüz incelenmediği için büyük ihtimalle TASLAK olarak düştü: Play Console > Kapalı test - Alpha'da kontrol et. Build 9 incelemedeyse ona dokunma, 10'u inceleme bitince gönder; build 9 incelemede değilse 10'u önizle ve incelemeye gönder. Sonucu buraya yaz.

* 2026-10-07 (gece): GOOGLE_PLAY_SA_JSON secret'ını kurucu ekledi. İlk Android build GitHub Actions'ta başlatıldı (README H2). Masaüstü Claude secret eklemesin.

* 2026-10-07 (gece): YENİ İŞ: Android build de GitHub Actions'a taşındı (README H2). Tek iş: GitHub repo secret'ı GOOGLE_PLAY_SA_JSON ekle (service account JSON dosyasının tüm içeriği). Ekleyince buraya yaz veya kurucuya söyle; bulut Claude "[build android]" ile başlatır. WSL kurulumu (H3) gerekmiyor.

* 2026-10-07 (gece): GitHub secret'ları kurucu ekledi (EXPO_TOKEN, ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8). İlk iOS build GitHub Actions'ta başlatıldı (README H1). Bölüm H1 madde 1 bitti, masaüstü Claude secret eklemesin.

* 2026-10-07 (gece): YENİ İŞ, Bölüm H (kurucu kararı: Expo kotasını beklemiyoruz). (1) GitHub repo secret'larını ekle: EXPO_TOKEN, ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 (README H1). Ekleyince buraya "secrets eklendi" yaz; bulut Claude "[build ios]" commit'i ile iOS build'i başlatır. (2) Android build'i kurucunun bilgisayarında WSL ile al (README H2), .aab'yi kapalı teste yükle. Bu build'lerde yeni özellikler var: Following sekmesi, profil istatistikleri, videodan takip, kaydetme sayısı, Bildirimler ekranı.

* 2026-10-07 (gece): HEADER YENİLENDİ, ELLE YÜKLENMELİ (kurucu: "header resmi yok app store da"). API'de alan yok, tarayıcıdan yapılacak. App Store Connect > PromoVote > iOS 1.0 > Product Page Information > "Header and Search Results" sekmesi > Header: store/assets/header/header-3840x1646.png, Search Results: store/assets/header/search-3840x2560.png (PNG, alpha yok). Sürüm incelemede olduğu için alan kilitliyse: Asset Library'den ayrı gönder (Apple: assetler sürümden bağımsız incelenebilir, onaydan sonra Browse Assets > Publish). İncelemeyi geri çekme. Header iPhone'da sadece ortası görünecek şekilde tasarlandı (içerik x 560..3280, üst köşelerde geri/paylaş butonları için boşluk). Yükledikten sonra Preview aracında iPhone görünümünü kontrol et.

* 2026-10-07 (gece): DÜZELTME (bulut Claude, kurucu sordu). App Store Connect > App Information: Secondary category "Games" yanlış, README'deki eski talimat benim hatamdı. "Social Networking" yap. Content Rights: "Yes, contains third-party content" + "I have the necessary rights" seç (UGC platformu, yaş derecesinde de kullanıcı içeriği var dedik, tutarlı olmalı). Alanlar inceleme sırasında kilitliyse incelemeyi geri çekme, status.md'ye yaz ve kurucuya sor.

* 2026-10-07: iOS build 12 TestFlight'a yüklendi ve Apple işlemesi bitti (VALID). Giriş yapmış kullanıcılarda Bugünün seçkisi yükleme simgesinde takılma hatası düzeltildi (build 10 ve 11'de vardı). Build 11 yüklenmedi. Apple incelemesine bu build gönderilmeli.

* 2026-10-07 (gece): MAĞAZA GÖRSELLERİ HAZIR (bulut Claude). Kurucu onayladı: iOS ve Android'e gönderilebilir.
  * App Store ekran görüntüleri (6.9", 1320x2868, 5 adet, sıra 1'den 5'e): store/assets/screens/ios/en/, es/ (İspanyolca), tr/ (Türkçe). App Store Connect'te iPhone 6.9" Display alanına yükle; 6.5" ve küçük boyutları Apple bundan otomatik üretir.
  * Google Play telefon ekran görüntüleri (1080x1920, 5 adet): store/assets/screens/play/en/, es/, tr/. Play Console > Store listing > Phone screenshots. Diller: en-US ana; es-419/es-ES ve tr-TR listing'i varsa onlara.
  * Apple ürün sayfası header: store/assets/header/header-3840x1646.png (21:9). Arama sonucu görseli: store/assets/header/search-3840x2560.png (3:2). Kaynak: master-5244x2950.png (iki kırpım da bundan, metin ve telefonlar ortadaki güvenli alanda).
  * Görselleri yeniden üretmek için: store/tools/compose-store-art.py (ham ekranlar repoda değil, bulut Claude üretir).
  * Hangi build: iOS build 12 ve Android build 9 (spinner ve feed düzeltmeleri bunlarda). Build 11'i incelemeye gönderme.
  * Not: Expo EAS ücretsiz build limiti bu ay doldu. Build 12 ve 9 limitten önce kuyruğa girdi. Yeni build gerekirse: ay yenilenmesini bekle, Android için kurucunun bilgisayarında yerel build, ya da EAS Starter planı.

* 2026-10-07: iOS build 10 TestFlight'a yüklendi ve Apple işlemesi bitti (VALID). Build 9 içeriği (adım adım profil kurulumu, ilgi alanları, adil sıralamada atlama) artı açık ve koyu tema. R2 açıldıktan sonra kurucu onayıyla gönderildi. İncelemeye bu build gönderilmeli.

* 2026-10-07: iOS build 8 TestFlight'a yüklendi (3. tur düzeltmeleri: giriş yarış hatası, dürüst sonuç metinleri, bilet şeklinde sonuç, sola kaydırınca creator promoları, bildir butonu, Nicheable hediyesi, marka fontu, seri). İncelemeye bu build gönderilmeli. Build 5 ve 7 hiç yüklenmedi.

* 2026-10-07: iOS build 6 TestFlight'a yüklendi (build 5 içeriği artı güvenli menüler, hediyeler ve promosyon kodları, tahmin sonuçları, günlük hatırlatma, creator oynatıcı, sekmeler arası kaydırma). İncelemeye bu build gönderilmeli. Kurucu "Team (Expo)" iç test grubunda (INSTALLED).

* 2026-10-07: iOS build 4 TestFlight'a yüklendi (ana sayfa sekmeleri ve inceleme hesabı girişi). İncelemeye bu build gönderilmeli.

* 2026-10-07: Cevaplar:
  * IARC kategori: "Diğer Tüm Uygulama Türleri" DEĞİL. "Sosyal Ağ, Forum, Blog ve Kullanıcı İçeriği Paylaşımı" (Social Networking, Forums, Blogs and UGC Sharing) seç. Sebep: kullanıcılar video yükleyip oy veriyor, takip ediyor. Yanlış kategori sonradan derecelendirmenin iptaline yol açabilir. Sorularda: kullanıcılar içerik paylaşabilir EVET, kullanıcılar birbiriyle etkileşebilir EVET (takip, oy; mesajlaşma YOK), konum paylaşımı HAYIR, dijital ürün satın alma şimdilik HAYIR (2. sürümde gelecek, o zaman güncellenir), kumar HAYIR, şiddet: fragmanlarda ara sıra hafif (Infrequent/Mild).
  * IARC şartları: kabul et (derecelendirme için zorunlu, kurucu onayladı).
  * Hesap silme sayfası HAZIR ve canlı: https://promovote.com/delete-account (uygulama içi adımlar, email ile silme, silinen ve tutulan veriler, 30 gün). Veri güvenliği formunda "Delete account URL" alanına bunu yaz. Hesap silme uygulama içinde de var (Profil > sağ üstteki ... düğmesi > Hesabı sil).
  * Store listing ikon ve feature graphic: Play Console'a elle yükle. Dosyalar repoda: store/assets/play-icon-512.png ve store/assets/feature-graphic-1024x500.png. Bulut Claude'un Play API key'i (Bölüm E) henüz ortamda yok, o yüzden bulut Claude yükleyemiyor.
  * Bölüm E: README'deki değişkenleri bulut ortamına eklemek masaüstü Claude veya kurucunun işi (claude.ai/code ortam ayarları). Bulut Claude ortam ayarlarını değiştiremiyor. Öncelik: GOOGLE_PLAY_SA_JSON_B64, APPLE_IAP_KEY_ID, APPLE_IAP_KEY_P8, ASC_APP_ID. Google OAuth client id'leri gizli değil, status.md'de zaten var, onları bulut Claude buradan alır.

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
