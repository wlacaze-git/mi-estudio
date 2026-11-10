"""Genera los iconos PNG de la app: animal print rosa claro sobre blanco."""
import os
import random

from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
SS = 2  # supersampling
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")

BASE = (255, 247, 251, 255)
SPOT = (240, 163, 194, 255)
SPOT_SOFT = (247, 194, 215, 255)

INK = (157, 23, 77, 255)
PINK = (244, 114, 182, 255)
PINK_SOFT = (251, 207, 232, 255)


def draw_spots(size, seed=5, count=38):
    """Manchas rosa tipo animal print, con algunas huecas (como la referencia)."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rnd = random.Random(seed)
    for _ in range(count):
        cx = rnd.uniform(-0.05, 1.05) * size
        cy = rnd.uniform(-0.05, 1.05) * size
        w = size * rnd.uniform(0.055, 0.105)
        h = w * rnd.uniform(0.68, 1.2)
        color = SPOT if rnd.random() < 0.75 else SPOT_SOFT
        for _ in range(rnd.randint(2, 4)):
            ox = rnd.uniform(-w * 0.32, w * 0.32)
            oy = rnd.uniform(-h * 0.3, h * 0.3)
            bw = w * rnd.uniform(0.55, 0.95)
            bh = h * rnd.uniform(0.55, 0.95)
            d.ellipse([cx + ox - bw / 2, cy + oy - bh / 2, cx + ox + bw / 2, cy + oy + bh / 2], fill=color)
        if rnd.random() < 0.4:
            d.ellipse([cx - w * 0.18, cy - h * 0.18, cx + w * 0.18, cy + h * 0.18], fill=BASE)
    return layer


def draw_book(scale=1.0):
    canvas = Image.new("RGBA", (SIZE * SS, SIZE * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    s = SS * scale
    off = (SIZE * SS - SIZE * s) / 2

    def X(v):
        return off + v * s

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([X(196), X(210), X(658), X(842)], radius=58 * s, fill=(190, 24, 93, 60))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16 * s)))

    d.rounded_rectangle([X(196), X(196), X(658), X(828)], radius=58 * s, fill=(255, 255, 255, 255),
                        outline=(249, 198, 221, 255), width=max(1, int(3 * s)))
    d.rounded_rectangle([X(272), X(298), X(558), X(328)], radius=15 * s, fill=INK)
    d.rounded_rectangle([X(272), X(378), X(514), X(404)], radius=13 * s, fill=PINK_SOFT)
    d.rounded_rectangle([X(272), X(448), X(540), X(474)], radius=13 * s, fill=PINK_SOFT)
    d.rounded_rectangle([X(272), X(518), X(468), X(544)], radius=13 * s, fill=PINK_SOFT)

    d.ellipse([X(532), X(548), X(868), X(884)], fill=(255, 255, 255, 255))
    pts = [(X(628), X(716)), (X(680), X(768)), (X(776), X(664))]
    d.line(pts, fill=INK, width=int(34 * s), joint="curve")
    for px, py in (pts[0], pts[-1]):
        r = 17 * s
        d.ellipse([px - r, py - r, px + r, py + r], fill=INK)
    return canvas


def build_icon(scale=1.0):
    size = SIZE * SS
    base = Image.new("RGBA", (size, size), BASE)
    base.alpha_composite(draw_spots(size, seed=7, count=42))
    base.alpha_composite(draw_book(scale))
    return base.resize((SIZE, SIZE), Image.LANCZOS)


def build_pattern_tile(size=512):
    tile = Image.new("RGBA", (size, size), BASE)
    tile.alpha_composite(draw_spots(size, seed=11, count=24))
    return tile


def main():
    os.makedirs(OUT, exist_ok=True)
    normal = build_icon(1.0)
    maskable = build_icon(0.74)

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
