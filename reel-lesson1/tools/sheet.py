"""Tile snapshot PNGs into contact sheets for review: python3 sheet.py out_prefix img..."""
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
W, H, C = 432, 768, 4
for s in range(0, len(files), 8):
    chunk = files[s:s + 8]
    rows = (len(chunk) + C - 1) // C
    sheet = Image.new('RGB', (W * C, (H + 30) * rows), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(chunk):
        im = Image.open(f).convert('RGB').resize((W, H))
        x, y = (i % C) * W, (i // C) * (H + 30)
        sheet.paste(im, (x, y + 30))
        d.text((x + 8, y + 8), f.split('/')[-1], fill=(255, 255, 0))
    sheet.save(f'{out}-{s // 8}.jpg', quality=88)
    print(f'{out}-{s // 8}.jpg')
