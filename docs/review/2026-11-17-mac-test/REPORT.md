# Mac testi, sonraki build öncesi (2026-11-16 akşamı, New York)

Masaüstü Claude, Mac mini üzerinde SSH ile yaptı. Dal: claude/gracious-pasteur-nu8ssc, commit a23a3f1.
Mac'te kimse oturum açmadığı için simülatöre dokunma aracı yoktu; sadece ekran görüntüsü ve adb ile Android dokunuşu yapılabildi.

## SONUÇ: GEÇMEDİ (1 engel var)

**En kritik sorun: iOS uygulaması Xcode 27 ile derlenince hiç açılmıyor.**
Hata: "Application failed to launch: UIScene life cycle is required for apps built with this SDK."
Çözüm (denendi, çalışıyor): `apps/mobile/app.json` içinde `expo-build-properties` eklentisine şunu eklemek:
```json
"ios": { "enableSceneSupport": true }
```
(Expo SDK 57.0.23 ve sonrası destekliyor, bizde 57.0.27.) Bu ayarla prebuild yapılınca uygulama iOS 27 simülatöründe açıldı.
`eas.json` içinde Xcode imajı sabit değil; EAS varsayılan imajı Xcode 27'ye geçerse sonraki iOS build'i mağazada açılmaz.
Bu ayarı commit etmedim (talimat: sadece rapor). Build'den önce eklenmeli ve Apple ile giriş, Google ile giriş, deep link ve bildirimler yeniden denenmeli.

## 0. Kurulum
* `npm ci`: tamam.
* `npx tsc --noEmit`: tamam (hata yok).
* `npx expo lint`: tamam (hata yok).
* `npx expo run:ios`: Expo simülatörü fiziksel cihaz sandı ve imza sertifikası istedi ("No code signing certificates are available"). SSH oturumunda cihaz listesi okunamadığı için. Yerine `xcodebuild -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO` ile Release derlendi: BUILD SUCCEEDED. Sonra yukarıdaki UIScene hatası.
* `npx expo run:android`: Android Studio yok ama SDK ve JDK var; `gradlew assembleRelease` ile derlendi, Pixel 7 (Android 15) emülatörüne kuruldu: tamam.
* Simülatörler: iPhone SE (3. nesil) ve iPhone 18 Pro Max, iOS 27.0.

## 1. Yeni diller
Çeviri dosyası: 6 dilde (en, es, tr, pt, de, fr) 375 anahtarın hepsi var, eksik yok.
Ekranda sadece ana ekran (Bugünün Drop'u, tahmin çubuğu ile) kontrol edilebildi; diğer ekranlara deep link ile gidince iOS "Open in PromoVote?" penceresi çıktı ve dokunma aracı olmadığı için geçilemedi. Duel, Explore, Me, giriş, onboarding, yükleme ve sayfalar KONTROL EDİLMEDİ.

Ana ekranda bulunan sorunlar:

| Dil | Cihaz | Ekran / anahtar | Sorun | Kısa öneri |
|---|---|---|---|---|
| de | SE | `strip_guest` | "Gib deinen Tipp ab. Ergebnisse in 7…" kesiliyor | "Tipp abgeben. Ergebnis in 7 Tagen." |
| es | SE | `strip_guest` | "Haz tu predicción. Resultados en 7…" kesiliyor | "Predice. Resultado en 7 días." |
| fr | SE | `strip_guest` | "Fais ta prédiction. Résultats dans 7…" kesiliyor | "Prédis. Résultat dans 7 jours." |
| de | SE | `save` (reel yan düğme) | "Speich…" | "Merken" |
| fr | SE ve Pro Max | `save` | "Enregis…" | "Garder" |
| es | SE | `save` | "Guar…" kesiliyor | yan etiket alanını genişlet ya da "Guardar" sığacak şekilde yazı boyutu küçült |
| es | SE ve Pro Max | `share` | "Compa…" (Compartir) | "Enviar" |
| pt | Pro Max | `share` | "Compa…" (Compartilhar) | "Enviar" |

Daha iyi kalıcı çözüm: reel yan düğme etiketlerine `numberOfLines={1}` ve `adjustsFontSizeToFit` ya da biraz daha geniş kutu; uzun dillerde her seferinde kısaltma gerekmez.

İyi görünenler: tr (SE) tamam, hiçbir şey kesik değil. pt (Pro Max) üst şerit tamam. Alt sekmeler (Feed, Duell, Entdecken, Profil vb.) her dilde sığıyor. Üst sekmeler küçük ekranda yana kayıyor (fr "Choix de l'équipe" kesik başlıyor), bu kaydırılabilir olduğu için kabul edilebilir.
Not: "Feed" sekmesi de, es, fr, pt'de İngilizce kalıyor (tr'de "Akış"). Marka değilse çevrilebilir: de "Feed" kalabilir, es "Inicio", fr "Fil", pt "Feed".
Not: promo başlık ve açıklamaları (ör. "Run a trucking business…") içerikten geliyor, dil çevirisi yoksa İngilizce kalıyor. Hata değil, içerik konusu.

