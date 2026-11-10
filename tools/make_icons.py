"""Genera los iconos PNG de la app (animal print rosa) con Pillow."""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
SS = 2  # supersampling
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")

BASE_STOPS = [(0.0, (255, 214, 232)), (0.55, (247, 168, 212)), (1.0, (236, 72, 153))]
SPOT = (176, 18, 90, 235)
SPOT_CORE = (244, 114, 182, 170)


def pink_gradient(size):
    """Degradado rosa en diagonal, sin numpy."""
    img = Image.new("RGB", (size, size))
    pixels = img.load()
    for y in range(size):
        for x in range(size):
            t = (x / (size - 1) + y / (size - 1)) / 2
            for i in range(len(BASE_STOPS) - 1):
                t0, c0 = BASE_STOPS[i]
                t1, c1 = BASE_STOPS[i + 1]
                if t0 <= t <= t1:
                    local = (t - t0) / (t1 - t0)
                    pixels[x, y] = tuple(round(c0[k] * (1 - local) + c1[k] * local) for k in range(3))
                    break
    return img.convert("RGBA")


def rosettes(size, seed=11, cells=4, spot=SPOT, core=SPOT_CORE, base_alpha=255):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rnd = random.Random(seed)
    cell = size / cells
    for i in range(cells):
        for j in range(cells):
            cx = (i + 0.5) * cell + rnd.uniform(-cell * 0.30, cell * 0.30)
            cy = (j + 0.5) * cell + rnd.uniform(-cell * 0.30, cell * 0.30)
            r = size * rnd.uniform(0.060, 0.095)
            width = max(3, int(r * rnd.uniform(0.32, 0.44)))
            rx = r * rnd.uniform(0.85, 1.18)
            ry = r * rnd.uniform(0.85, 1.18)
            for _ in range(rnd.randint(2, 4)):
                start = rnd.uniform(0, 360)
                extent = rnd.uniform(50, 100)
                d.arc([cx - rx, cy - ry, cx + rx, cy + ry], start, start + extent, fill=spot, width=width)
            cr = r * rnd.uniform(0.26, 0.34)
            d.ellipse([cx - cr * 1.1, cy - cr * 0.9, cx + cr * 1.1, cy + cr * 0.9], fill=core)
    return layer


def draw_content(scale=1.0):
    """Libro blanco + tilde, en un lienzo transparente."""
    canvas = Image.new("RGBA", (SIZE * SS, SIZE * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    s = SS * scale
    off = (SIZE * SS - SIZE * s) / 2

    def X(v):
        return off + v * s

    def box(x0, y0, x1, y1, r, fill):
        d.rounded_rectangle([X(x0), X(y0), X(x1), X(y1)], radius=r * s, fill=fill)

    # sombra suave debajo del libro
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        [X(196), X(206), X(658), X(838)], radius=58 * s, fill=(120, 10, 60, 70)
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14 * s)))

    box(196, 196, 658, 828, 58, (255, 255, 255, 250))
    box(272, 298, 558, 328, 15, (244, 114, 182, 255))
    box(272, 378, 514, 404, 13, (251, 207, 232, 255))
    box(272, 448, 540, 474, 13, (251, 207, 232, 255))
    box(272, 518, 468, 544, 13, (251, 207, 232, 255))

    d.ellipse([X(532), X(548), X(868), X(884)], fill=(255, 255, 255, 255))
    d.ellipse([X(554), X(570), X(846), X(862)], fill=(190, 24, 93, 255))

    pts = [(X(628), X(716)), (X(680), X(768)), (X(776), X(664))]
    d.line(pts, fill=(255, 255, 255, 255), width=int(38 * s), joint="curve")
    for px, py in (pts[0], pts[-1]):
        r = 19 * s
        d.ellipse([px - r, py - r, px + r, py + r], fill=(255, 255, 255, 255))
    return canvas


def build_icon(scale=1.0):
    size = SIZE * SS
    base = pink_gradient(SIZE).resize((size, size), Image.NEAREST)
    base.alpha_composite(rosettes(size, seed=11, cells=5))
    base.alpha_composite(draw_content(scale))
    return base.resize((SIZE, SIZE), Image.LANCZOS)


def build_pattern_tile(size=256):
    """Textura de animal print en blanco translúcido (para la barra y avatares)."""
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    tile.alpha_composite(rosettes(size, seed=5, cells=3, spot=(255, 255, 255, 90), core=(255, 255, 255, 40)))
    return tile


def main():
    os.makedirs(OUT, exist_ok=True)
    normal = build_icon(1.0)
    maskable = build_icon(0.76)

    for px in (512, 192):
        normal.resize((px, px), Image.LANCZOS).save(os.path.join(OUT, f"icon-{px}.png"), optimize=True)
        print("ok", f"icon-{px}.png")
    maskable.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "icon-maskable-512.png"), optimize=True)
    print("ok icon-maskable-512.png")
    normal.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "icon-180.png"), optimize=True)
    print("ok icon-180.png")

    build_pattern_tile().save(os.path.join(OUT, "patron-rosa.png"), optimize=True)
    print("ok patron-rosa.png")


if __name__ == "__main__":
    main()


