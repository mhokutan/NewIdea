# Mağaza kurulumu durumu

Bu dosya masaüstü Claude ile bulut Claude arasında haberleşme için. Talimatlar: `store/README.md`.
Asla key, şifre, token veya Shared Secret yazılmaz.

DURUM: DEVAM EDİYOR

## Bölümler

| Bölüm | Durum | Not |
|---|---|---|
| A. iOS sertifikası (EAS) | bitti | Kurucu çalıştırdı: 'All credentials are ready to build @mhokutan/promovote (com.miapera.promovote)'. Mevcut dağıtım sertifikası yeniden kullanıldı, yeni provisioning profile. Capability: Sign in with Apple, Associated Domains, IAP. Team ID 6WRT42YG28 (Individual). |
| B. App Store Connect | yarım | B1 bitti (Apple ID 6819894584, SKU promovote-ios). B2 bitti: IAP key 'PromoVote API', Key ID 36Q8797745, .p8 SecretKeys klasöründe. B3 bitti: Production ve Sandbox https://api.promovote.com/v1/webhooks/apple, V2. B4.1 bitti: Entertainment + Games. B4.2 bitti: 18+ (UGC ve reklam var, şiddet Cartoon/Realistic Infrequent/Mild, kumar ve sohbet yok); yeni 'Social Media' soruları boş, kurucuya soruldu. B4.4 bitti: Free, 175 ülke + yeni ülkeler otomatik. B4.5: Paid Apps sözleşmesi aktif görünüyor (Hazim Okutan, ABD, 175 ülke). Kalan: B4.3 App Privacy, B4.6 Small Business Program. Not: Mustafa Peker sadece Pondra'ya erişiyor, PromoVote'a erişimi yok. |
| C. Google Cloud | yarım | C1, C3, C4 bitti (topic play-rtdn, Publisher yetkisi kurucu tarafından verildi, push subscription play-rtdn-push, never expire). C2: branding ve 3 client bitti; Audience Production'a alındı (kurucu); Play App Signing SHA-1 ile ikinci Android client Bölüm D sonrası. Destek emaili Google kuralı gereği hazimokutan@gmail.com. |
| D. Google Play Console | beklemede | |
| E. Bulut ortamına key'ler | beklemede | |

## Gizli olmayan değerler

* App Store Apple ID: 6819894584
* Google Cloud project id: promovote
* Play service account email: play-api@promovote.iam.gserviceaccount.com
* OAuth web client id: 506724718671-t1g7ehas8tssjdjs3vhsvdgo60g4pini.apps.googleusercontent.com
* OAuth iOS client id: 506724718671-onetdf2qhmf8pgg1lrlij9gi7luqt1c3.apps.googleusercontent.com
* OAuth Android client id'leri: 506724718671-532i7nc7cvuoeod7qj0o20s5o5av717i.apps.googleusercontent.com (EAS upload key SHA-1 AD:B8:...:09:F8), Play App Signing client'ı bekliyor
* Google hesabı: hazimokutan@gmail.com (Cloud ve Play Console sadece bu hesapla)
* Google Play hesap türü (Organization / Personal):

## Kurucunun yapması gerekenler

*

## Bulut Claude notları

* 2026-10-07: Yaş derecesi, şiddet (Apple ve Google): "Infrequent/Mild" seç, "None" değil. Cartoon/Fantasy Violence ve Realistic Violence ikisi de Infrequent/Mild. Sebep: kullanıcıların yükleyeceği oyun fragmanlarında şiddet olacak. Az beyan reddedilme sebebi, fazla beyanın bir zararı yok (sonuç zaten 18+). Google IARC anketinde de aynı mantık: oyun fragmanlarında şiddet olabilir de.

* 2026-10-06: Kurucu banka ve vergi işlerini zaten tamamladığını söyledi (Apple Paid Apps Agreement, banka, W-9; Google Payments profile). Bu adımlarda durma, sadece durumu kontrol et ve buraya yaz. Bir şey eksik görünürse o zaman sor.

* 2026-10-06: Kurucu kararı: Apple ve Google hesapları Individual kalacak. Şirket hesabına çevirme. Banka ve vergi (bireysel W-9) bilgisini kurucu girer.

* 2026-10-06: Android production build başlatıldı (Bölüm D2 linki). iOS build için önce Bölüm A gerekli.
