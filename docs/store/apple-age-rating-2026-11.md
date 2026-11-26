Hukuki not: bu dosya hukuki tavsiye değildir.

# PromoVote: Apple yaş derecesi, Terms yaş bölümü ve Google Play içerik derecesi (2026-11)

Hazırlayan: Trust & Safety ve Hukuk/Uyum. Tarih: 2026-11-26. Bu dosya bir öneridir. App Store Connect, Google Play Console ve promovote.com/terms üzerinde hiçbir şey değiştirilmedi. Göndermeden önce bir avukat baksın.

## 0. Neden şimdi

* Apple 16 Kasım 2026 itibarıyla ankete iki yeni madde ekledi: **Shared Location** ve **Dating and Relationships**. Bir sonraki güncellemede bu iki madde cevaplanmadan gönderim yapılamaz; 12 Ocak 2027'den sonra tüm uygulamalar için zorunlu.
* Sosyal medya soruları (Social Media, "Social Media Disabled for Users Under 13") Eylül 2026'dan beri her gönderimde zorunlu.
* Apple kuralı: Uygulamanın şartlarında (EULA / Terms) hesaplanan derecenin üstünde bir yaş sınırı varsa **"Override to Higher Age Rating" ile o yaşa çıkmak zorunlu**. Bizim Terms 18+ diyor, yani override zorunlu.
* Daha önceki kararlar (`store/status.md` 2026-10-07): şiddet için "None" değil "Infrequent/Mild"; az beyan red sebebi, fazla beyanın zararı yok çünkü sonuç zaten 18+. Bu dosya aynı mantığı sürdürüyor.

## 1. Kodda doğrulanan gerçekler

