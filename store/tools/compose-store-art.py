# Store screenshot + header compositor for PromoVote.
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]
BG = (10, 10, 15); LIME = (198, 255, 61); MUTED = (168, 165, 184); WHITE = (255, 255, 255)
def font(name, size): return ImageFont.truetype(f'{S}/fonts/{name}.ttf', size)

COPY = {
 'en': [('Call the next |big hit', 'Short promos from new games, apps and shops.'),
        ('One tap. |Your call.', 'Will it blow up or not? Lock it in.'),
        ('Right call? |Earn points.', 'Results within a week. Wrong calls lose nothing.'),
        ('Build your |Scout Score', 'Track your accuracy, streak and early hits.'),
        ('Meet the makers. |Find gifts.', 'Real perks, never tied to calls or follows.')],
 'es': [('Descubre el próximo |gran éxito', 'Promos cortas de juegos, apps y tiendas nuevas.'),
        ('Un toque. |Tu predicción.', '¿Será un éxito o no? Decide.'),
        ('¿Acertaste? |Gana puntos.', 'Resultados en una semana. Fallar no resta.'),
        ('Sube tus |puntos de explorador', 'Sigue tu precisión, rachas y aciertos tempranos.'),
        ('Creadores reales. |Regalos reales.', 'Nunca ligados a tus votos ni a seguir.')],
 'tr': [('Bir sonraki |büyük hiti bil', 'Yeni oyun, uygulama ve mağazalardan kısa tanıtımlar.'),
        ('Tek dokunuş. |Senin tahminin.', 'Patlar mı, patlamaz mı? Kararını ver.'),
        ('Bildin mi? |Puanı kap.', 'Sonuç bir hafta içinde. Yanılınca puan gitmez.'),
        ('|Kaşif Puanını büyüt', 'İsabetini, serini ve erken tahminlerini takip et.'),
        ('Üreticilerle tanış. |Hediyeleri bul.', 'Gerçek hediyeler, tahmine ya da takibe bağlı değil.')],
}
SHOTS = ['1-feed', '2-ticket', '3-reveal', '4-profile', '5-creator']

