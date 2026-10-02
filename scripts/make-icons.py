# Gera os ícones PNG/ICO a partir do mesmo desenho do public/favicon.svg.
# Uso: python scripts/make-icons.py   (requer Pillow)
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
S = 1024  # desenha grande e reduz (bordas suaves)
k = S / 64


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient():
    c0, c1, c2 = (0x7A, 0x2E, 0x63), (0xC2, 0x47, 0x7A), (0xE5, 0x8A, 0xA9)
    small = Image.new("RGB", (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126  # diagonal, como x1=0 y1=0 x2=1 y2=1
            px[x, y] = lerp(c0, c1, t / 0.55) if t < 0.55 else lerp(c1, c2, (t - 0.55) / 0.45)
    return small.resize((S, S), Image.BICUBIC)


# Mesmas formas do favicon.svg (coordenadas na grade de 64).
SHAPES = [
    [(17, 19.6), (19.6, 19.6), (19.6, 46.4), (17, 46.4)],
    [(17, 19.6), (22.4, 19.6), (33.6, 43), (32.8, 46.4), (30.8, 46.4)],
    [(30.8, 46.4), (32.8, 46.4), (45.9, 19.6), (43.2, 19.6)],
    [(43.4, 19.6), (48.4, 19.6), (48.4, 46.4), (43.4, 46.4)],
    [(13.6, 18.6), (19.6, 18.6), (19.6, 20.8), (13.6, 20.8)],
    [(43.4, 18.6), (51, 18.6), (51, 20.8), (43.4, 20.8)],
    [(13.6, 45), (23, 45), (23, 47.2), (13.6, 47.2)],
    [(40.4, 45), (51.4, 45), (51.4, 47.2), (40.4, 47.2)],
    [(52, 7.5), (53.2, 10.8), (56.5, 12), (53.2, 13.2), (52, 16.5), (50.8, 13.2), (47.5, 12), (50.8, 10.8)],
]


img = gradient().convert("RGBA")
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=16 * k, fill=255)
img.putalpha(mask)

d = ImageDraw.Draw(img)
for shape in SHAPES:
    d.polygon([(x * k, y * k) for x, y in shape], fill="white")

# iPhone usa ícone sem transparência (ele mesmo arredonda os cantos)
apple = gradient().convert("RGBA")
apple.alpha_composite(Image.composite(img, Image.new("RGBA", (S, S)), img.split()[3]))
apple.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, "apple-touch-icon.png"))
img.resize((192, 192), Image.LANCZOS).save(os.path.join(ROOT, "icon-192.png"))
img.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "icon-512.png"))
img.save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print("ícones gerados em public/")
