"""Genera los iconos de la app a partir de la ilustración de Perla (guepardo rosa)."""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "perla.png")
OUT = os.path.join(ROOT, "icons")
SIZE = 1024

# Recorte cuadrado sobre la cabeza y el cuello.
CROP = (70, 70, 710, 710)
BG = (252, 194, 190, 255)


def load_square():
    img = Image.open(SRC).convert("RGBA")
    crop = img.crop(CROP)
    return crop.resize((SIZE, SIZE), Image.LANCZOS)


def build_maskable(square):
    canvas = Image.new("RGBA", (SIZE, SIZE), BG)
    inner = square.resize((int(SIZE * 0.82), int(SIZE * 0.82)), Image.LANCZOS)
    offset = (SIZE - inner.width) // 2
    canvas.alpha_composite(inner, (offset, offset))
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    square = load_square()
    square.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "icon-512.png"), optimize=True)
    square.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, "icon-192.png"), optimize=True)
    square.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "icon-180.png"), optimize=True)
    build_maskable(square).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "icon-maskable-512.png"), optimize=True)
    square.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, "logo-perla.png"), optimize=True)
    print("iconos de Perla listos")


if __name__ == "__main__":
    main()
