"""Genera los iconos PNG de la app (normal y maskable) con Pillow."""
import os
import numpy as np
from PIL import Image, ImageDraw

SIZE = 1024
SS = 2  # supersampling
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")

STOPS = [(0.0, (125, 107, 255)), (0.55, (91, 75, 245)), (1.0, (56, 39, 159))]


def gradient(size):
    y, x = np.mgrid[0:size, 0:size] / (size - 1)
    t = (x + y) / 2.0
    out = np.zeros((size, size, 3), dtype=np.float64)
    for i in range(len(STOPS) - 1):
        t0, c0 = STOPS[i]
        t1, c1 = STOPS[i + 1]
        mask = (t >= t0) & (t <= t1)
        local = np.where(mask, (t - t0) / (t1 - t0), 0.0)
        for ch in range(3):
            out[..., ch] = np.where(mask, c0[ch] * (1 - local) + c1[ch] * local, out[..., ch])
    return out


def glow(size):
    y, x = np.mgrid[0:size, 0:size] / (size - 1)
    dist = np.sqrt((x - 0.18) ** 2 + (y - 0.08) ** 2)
    alpha = np.clip(1 - dist / 0.85, 0, 1) ** 1.4 * 0.30
    return alpha


def draw_content(scale=1.0):
    """Dibuja libro + tilde en un lienzo transparente."""
    canvas = Image.new("RGBA", (SIZE * SS, SIZE * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    s = SS * scale
    off = (SIZE * SS - SIZE * s) / 2

    def X(v):
        return off + v * s

    def box(x0, y0, x1, y1, r, fill):
        d.rounded_rectangle([X(x0), X(y0), X(x1), X(y1)], radius=r * s, fill=fill)

    box(196, 196, 658, 828, 58, (255, 255, 255, 247))
    box(272, 298, 558, 328, 15, (185, 175, 255, 255))
    box(272, 378, 514, 404, 13, (222, 217, 255, 255))
    box(272, 448, 540, 474, 13, (222, 217, 255, 255))
    box(272, 518, 468, 544, 13, (222, 217, 255, 255))

    d.ellipse([X(532), X(548), X(868), X(884)], fill=(255, 255, 255, 255))
    d.ellipse([X(554), X(570), X(846), X(862)], fill=(18, 160, 111, 255))

    pts = [(X(628), X(716)), (X(680), X(768)), (X(776), X(664))]
    d.line(pts, fill=(255, 255, 255, 255), width=int(38 * s), joint="curve")
    for px, py in (pts[0], pts[-1]):
        r = 19 * s
        d.ellipse([px - r, py - r, px + r, py + r], fill=(255, 255, 255, 255))
    return canvas


def build(scale=1.0):
    size = SIZE * SS
    bg = gradient(SIZE)
    glow_alpha = glow(SIZE)
    base = np.zeros((size, size, 3), dtype=np.float64)
    up = np.kron(bg, np.ones((SS, SS, 1)))
    base[:] = up
    ga = np.kron(glow_alpha, np.ones((SS, SS)))
    base = base * (1 - ga[..., None]) + 255 * ga[..., None]

    img = Image.fromarray(base.clip(0, 255).astype(np.uint8), "RGB").convert("RGBA")
    img.alpha_composite(draw_content(scale))
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    normal = build(1.0)
    maskable = build(0.76)
    for img, name in ((normal, "icon"), (maskable, "icon-maskable")):
        for px in (512, 192, 180):
            resized = img.resize((px, px), Image.LANCZOS)
            if name == "icon-maskable":
                if px != 512:
                    continue
                filename = "icon-maskable-512.png"
            else:
                filename = f"icon-{px}.png"
            resized.save(os.path.join(OUT, filename), optimize=True)
            print("ok", filename, resized.size)
    # apple-touch-icon es cuadrado y sin transparencia
    normal.convert("RGB").resize((180, 180), Image.LANCZOS).save(
        os.path.join(OUT, "icon-180.png"), optimize=True
    )
    print("listo")


if __name__ == "__main__":
    main()
