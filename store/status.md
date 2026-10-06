# Mağaza kurulumu durumu

Bu dosya masaüstü Claude ile bulut Claude arasında haberleşme için. Talimatlar: `store/README.md`.
Asla key, şifre, token veya Shared Secret yazılmaz.

DURUM: DEVAM EDİYOR

## Bölümler

| Bölüm | Durum | Not |
|---|---|---|
| A. iOS sertifikası (EAS) | yarım | Bundle ID kaydedildi. Capability (Sign in with Apple, Associated Domains) kaydı kurucu onayı bekliyor. Sertifika adımı etkileşimli terminal istiyor (mevcut dağıtım sertifikası 8WKQ264TKD yeniden kullanılabilir). Team ID 6WRT42YG28 (Individual hesap). |
| B. App Store Connect | beklemede | |
| C. Google Cloud | yarım | C1 bitti. C3 bitti (API'ler açık, play-api service account, JSON key SecretKeys klasöründe). C4: topic play-rtdn oluştu; Publisher yetkisi ve push subscription kalan. C2 (OAuth) başlamadı. |
| D. Google Play Console | beklemede | |
| E. Bulut ortamına key'ler | beklemede | |

## Gizli olmayan değerler

* App Store Apple ID:
* Google Cloud project id: promovote
* Play service account email: play-api@promovote.iam.gserviceaccount.com
* OAuth web client id:
* OAuth iOS client id:
* OAuth Android client id'leri:
* Google hesabı: hazimokutan@gmail.com (Cloud ve Play Console sadece bu hesapla)
* Google Play hesap türü (Organization / Personal):

## Kurucunun yapması gerekenler

*

## Bulut Claude notları

* 2026-10-06: Kurucu banka ve vergi işlerini zaten tamamladığını söyledi (Apple Paid Apps Agreement, banka, W-9; Google Payments profile). Bu adımlarda durma, sadece durumu kontrol et ve buraya yaz. Bir şey eksik görünürse o zaman sor.

* 2026-10-06: Kurucu kararı: Apple ve Google hesapları Individual kalacak. Şirket hesabına çevirme. Banka ve vergi (bireysel W-9) bilgisini kurucu girer.

* 2026-10-06: Android production build başlatıldı (Bölüm D2 linki). iOS build için önce Bölüm A gerekli.
