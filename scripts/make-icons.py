# Gera os ícones (favicon, iPhone, Android) com o "M" do logo original (public/logo.png),
# em branco sobre o degradê da marca, com o brilho ✦ usado no site.
# Uso: python scripts/make-icons.py   (requer Pillow)
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
S = 1024  # desenha grande e reduz (bordas suaves)
k = S / 64
M_COLS = (401, 570)  # colunas do "M" dentro do logo.png (U S E [M] A V I Ê)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient():
    c0, c1, c2 = (0x7A, 0x2E, 0x63), (0xC2, 0x47, 0x7A), (0xE5, 0x8A, 0xA9)
    small = Image.new("RGB", (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126  # diagonal
            px[x, y] = lerp(c0, c1, t / 0.55) if t < 0.55 else lerp(c1, c2, (t - 0.55) / 0.45)
    return small.resize((S, S), Image.BICUBIC)


# "M" do logo: só a opacidade, recortada justa
alpha = Image.open(os.path.join(ROOT, "logo.png")).split()[3]
m = alpha.crop((M_COLS[0], 0, M_COLS[1], alpha.height))
m = m.crop(m.getbbox())
target_h = round(S * 0.50)
m = m.resize((round(m.width * target_h / m.height), target_h), Image.LANCZOS)

img = gradient().convert("RGBA")
rounded = Image.new("L", (S, S), 0)
ImageDraw.Draw(rounded).rounded_rectangle([0, 0, S - 1, S - 1], radius=16 * k, fill=255)
img.putalpha(rounded)

white = Image.new("RGBA", m.size, (255, 255, 255, 255))
white.putalpha(m)
img.alpha_composite(white, ((S - m.width) // 2, round(S * 0.53) - m.height // 2))

star = [(52, 7.5), (53.2, 10.8), (56.5, 12), (53.2, 13.2), (52, 16.5), (50.8, 13.2), (47.5, 12), (50.8, 10.8)]
ImageDraw.Draw(img).polygon([(x * k, y * k) for x, y in star], fill="white")

# iPhone usa ícone sem transparência (ele mesmo arredonda os cantos)
apple = gradient().convert("RGBA")
apple.alpha_composite(img)
apple.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, "apple-touch-icon.png"))
img.resize((192, 192), Image.LANCZOS).save(os.path.join(ROOT, "icon-192.png"))
img.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "icon-512.png"))
img.resize((64, 64), Image.LANCZOS).save(os.path.join(ROOT, "icon-64.png"))
img.save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print("ícones gerados em public/")