def background(w, h, glow_at=(0.5, 0.62), r=0.55):
    im = Image.new('RGB', (w, h), BG)
    g = Image.new('RGB', (w // 8, h // 8), BG); d = ImageDraw.Draw(g)
    cx, cy = glow_at[0] * w / 8, glow_at[1] * h / 8; R = r * max(w, h) / 8
    d.ellipse((cx - R, cy - R * 0.8, cx + R, cy + R * 0.8), fill=(52, 30, 104))
    d.ellipse((cx - R * 0.45, cy - R * 0.9, cx + R * 0.55, cy - R * 0.1), fill=(70, 30, 70))
    g = g.filter(ImageFilter.GaussianBlur(max(w, h) / 8 * 0.12)).resize((w, h), Image.BICUBIC)
    return Image.blend(im, g, 0.85)

def status_bar(screen):
    # Draws iOS status bar (9:41, Dynamic Island, signal, wifi, battery) at 3x scale on a 1320 wide screen.
    d = ImageDraw.Draw(screen); w = screen.width; k = w / 1320
    d.text((int(150 * k), int(88 * k)), '9:41', font=font('inter600', int(52 * k)), fill=WHITE, anchor='mm')
    d.rounded_rectangle((w / 2 - 190 * k, 34 * k, w / 2 + 190 * k, 144 * k), radius=55 * k, fill=(0, 0, 0))
    x = w - 300 * k; y = 88 * k
    for i, hgt in enumerate([14, 22, 30, 38]):
        d.rounded_rectangle((x + i * 17 * k, y + (19 - hgt) * k, x + i * 17 * k + 11 * k, y + 19 * k), radius=3 * k, fill=WHITE)
    cx, cy = x + 110 * k, y + 16 * k
    for rr, wd in [(40, 8), (26, 8), (11, 0)]:
        if wd: d.arc((cx - rr * k, cy - rr * k, cx + rr * k, cy + rr * k), 225, 315, fill=WHITE, width=int(wd * k))
        else: d.pieslice((cx - rr * k, cy - rr * k, cx + rr * k, cy + rr * k), 225, 315, fill=WHITE)
    bx = x + 160 * k
    d.rounded_rectangle((bx, y - 18 * k, bx + 74 * k, y + 18 * k), radius=10 * k, outline=(255, 255, 255, 150), width=int(4 * k))
    d.rounded_rectangle((bx + 7 * k, y - 11 * k, bx + 67 * k, y + 11 * k), radius=5 * k, fill=WHITE)
    d.rounded_rectangle((bx + 79 * k, y - 7 * k, bx + 85 * k, y + 7 * k), radius=3 * k, fill=WHITE)
    return screen

def load_screen(lang, shot):
    im = Image.open(f'{S}/store/raw/{lang}-{shot}.png').convert('RGB')
    if im.height < 2868:
        top = im.getpixel((im.width // 2, 2)) if shot in ('4-profile',) else (0, 0, 0)
        c = Image.new('RGB', (1320, 2868), top if shot == '4-profile' else BG); c.paste(im, (0, 2868 - im.height)); im = c
    return status_bar(im)

def rounded_mask(size, radius, ss=4):
    m = Image.new('L', (size[0] * ss, size[1] * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] * ss - 1, size[1] * ss - 1), radius=radius * ss, fill=255)
    return m.resize(size, Image.LANCZOS)

def phone(screen, width):
    # Screen inside a slim dark bezel with soft shadow. Returns RGBA image plus shadow padding.
    h = round(screen.height * width / screen.width)
    scr = screen.resize((width, h), Image.LANCZOS)
    bez = max(6, width // 60); rad = int(width * 0.135)
    W, H = width + 2 * bez, h + 2 * bez
    pad = int(width * 0.12)
    out = Image.new('RGBA', (W + 2 * pad, H + 2 * pad), (0, 0, 0, 0))
    sh = Image.new('L', out.size, 0)
    ImageDraw.Draw(sh).rounded_rectangle((pad, pad + pad // 3, pad + W, pad + H + pad // 3), radius=rad + bez, fill=170)
    sh = sh.filter(ImageFilter.GaussianBlur(pad / 2.5))
    out.paste(Image.new('RGBA', out.size, (0, 0, 0, 255)), (0, 0), sh)
    frame = Image.new('RGBA', (W, H), (44, 44, 60, 255))
    inner = Image.new('RGBA', (W - 4, H - 4), (16, 16, 22, 255))
    frame.paste(inner, (2, 2), rounded_mask(inner.size, rad + bez - 2))
    frame.paste(scr, (bez, bez), rounded_mask(scr.size, rad))
    out.paste(frame, (pad, pad), rounded_mask((W, H), rad + bez))
    return out, pad

def wrap_words(text, fnt, maxw, d):
    # Splits "plain |accent" headline into lines of (word, is_accent), greedy wrap.
    plain, accent = text.split('|')
    words = [(w, False) for w in plain.split()] + [(w, True) for w in accent.split()]
    pl = [w for w in words if not w[1]]; ac = [w for w in words if w[1]]
    if pl and ac and all(d.textlength(' '.join(x for x, _ in l), font=fnt) <= maxw for l in (pl, ac)):
        return [pl, ac]
    lines, cur = [], []
    for wd in words:
        trial = ' '.join(x for x, _ in cur + [wd])
        if cur and d.textlength(trial, font=fnt) > maxw: lines.append(cur); cur = [wd]
        else: cur.append(wd)
    lines.append(cur)
    # Prefer accent starting on its own line when two lines.
    if len(lines) == 1 and plain.strip() and d.textlength(' '.join(x for x, _ in words), font=fnt) > maxw * 0.7:
        lines = [[w for w in words if not w[1]], [w for w in words if w[1]]]
    return lines

def draw_headline(im, text, sub, cx, top, maxw, size, subsize, align='center'):
    d = ImageDraw.Draw(im)
    f = font('b800', size)
    while True:
        lines = wrap_words(text, f, maxw, d)
        if len(lines) <= 2 and all(d.textlength(' '.join(x for x, _ in l), font=f) <= maxw for l in lines): break
        size = int(size * 0.94); f = font('b800', size)
    lh = int(size * 1.04); y = top
    sp = d.textlength(' ', font=f)
    for l in lines:
        tw = d.textlength(' '.join(x for x, _ in l), font=f)
        x = cx - tw / 2 if align == 'center' else cx
        for wd, acc in l:
            d.text((x, y), wd, font=f, fill=LIME if acc else WHITE)
            x += d.textlength(wd, font=f) + sp
        y += lh
    fs = font('inter500', subsize)
    y += int(size * 0.28)
    tw = d.textlength(sub, font=fs)
    while tw > maxw: subsize = int(subsize * 0.95); fs = font('inter500', subsize); tw = d.textlength(sub, font=fs)
    d.text((cx - tw / 2 if align == 'center' else cx, y), sub, font=fs, fill=MUTED)
    return y + subsize

def screenshot(lang, i, W, H):
    head, sub = COPY[lang][i]
    im = background(W, H).convert('RGBA')
    k = W / 1320
    bottom = draw_headline(im, head, sub, W / 2, int(H * 0.055), int(W * 0.86), int(118 * k * (1 if W / H < 0.5 else 0.92)), int(46 * k))
    scr = load_screen(lang, SHOTS[i])
    top = bottom + int(H * 0.04)
    avail = H - top - int(H * 0.025)
    pw = min(int(W * 0.80), int(avail * 1320 / 2868 / 1.03))
    ph, pad = phone(scr, pw)
    im.alpha_composite(ph, (int(W / 2 - ph.width / 2), top - pad))
    return im.convert('RGB')

def header_master():
    W, H = 5244, 2950
    im = background(W, H, glow_at=(0.62, 0.5), r=0.42).convert('RGBA')
    sx, sy = (W - 4425) // 2, (H - 2247) // 2  # safe area shared by both crops
    d = ImageDraw.Draw(im)
    # logo mark (favicon drawing) + wordmark
    lx, ly, lr = sx + 120, sy + 360, 120
    ss = 4; L = Image.new('RGBA', (lr * 2 * ss, lr * 2 * ss), (0, 0, 0, 0)); ld = ImageDraw.Draw(L)
    grad = Image.new('RGBA', L.size)
    for x in range(L.width):
        t = x / L.width; ImageDraw.Draw(grad).line((x, 0, x, L.height), fill=(int(255 + (139 - 255) * t), int(84 + (92 - 84) * t), int(112 + (255 - 112) * t), 255))
    ring = Image.new('L', L.size, 0); ImageDraw.Draw(ring).ellipse((0, 0, L.width - 1, L.height - 1), fill=255)
    L.paste(grad, (0, 0), ring)
    q = lr * ss / 32 * 1.0
    ImageDraw.Draw(L).ellipse((5 * q * 0.5 * 2 / 2 * 1.0 + 4 * q, 4 * q, L.width - 4 * q, L.height - 4 * q), fill=(20, 20, 31, 255))
    ld = ImageDraw.Draw(L)
    for yy in (0, 11):
        ld.line([(20 * q, (35 + yy) * q), (32 * q, (23 + yy) * q), (44 * q, (35 + yy) * q)], fill=LIME, width=int(6 * q), joint='curve')
        for px, py in [(20, 35 + yy), (44, 35 + yy)]:
            ld.ellipse(((px - 3) * q, (py - 3) * q, (px + 3) * q, (py + 3) * q), fill=LIME)
    L = L.resize((lr * 2, lr * 2), Image.LANCZOS)
    im.alpha_composite(L, (lx, ly - lr))
    d.text((lx + lr * 2 + 50, ly), 'PromoVote', font=font('b800', 150), fill=WHITE, anchor='lm')
    f = font('b800', 300)
    y = ly + 300
    for line, col in [('Call the', WHITE), ('next', WHITE), ('big hit.', LIME)]:
        d.text((lx, y), line, font=f, fill=col); y += 310
    d.text((lx, y + 70), 'Watch short promos. Make your call.', font=font('inter500', 104), fill=MUTED)
    # three phones on the right
    shots = [('en', '5-creator'), ('en', '1-feed'), ('en', '2-ticket')]
    cxs = [sx + 2950, sx + 3600, sx + 4250]
    ph_h = 2050
    for idx in (0, 2, 1):
        lang, sh = shots[idx]
        pw = int(ph_h * 1320 / 2868 * (1.0 if idx == 1 else 0.9))
        ph, pad = phone(load_screen(lang, sh), pw)
        cy = H // 2 + (0 if idx == 1 else 40)
        im.alpha_composite(ph, (int(cxs[idx] - ph.width / 2) - 330, int(cy - ph.height / 2)))
    return im.convert('RGB')

if __name__ == '__main__':
    for lang in COPY:
        for i in range(5):
            for kind, (W, H) in {'ios': (1320, 2868), 'play': (1080, 1920)}.items():
                p = f'{OUT}/screens/{kind}/{lang}'; os.makedirs(p, exist_ok=True)
                screenshot(lang, i, W, H).save(f'{p}/{i + 1}-{SHOTS[i][2:]}.png', optimize=True)
    m = header_master(); os.makedirs(f'{OUT}/header', exist_ok=True)
    m.save(f'{OUT}/header/master-5244x2950.png', optimize=True)
    m.crop((0, (2950 - 2247) // 2, 5244, (2950 - 2247) // 2 + 2247)).resize((3840, 1646), Image.LANCZOS).save(f'{OUT}/header/header-3840x1646.png', optimize=True)
    m.crop(((5244 - 4425) // 2, 0, (5244 - 4425) // 2 + 4425, 2950)).resize((3840, 2560), Image.LANCZOS).save(f'{OUT}/header/search-3840x2560.png', optimize=True)
    print('done')
