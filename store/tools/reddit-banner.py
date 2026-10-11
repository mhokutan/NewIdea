from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H, SS = 1920, 384, 2
F = lambda n, s: ImageFont.truetype(f'{__import__("os").environ.get("FONTS", "fonts")}/{n}.ttf', s * SS)
im = Image.new('RGB', (W * SS, H * SS), (10, 10, 15))
glow = Image.new('RGB', (W // 4, H // 4), (10, 10, 15)); g = ImageDraw.Draw(glow)
g.ellipse((-60, -80, 200, 120), fill=(120, 36, 60)); g.ellipse((300, 10, 560, 200), fill=(70, 40, 140))
glow = glow.filter(ImageFilter.GaussianBlur(40)).resize(im.size, Image.LANCZOS); im = glow
d = ImageDraw.Draw(im)
# logo mark
cx, cy, r = 700 * SS, 192 * SS, 78 * SS
ring = Image.new('RGBA', im.size, (0, 0, 0, 0)); rd = ImageDraw.Draw(ring)
for i in range(360):
    t = i / 359; col = (int(255 + (139 - 255) * t), int(84 + (92 - 84) * t), int(112 + (255 - 112) * t), 255)
    rd.arc((cx - r, cy - r, cx + r, cy + r), start=135 + i, end=137 + i, fill=col, width=12 * SS)
im.paste(ring, (0, 0), ring)
d.ellipse((cx - r + 12 * SS, cy - r + 12 * SS, cx + r - 12 * SS, cy + r - 12 * SS), fill=(20, 20, 31))
k = r / 29
def chev(y):
    pts = [(cx - 12 * k, cy + (y - 32) * k), (cx, cy + (y - 12 - 32) * k), (cx + 12 * k, cy + (y - 32) * k)]
    d.line(pts, fill=(198, 255, 61), width=int(6 * k), joint='curve')
    for p in (pts[0], pts[2]): d.ellipse((p[0] - 3 * k, p[1] - 3 * k, p[0] + 3 * k, p[1] + 3 * k), fill=(198, 255, 61))
chev(35); chev(46)
x = cx + r + 40 * SS
d.text((x, 112 * SS), 'PromoVote', font=F('b800', 92), fill=(245, 244, 248))
d.text((x, 222 * SS), 'Call the next ', font=F('b700', 46), fill=(245, 244, 248))
w = d.textlength('Call the next ', font=F('b700', 46))
d.text((x + w, 222 * SS), 'big hit.', font=F('b700', 46), fill=(198, 255, 61))
d.text((x, 290 * SS), 'Now on Google Play  ·  iPhone soon  ·  promovote.com', font=F('inter500', 24), fill=(163, 161, 181))
im.resize((W, H), Image.LANCZOS).save('/home/user/NewIdea/store/assets/social/reddit-banner-1920x384.png', optimize=True)
