# Flip Coin Studios: Mac mini kurulum rehberi

Amaç: Mac mini'de Paperclip'i kurmak, CEO ve proje ajanlarını Claude Pro hesabınla çalıştırmak, panele
**hq.miaperatransportation.com** adresinden (telefondan da) güvenli girmek.

Süre: yaklaşık 1 saat. Komutları Terminal'e sırayla yapıştır. Bir adımda hata çıkarsa hatayı bulut Claude'a gönder.

---

## 1. Mac mini 7/24 açık kalsın

Sistem Ayarları:
* **Enerji** (ya da Pil / Enerji Tasarrufu): "Ekran kapalıyken bilgisayarın otomatik olarak uyumasını engelle" açık.
* **Enerji**: "Elektrik kesintisinden sonra otomatik başlat" açık.
* **Kullanıcılar ve Gruplar**: kendi kullanıcın için otomatik giriş (elektrik gidip gelince ajanlar kendiliğinden başlasın).
* **Genel > Yazılım Güncelleme**: otomatik güncellemeler açık kalabilir, ama "güncellemeleri otomatik yükle" kapalı olsun (gece yeniden başlayıp ajanları durdurmasın).

## 2. Gerekli programlar

```bash
# Homebrew (yoksa)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node 20+, pnpm, git, GitHub CLI, Cloudflare tüneli
brew install node pnpm git gh cloudflared

# Claude Code
npm install -g @anthropic-ai/claude-code

# Kontrol
node -v && pnpm -v && git --version && claude --version
```

## 3. Claude Code'a Pro hesabınla giriş

```bash
claude
```
Açılan ekranda **Claude hesabıyla giriş** (Pro aboneliğin) seç, tarayıcıda onayla. Sonra Claude Code içinde:
* `/model` yaz: listede Opus var mı bak. Yoksa ya da çok çabuk limite takılırsa CEO Sonnet ile başlar (CEO.md'de yazıyor).
* `/exit` ile çık.

Not: Pro planının 5 saatlik ve haftalık limitleri var. Bulut Claude ile yaptığın işler de aynı limitten gider.
Ajanlar limite takılırsa durmaz, bir sonraki pencereyi bekler.

## 4. Projeleri tek klasörde topla

```bash
mkdir -p ~/hq && cd ~/hq
gh auth login            # GitHub hesabınla giriş
gh repo clone mhokutan/NewIdea promovote
# Diğer projelerin repoları (adlarını kendi GitHub'ından yaz):
# gh repo clone mhokutan/<hauling-empire-repo> hauling-empire
# gh repo clone mhokutan/<lovelet-repo> lovelet
# gh repo clone mhokutan/<robot-game-repo> robot-game
# gh repo clone mhokutan/<poleris-repo> poleris
# gh repo clone mhokutan/<salesforce-repo> salesforce
```
Her projenin kendi `CLAUDE.md` dosyası o projenin kuralıdır. Ajanlar onu okur.

Gizli anahtarlar (Cloudflare token, Supabase, App Store, Salesforce şifresi) **repoya yazılmaz**. Gerekirse
Mac mini'de ilgili aracın kendi girişiyle (`wrangler login`, `sf org login web`, `gh auth login`) bir kez giriş yapılır.

## 5. Paperclip'i kur

```bash
cd ~/hq
npx paperclipai onboard --yes
```
Kurulum bitince Paperclip bir yerel adres verir (örneğin http://localhost:3100). Tarayıcıda aç.

Panelde:
1. Şirketi oluştur: **Flip Coin Studios**.
2. CEO ajanını ekle: model olarak Claude Code (Pro hesabın), görev tanımı olarak `~/hq/promovote/hq/CEO.md` dosyasının tamamını yapıştır.
3. İlk hafta sadece iki lider ekle: **PromoVote lideri** (klasör `~/hq/promovote`) ve **Oyunlar lideri** (Hauling Empire ile başlar, sonra Robot Game). **Mobil uygulamalar lideri** (Poleris, Lovelet) ikinci hafta.
4. Uyanma sıklığı (heartbeat): CEO günde 2 kez (09:00 ve 18:00), liderler günde 1 kez. Limitler rahatsa sonra artırırız.
5. Onay gerektiren işler (CEO.md bölüm 4) için panelde **kurucu onayı** ayarını aç.

## 6. Paperclip açılışta kendiliğinden başlasın

Paperclip'in kendi "servis olarak çalıştır" seçeneği varsa onu kullan. Yoksa:
```bash
npm install -g pm2
cd ~/hq && pm2 start "npx paperclipai start" --name paperclip
pm2 save && pm2 startup     # çıkan komutu kopyalayıp bir kez çalıştır
```

## 7. Telefondan erişim: hq.miaperatransportation.com

Mac mini'de port açmadan, Cloudflare Tunnel ile:
```bash
cloudflared tunnel login                     # miaperatransportation.com'u seç
cloudflared tunnel create hq
cloudflared tunnel route dns hq hq.miaperatransportation.com
cat > ~/.cloudflared/config.yml <<'EOF'
tunnel: hq
credentials-file: /Users/<kullanıcı-adın>/.cloudflared/<tünel-id>.json
ingress:
  - hostname: hq.miaperatransportation.com
    service: http://localhost:3100
  - service: http_status:404
EOF
sudo cloudflared service install
```
Sonra Cloudflare panelinde **Zero Trust > Access > Applications**: `hq.miaperatransportation.com` için uygulama ekle,
kural: sadece senin e-postan (tek seferlik kod). Bu adım yapılmadan adresi kimseyle paylaşma.

## 8. İlk gün kontrol listesi

* [ ] Panel açılıyor, CEO ve 2 lider görünüyor.
* [ ] CEO ilk uyanışında sana Türkçe bir "durum ve bu haftanın öncelikleri" raporu yazdı.
* [ ] Hiçbir ajan build, mağaza yüklemesi, ödeme ya da paylaşım işini onaysız yapmadı.
* [ ] Claude limit durumunu `claude` > `/status` ile kontrol ettin.

2 hafta sonra bulut Claude ile birlikte bakarız: limitler yetiyor mu, raporlar işe yarıyor mu, hangi lider eklenecek.