| Konu | Durum | Nerede |
|---|---|---|
| 18 yaş kontrolü | Doğum tarihi tam istenir, 18 altıysa API 403 `under_18` döner ve `user` satırını siler | `services/api/src/index.js` 473 ile 491 arası |
| Uygulamadaki tarih seçici | En geç tarih bugünden 18 yıl öncesi | `apps/mobile/src/ui/Onboarding.tsx` 136 |
| Misafir izleme | Hesapsız izleme var; sonraki build ile 3 call telefonda tutulur | `apps/mobile/src/lib/guest-calls.ts` |
| Kullanıcı içeriği | Profil, isim, bio, logo, banner, link, yüklenen videolar; her yükleme elle onaylanır | `apps/mobile/src/app/upload.tsx`, `/admin/onay` |
| Rapor ve engelleme | Her promo ve creator sayfasında | `apps/mobile/src/ui/ReportMenu.tsx` |
| Dış linkler | Sadece https, sistem tarayıcısında açılır (uygulama içi tarayıcı yok) | `apps/mobile/src/lib/links.ts` (`Linking.openURL`) |
| Mesajlaşma, yorum, konum | Yok. Ülke kodu sadece istek ülkesinden gelir, kimseyle paylaşılmaz | `services/api/src/index.js` 498 |
| Uygulama içi satın alma, reklam ağı | Yok (v2'de satın alma) | Terms bölüm 9 |
| Puan | Kaşif Puanı itibar içindir, nakit değeri yok, ödül yok | Terms bölüm 7 |
| Age Range API | Apple Declared Age Range API kodda yok | `apps/mobile` içinde arama sonucu boş |

## 2. Apple yaş derecesi anketi: önerilen cevaplar

Not: Adlar Apple'ın "Age ratings values and definitions" sayfasındaki adlardır. Parantez içindeki adlar App Store Connect API (`ageRatingDeclaration`) alan adlarıdır; bunlar tahminidir ve ASC ekranındaki Türkçe veya İngilizce etiketlerden farklı görünebilir. Özellikle `socialMediaAgeRestricted`, `datingAndRelationships`, `sharedLocation` ve `ageSuitabilityUri` yeni alanlardır; ekranda "Social Media", "Social Media Disabled for Users Under 13", "Dating and Relationships", "Shared Location", "Age Suitability URL (Optional)" gibi görünür. Bazı maddeler ekranda Evet/Hayır, bazıları None / Infrequent / Frequent olarak gelir. İçerik maddelerinde "Infrequent" bazen "Infrequent/Mild" diye yazılır.

### 2.1 Uygulama içi kontroller ve yetenekler (In-App Controls and Capabilities)

| Madde | Öneri | Tek satır gerekçe |
|---|---|---|
| Parental Controls (`parentalControls`) | Hayır | Ebeveyn aracı yok; uygulama çocuklar için değil (18+). |
| Age Assurance (`ageAssurance`) | Evet | Kayıtta doğum tarihi sorulur, API 18 altını reddeder (`index.js` 487). App Review notuna "self declared date of birth, server side 18+ gate" yaz. Avukat bu maddeyi daha sıkı yorumlarsa "Hayır" de; derece değişmez. |
| Unrestricted Web Access (`unrestrictedWebAccess`) | Hayır | Uygulama içi tarayıcı yok; linkler sadece https ve sistem tarayıcısında açılır (`links.ts`). Evet demek tek başına 16+ yapar, gereksiz. |
| User-Generated Content (`userGeneratedContent`) | Evet | Profiller ve creator videoları geniş kitleye yayılır (`upload.tsx`). |
| Messaging and Chat (`messagingAndChat`) | Hayır | DM yok, yorum yok, kullanıcılar arası doğrudan iletişim yok. |
| Advertising (`advertising`) | Hayır (şimdilik) | Apple tanımı "paid promotion". Şu an hiçbir yerleşim parayla satılmıyor, reklam SDK'sı yok. Boost / "Sponsored" yayına girdiği gün "Evet" yap. Bkz. 2.5. |
| Social Media (`socialMedia` gibi, ad farklı olabilir) | Evet | Takip, kaydet, paylaş ve akış üzerinden kullanıcı içeriği dağıtılıyor; tanımın tam karşılığı. En az 13+ ve "Social Media" zaman kategorisine girer. |
| Social Media Disabled for Users Under 13 (`socialMediaAgeRestricted`) | Hayır | Bu madde Declared Age Range API çağrısı ister; kodda yok. Misafir akışı hesapsız açık. Evet demek yanlış beyan olur. |
| Shared Location (`sharedLocation`) | Hayır | Gerçek dünya konumu kimseyle paylaşılmıyor; sadece ülke kodu tutuluyor. |

### 2.2 İçerik maddeleri (Content Descriptors)

Mantık: İçerik kullanıcı (creator) videolarıdır, çoğu oyun fragmanı. Fragmanlarda olabilecek şeyi "Infrequent" beyan et, Rehber ve elle onayın kapattığı şeyi "None" bırak.

| Madde | Öneri | Tek satır gerekçe |
|---|---|---|
| Profanity or Crude Humor (`profanityOrCrudeHumor`) | Infrequent | Fragman ve kanal promolarında ara sıra argo olabilir. |
| Horror/Fear Themes (`horrorOrFearThemes`) | Infrequent | Korku oyunu fragmanları kabul ediliyor. |
| Alcohol, Tobacco, or Drug Use or References (`alcoholTobaccoOrDrugUseOrReferences`) | None | Kısıtlı kategoriler (alkol dahil) kapalı; her yükleme elle onaylanıyor. Fragmanlarda görünürse "Infrequent" yap. |
| Dating and Relationships (`datingAndRelationships`) | Hayır / None | Tanışma veya romantik sanal arkadaş özelliği yok; dating kategorisi kapalı. Evet demek otomatik 18+ yapar ama yanlış beyan olur, override zaten 18+ veriyor. |
| Medical or Treatment Information (`medicalOrTreatmentInformation`) | None | Tıbbi bilgi veya rehberlik yok; sağlık kategorisi kısıtlı. |
| Health or Wellness Topics (`healthOrWellnessTopics`) | Hayır | Uygulama sağlıklı yaşam tavsiyesi vermiyor; bir fitness uygulamasının promosu bu tanıma girmez. |
| Mature or Suggestive Themes (`matureOrSuggestiveThemes`) | Infrequent | Oyun fragmanlarında dolaylı yetişkin temalar olabilir. |
| Sexual Content or Nudity (`sexualContentOrNudity`) | None | Terms bölüm 4 cinsel içeriği yasaklıyor, elle onay var. |
| Graphic Sexual Content and Nudity (`sexualContentGraphicAndNudity`) | None | Zorunlu. Başka bir cevap uygulamayı "Unrated" yapar, App Store'da yayınlanamaz. |
| Cartoon or Fantasy Violence (`violenceCartoonOrFantasy`) | Infrequent | `store/status.md` 2026-10-07 kararı. |
| Realistic Violence (`violenceRealistic`) | Infrequent | Aynı karar; gerçekçi oyun fragmanları. |
| Prolonged Graphic or Sadistic Realistic Violence (`violenceRealisticProlongedGraphicOrSadistic`) | None | Zorunlu. Başka cevap "Unrated" yapar. Bu tür videolar onayda reddedilir. |
| Guns or Other Weapons (`gunsOrOtherWeapons`) | Infrequent | Nişancı oyunu fragmanları. Silah satışı promoları Rehberde yasak. |

### 2.3 Şansa dayalı etkinlikler (Chance-Based Activities)

| Madde | Öneri | Tek satır gerekçe |
|---|---|---|
| Gambling (`gambling`) | Hayır | Para veya paraya çevrilebilen hiçbir şey yatırılmıyor (Terms bölüm 7). |
| Simulated Gambling (`gamblingSimulated`) | None | Call bir tahmin/görüş, bahis değil: hiçbir şey ortaya konmuyor, yanlış call puan kaybettirmez (Terms bölüm 7). |
| Contests (`contests`) | Frequent | Günlük call oyunu, Kaşif Puanı, seri ve sıralamalar kişisel hedef ve sıralama yarışı sayılabilir. Ödül yok. Frequent 13+ verir, override zaten 18+, fazla beyan risksiz. |
| Loot Boxes (`lootBox`) | Hayır | Satın alma yok, rastgele ödül kutusu yok. Hediyeler (perks) şansa bağlı değil, satın alma yok. |

### 2.4 Yaş kategorileri, override ve URL

| Madde | Öneri | Tek satır gerekçe |
|---|---|---|
| Made for Kids (`kidsAgeBand`) | Seçme (Not Applicable değil, Override seçilecek) | Uygulama çocuklar için değil. |
| Override to Higher Age Rating (`ageRatingOverrideV2` gibi) | **18+** | Terms 18+ diyor; Apple kuralına göre şartlardaki yaş hesaplanan derecenin üstündeyse override zorunlu. |
| Age Suitability URL (Optional) (`ageSuitabilityUri`) | `https://promovote.com/terms#age` | Bölüm 4'teki metin yayına girdikten sonra doldur. O zamana kadar `https://promovote.com/terms#eligibility`. |
| Korea RCN | Boş bırak | Oyun değiliz, GRAC derecesi yok. |

### 2.5 İki store arasındaki tek fark: reklam

* Apple "Advertising" sorusu "paid promotion" diye tanımlanıyor. Şu an para alan yerleşim yok, bu yüzden "Hayır". Bunu route A (3.2.2) savunmasıyla da tutarlı tutar: içerik creator videolarıdır, satılan reklam yeri değildir.
* Google Play'de "Contains ads" daha önce "Evet" beyan edildi (`store/README.md` 177). Değiştirmeye gerek yok; Google kendi uygulamalarını tanıtma (house ads) durumunu da reklam sayabiliyor ve akışta kurucunun kendi uygulama promoları var.
* Boost veya herhangi bir ücretli yerleşim çıktığı gün: Apple "Advertising" = Evet, App Privacy ve Google Veri güvenliği formları birlikte güncellenir.

## 3. Beklenen sonuç: 18+

* Override olmadan Apple'ın hesaplayacağı derece büyük ihtimalle **13+** olur: Social Media 13+, Realistic Violence Infrequent 13+, Contests Frequent 13+, Guns Infrequent 9+, diğerleri daha düşük. 16+ veya 18+ yapan bir cevap yok (Unrestricted Web Access ve Dating "Hayır").
* Terms 18+ dediği için **Override to Higher Age Rating = 18+** seçilir. Mağazada **18+** görünür. İçerik açıklamaları yine anket cevaplarını yansıtır (ör. "Infrequent Realistic Violence", "User-Generated Content", "Social Media").
* Bölgesel değerler (Avustralya, Brezilya, Kore) override'dan otomatik türetilir; Brezilya'da A18 bekleniyor. Portekizce (Brezilya) dil desteği bir sonraki build ile geldiği için Brezilya'daki görünümü ASC'de kaydettikten sonra kontrol et.
* Neden 18+ doğru: Kayıt 18+ (kod ve Terms), çocuklara yönelik veri işlemiyoruz (COPPA riski yok), açık kullanıcı içeriği ve fragmanlardaki şiddet var. Mağaza derecesi şartlardan düşük olsaydı Apple bunu tutarsızlık sayabilirdi.
* Uyarı: 18+ mağaza derecesi tek başına bir yaş doğrulaması değildir. Bazı ABD eyaletlerinin mağaza yaş yasaları ve Apple Declared Age Range / Google Play Age Signals API'leri için ayrı bir karar gerekiyor. Bu, şu anki gönderimi engellemiyor ama avukatla takvime alınmalı.

## 4. promovote.com/terms için "Age requirement" metni (İngilizce, yapıştırmaya hazır)

### Nereye

`web/landing/public/terms.html` elle yazılmış bir sayfa (build.py üretmiyor). Metni bölüm 1'in listesinin hemen sonuna, şu başlığın altına koy:

> `<h2 id="eligibility">1. Eligibility and accounts</h2>`

Yani bu bölümün `</ul>` kapanışından sonra ve `<h2 id="service">2. The Service</h2>` satırından önce. Numaralandırma bozulmasın diye yeni bir `h2` değil, `h3` kullan. Bölüm 1'in ilk maddesi ("You must be at least 18 years old...") kalabilir; yeni bölümle çelişmiyor.

Sonra iki şey kontrol edilmeli (bu dosyada değiştirilmedi):
* `services/api/src/index.js` içindeki `TERMS_VERSION` (şu an 2026-10-07): avukat bu ekleme "esaslı değişiklik" derse tarih güncellenir ve kullanıcılardan yeniden onay istenir.
* `web/landing/public/privacy.html` bölüm 11 "Children" ile aynı şeyi söylediğinden emin ol (silme süresi, iletişim adresi).

### Metin

```html
<h3 id="age">Age requirement</h3>
<ul>
<li>PromoVote is for adults. You must be 18 or older to create an account, make calls, save, follow, upload promos, claim gifts or join the waitlist.</li>
<li>When you sign up, we ask for your date of birth. If it shows that you are under 18, we do not create your account and we delete the sign in details we received.</li>
<li>Guests can watch promos without an account, and the app may keep a few calls on your device before you sign in. Even so, the Service is meant only for adults. If you are under 18, please do not use PromoVote.</li>
<li>Giving a false date of birth breaks these Terms. If we learn, or have good reason to believe, that an account belongs to someone under 18, we will close it and delete its data as described in our <a href="/privacy">Privacy Policy</a>.</li>
<li>If you think someone under 18 is using PromoVote, email <a href="mailto:support@promovote.com">support@promovote.com</a> with the subject "Underage user" and the handle or a link to the profile. You do not need an account to send this report. We treat these reports as a priority.</li>
<li>Parents and guardians: PromoVote has no parental controls because it is not made for children. You can block the app with the controls on your child's device, such as Screen Time on iPhone or Family Link on Android.</li>
</ul>
```

### Operasyon notu (metin söz veriyor, ekip yerine getirmeli)

* "Underage user" konulu mailler support@ üzerinden kurucunun Gmail'ine düşüyor. 24 saat içinde bak; hesap 18 altıysa kapat ve sil (mevcut silme akışı 30 günlük bekleme içeriyor; 18 altı için avukatla "beklemeden sil" kararı al).
* Uygulama içi Rapor menüsüne ileride "Under 18" sebebi eklemek iyi olur (bu dosyanın kapsamı dışında, ayrı iş).

## 5. Google Play: içerik derecesi (IARC) ve hedef kitle

Önceki cevaplar `store/status.md` 145 ile 147 arasında. Aynı kalsın, sadece aşağıdakileri kontrol et.

### 5.1 IARC anketi (kısa)

| Soru | Cevap | Gerekçe |
|---|---|---|
| Kategori | Social Networking, Forums, Blogs and UGC Sharing | Kullanıcılar video yüklüyor, takip ediyor, call yapıyor. "All Other App Types" seçme. |
| Şiddet | Evet, ara sıra / hafif (fragmanlarda) | Apple ile aynı mantık (2026-10-07 kararı). |
| Korku | Evet, hafif | Korku oyunu fragmanları. |
| Cinsellik, çıplaklık | Hayır | Rehberde yasak, elle onay. |
| Küfür | Evet, hafif | Fragmanlarda ara sıra. |
| Uyuşturucu, alkol, tütün | Hayır | Kısıtlı kategoriler kapalı. |
| Kumar (gerçek veya simüle) | Hayır | Bahis yok, para yok. |
| Kullanıcılar etkileşir mi | Evet | Takip, call, kaydet, paylaş. Mesajlaşma yok. |
| Kullanıcı içerik paylaşır mı | Evet | Profil ve video yükleme. |
| Konum paylaşımı | Hayır | Sadece ülke kodu, kimseyle paylaşılmıyor. |
| Dijital ürün satın alma | Hayır (v1) | v2'de satın alma gelince anketi güncelle. |
| Sınırsız internet erişimi | Hayır | Linkler sistem tarayıcısında açılır. |

Beklenen sonuç: IARC derecesi muhtemelen 18'in altında çıkar (ör. ESRB Teen, PEGI 12 veya 16) ve "Users Interact" etiketi gelir. Bu normal: IARC içeriğe bakar, yaş sınırını değil. Google'da Apple'daki gibi "yukarı override" yok; 18+ sınırı hedef kitle bölümünden ve uygulamadaki yaş kontrolünden gelir.

### 5.2 Hedef kitle ve içerik (Target audience and content)

* Hedef yaş grupları: **sadece "18 and over"**. Diğer tüm kutular boş.
* "Çocukların ilgisini çekebilir mi" (Appeals to children): **Hayır**. Sebep: tasarım tek renkli, maskot yok, mağaza metinleri yetişkin oyuncu ve creator'a yönelik.
* Sonuç: Aileler (Families) politikası uygulanmaz, Teacher Approved yok.
* Reklam beyanı: "Evet" kalsın (bkz. 2.5).
* Veri güvenliği: yaş kontrolü için sadece doğum yılı tutuluyor; formdaki mevcut beyanlarla tutarlı olduğundan emin ol.

## 6. Kontrol listesi (sonraki gönderimden önce)

1. Avukat bu dosyayı ve Bölüm 4 metnini okusun.
2. Terms'e "Age requirement" bölümü eklensin ve deploy edilsin (sonra Age Suitability URL `#age` olur).
3. ASC > App Information > Age Ratings > Edit: Bölüm 2'deki cevaplar, yeni maddeler (Shared Location, Dating and Relationships) dahil, sonra Override 18+.
4. App Review notuna kısa satır: "18+ only. Date of birth asked at sign up; server refuses under 18. No messaging, no in-app browser, no purchases. All uploads are reviewed by a person before going live."
5. Play Console: IARC ve hedef kitle kontrol, değişiklik yoksa dokunma.
6. Boost, satın alma veya mesajlaşma geldiğinde bu dosya güncellenir.

## Kaynaklar

* [Apple: Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/)
* [Apple: Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
* [Apple: New age rating content descriptors (Shared Location, Dating and Relationships)](https://developer.apple.com/news/?id=yxkh08us)
* [Apple: Age rating questionnaire now includes social media questions](https://developer.apple.com/news?id=tlur8uvi)
* [Apple: Updated age ratings in App Store Connect](https://developer.apple.com/news/?id=ks775ehf)
* [Google Play: Ads declaration](https://support.google.com/googleplay/android-developer/answer/9859455)
