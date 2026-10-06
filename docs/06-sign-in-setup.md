# 06. Giriş: Apple ve Google ile (ücretsiz)

Tarih: 2026-10-06. Kurucu kararı: email ile giriş için ayda 5 dolarlık Workers Paid planı şimdilik alınmıyor. Uygulamada giriş:

* **iPhone:** Apple ile giriş + Google ile giriş
* **Android:** Google ile giriş
* **Email kodu:** Kodda hazır ama kapalı. Email Sending açılınca `EXPO_PUBLIC_EMAIL_LOGIN=1` ile açılır.

Apple kuralı 4.8: uygulamada Google ile giriş varsa Apple ile giriş de olmalı. Bu sağlandı.

## Nasıl çalışıyor

Uygulama Apple'ın veya Google'ın kendi giriş penceresini açar. Oradan bir "kimlik kartı" (ID token) alır ve sunucuya gönderir. Sunucu (`services/api/src/auth.js`) bu kartın gerçekten Apple'dan veya Google'dan geldiğini ve bizim uygulamamız için verildiğini kontrol eder.

* Şifre yok.
* Gizli anahtar saklanmıyor.
* Aynı email ile hem Apple hem Google kullanılırsa hesaplar birleşir.

## Kurucunun yapacakları

### Apple (neredeyse hiçbir şey)

* Uygulama kimliği: `com.miapera.promovote`.
* İlk iOS build'inde EAS, App Store Connect'te bu kimliği oluşturur ve "Sign in with Apple" iznini otomatik açar. Bunun için EAS build sırasında Apple hesabınla bir kez giriş yapman yeterli.
* App Store Connect'te uygulama kaydı da ilk gönderimde oluşturulur.

### Google (yaklaşık 15 dakika, ücretsiz)

1. https://console.cloud.google.com adresinde yeni proje aç: `PromoVote`.
2. **OAuth consent screen** (Google Auth Platform > Branding) bölümünü doldur:
   * Uygulama adı: PromoVote
   * Destek emaili: support@promovote.com
   * Uygulama sayfası: https://promovote.com
   * Gizlilik: https://promovote.com/privacy
   * Şartlar: https://promovote.com/terms
   * Kitle: External
3. **Clients** bölümünde 3 tane OAuth client oluştur:
   * **Web application:** Adı "PromoVote server". Ayar gerekmez.
   * **iOS:** Bundle ID `com.miapera.promovote`.
   * **Android:** Package `com.miapera.promovote` ve SHA-1 parmak izi. SHA-1'i ilk Android build'inden sonra ben `eas credentials` ile alıp sana veririm.
4. Oluşan 3 **Client ID**'yi bana gönder. Örnek görünüm: `1234-abcd.apps.googleusercontent.com`.
   * Client ID gizli değil, sohbete yazabilirsin.
   * **Client secret'ı gönderme**, ona ihtiyacımız yok.

Client ID'ler gelince yapacaklarım:

* API: `GOOGLE_CLIENT_IDS` değişkenine 3 ID'yi yazıp deploy ederim.
* Uygulama (EAS ortam değişkenleri):
  * `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  * `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  * `GOOGLE_IOS_URL_SCHEME`: iOS client ID'nin ters hali, örnek `com.googleusercontent.apps.1234-abcd`

O zamana kadar Google butonu uygulamada görünmez. iPhone'da Apple ile giriş çalışır.

## Build için

`EXPO_TOKEN` ortam değişkeni gerekli. Kurucu expo.dev > Account settings > Access tokens bölümünden token oluşturur ve bunu Claude oturumunun ortam ayarlarına ekler. Token sohbete yazılmaz.
