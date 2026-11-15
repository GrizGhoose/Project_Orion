"""Cut-out of the H.E.R.B hardware photo for the home page showcase.

rembg (isnet-general-use) mask -> cables faded outside a hand-drawn keep polygon -> mask eroded 1px and feathered
(no white fringe on the breadboards) -> edge colours decontaminated -> cropped tight with padding -> PNG + WebP.
The original photo is never modified.

    python3 -m venv .venv && .venv/bin/pip install "rembg[cpu]" opencv-python-headless
    .venv/bin/python scripts/cutout_herb.py [fade_px]

KEEP is in pixels of the 1920x2560 source photo; edit it if a different photo is used.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[1] / "public" / "images"
SRC = ROOT / "herb-hardware-raw.jpg"
OUT = ROOT / "herb-hardware"
src = Image.open(SRC).convert('RGB')
rgb = np.array(src)
mask = np.array(remove(src, session=new_session('isnet-general-use'), only_mask=True)).astype(np.float32) / 255

# Boards plus short cable stubs (full-res px); cables beyond fade out over FADE px
KEEP = np.array([(480,150),(900,220),(1010,410),(1590,920),(1660,1120),(1700,1560),(1870,1640),(1870,1990),
                 (1520,2100),(1360,2160),(1360,2350),(1080,2480),(760,2490),(680,2330),(430,2060),(390,1790),
                 (560,1680),(520,1500),(320,1440),(300,1250),(200,1150),(200,1000),(330,920),(60,520),(100,420)], np.int32)
FADE = float(sys.argv[1]) if len(sys.argv) > 1 else 110
keep = np.zeros(mask.shape, np.uint8); cv2.fillPoly(keep, [KEEP], 255)
dist = cv2.distanceTransform(255 - keep, cv2.DIST_L2, 5)
fade = np.clip(1 - dist / FADE, 0, 1); fade = fade * fade * (3 - 2 * fade)  # smoothstep

# Tighten: binarise softly, erode 1px, feather ~1.5px
hard = (mask > 0.5).astype(np.uint8) * 255
hard = cv2.erode(hard, np.ones((3, 3), np.uint8), iterations=1)
soft = cv2.GaussianBlur(hard.astype(np.float32) / 255, (0, 0), 1.2)
alpha = np.clip(soft * np.minimum(1, mask * 1.15) * fade, 0, 1)

# Decontaminate edges: pull semi-transparent edge pixels' colour toward the interior to remove white spill
edge = (alpha > 0.02) & (alpha < 0.98)
inner = cv2.inpaint(rgb, ((alpha < 0.98) * 255).astype(np.uint8), 3, cv2.INPAINT_TELEA)
out_rgb = rgb.copy(); out_rgb[edge] = inner[edge]

rgba = np.dstack([out_rgb, (alpha * 255).astype(np.uint8)])
ys, xs = np.where(alpha > 0.02); pad = 40
y0, y1, x0, x1 = max(0, ys.min()-pad), min(rgb.shape[0], ys.max()+pad), max(0, xs.min()-pad), min(rgb.shape[1], xs.max()+pad)
img = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
img.thumbnail((1600, 1600), Image.LANCZOS)
img.save(f'{OUT}.png', optimize=True)
img.save(f'{OUT}.webp', quality=88, method=6)
print('crop', (x0, y0, x1, y1), 'size', img.size)
