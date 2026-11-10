"""Crop the generated portraits to face-centred squares and write web-ready JPEGs."""
from PIL import Image
import pathlib, base64, json

W = pathlib.Path("/home/user/workspace")
OUT = W / "linkhub" / "public"
OUT.mkdir(parents=True, exist_ok=True)

# (source, output, horizontal focus 0-1, vertical focus 0-1)
JOBS = [
    (W / "public" / "demo-avatar.png", "demo-avatar.jpg", 0.50, 0.30),
    (W / "demo-avatar-2.png", "demo-avatar-2.jpg", 0.50, 0.30),
    (W / "demo-avatar-3.png", "demo-avatar-3.jpg", 0.50, 0.34),
]

data_urls = {}
for src, name, fx, fy in JOBS:
    im = Image.open(src).convert("RGB")
    side = min(im.size)
    left = int((im.width - side) * fx)
    top = int((im.height - side) * fy)
    im = im.crop((left, top, left + side, top + side)).resize((512, 512), Image.LANCZOS)
    dest = OUT / name
    im.save(dest, "JPEG", quality=86, optimize=True)
    small = im.resize((320, 320), Image.LANCZOS)
    tmp = OUT / ("_" + name)
    small.save(tmp, "JPEG", quality=80, optimize=True)
    data_urls[name] = "data:image/jpeg;base64," + base64.b64encode(tmp.read_bytes()).decode()
    tmp.unlink()
    print(name, dest.stat().st_size, "bytes")

(W / "linkhub" / "scripts" / "avatar-data-urls.json").write_text(json.dumps(data_urls))
print("wrote data urls")