Ekran görüntüleri: `ios-se-de-ana.png`, `ios-se-es-ana.png`, `ios-promax-es-ana.png`, `ios-se-fr-ana.png`, `ios-promax-pt-ana.png`, `ios-se-tr-ana.png`.

## 2. Giriş yapmadan tahmin (Android, Türkçe)
1. 1. tahmin: TAMAM. "Patlayacak"a basınca kart "Tahmin edildi: Patlayacak, Sonuç 23 Kas" fişine döndü, giriş istenmedi (`android-tr-tahmin-fisi.png`). Yaratıcı sayfası sonradan "2 Tahmin" gösterdi, yani en az 2 tahmin kaydedildi.
2. "Keep your calls" penceresi, 4. tahmin, yeniden açınca tahminlerin durması, giriş sonrası hesaba geçmesi: TEST EDİLEMEDİ. Mac aşırı yüklüydü (yük ortalaması 200 ile 500 arası; aynı Mac'te başka bir işin iki Android emülatörü açıktı), emülatör yukarı kaydırmayı algılamadı ve Sistem Arayüzü "yanıt vermiyor" verdi. Paperclip'i korumak için kendi emülatörümü kapattım.
3. Apple / Google ile giriş: ekransız Mac'te Hazım şifre yazamaz. Gerçek telefonda yapılmalı.

## 3. Kısa regresyon
* iPhone'da reel'de mağaza düğmesi YOK, Android'de "Google Play'den indir" VAR: TAMAM.
* Yaratıcı sayfası Android'de açıldı (App Store ve Google Play düğmeleri, videolar): TAMAM.
* Video oynatma, ses aç kapa, Duel seçimi, sona kadar izlenen promo: TEST EDİLEMEDİ (dokunma aracı yok, emülatör yavaş).
* Android'de alt sekme çubuğu beyaz zemin üzerinde, iOS'ta koyu yarı saydam. Uygulamanın geri kalanı koyu; tasarım kararı değilse düzeltilmeli (`android-tr-ana.png`).

## Hazım'ın gerçek telefonda yapması gerekenler
* Bölüm 2'nin 2. ile 5. adımları (3 tahmin, "Keep your calls", "Not now", 4. tahminde giriş, uygulamayı kapatıp açma, Apple veya Google ile giriş ve tahminlerin hesaba geçmesi).
* Bölüm 1'de ana ekran dışındaki ekranlar (Duel, Explore, Me, giriş, onboarding, yükleme, sayfalar) de, fr, pt dillerinde.
* Bölüm 3'te video, ses, Duel ve izleme sonu.

## Sonraki Mac testi için öneri
Mac'e Maestro (mobile.dev) kurulursa simülatörde dokunma testleri ekransız yapılabilir. Kurmadım, yeni yazılım indirmek kurucu onayı ister.
