"""Generate PWA icons for chat.drs.bot — gradient chat bubble with dot pattern."""
from PIL import Image, ImageDraw

BASE = "/home/z/my-project/public"


def rounded_gradient(size: int) -> Image.Image:
    # Vertical gradient: indigo -> teal
    top = (66, 84, 255)
    bottom = (16, 185, 192)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = Image.new("RGBA", (size, size))
    gd = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        gd.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Rounded-square mask
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    radius = int(size * 0.22)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)

    # Chat bubble (white)
    d = ImageDraw.Draw(img)
    pad = size * 0.22
    bubble_box = [pad, pad * 0.9, size - pad, size - pad * 1.25]
    bubble_r = int((size - pad * 2) * 0.28)
    d.rounded_rectangle(bubble_box, radius=bubble_r, fill=(255, 255, 255, 255))

    # Bubble tail (bottom-left triangle)
    tx = pad + (size - pad * 2) * 0.18
    ty = size - pad * 1.25
    d.polygon(
        [(tx, ty - 2), (tx + size * 0.10, ty - 2), (tx - size * 0.02, ty + size * 0.11)],
        fill=(255, 255, 255, 255),
    )

    # Three dots (brand accent color inside bubble)
    cy = (bubble_box[1] + bubble_box[3]) / 2
    dot_r = size * 0.045
    gap = size * 0.115
    cx = size / 2
    for dx in (-gap, 0, gap):
        d.ellipse(
            [cx + dx - dot_r, cy - dot_r, cx + dx + dot_r, cy + dot_r],
            fill=(66, 84, 255, 255),
        )
    return img


for s in (192, 512):
    rounded_gradient(s).save(f"{BASE}/icon-{s}.png", "PNG")

# Apple touch icon (opaque bg, no transparency ideally)
apple = Image.new("RGBA", (180, 180), (66, 84, 255, 255))
icon512 = rounded_gradient(512).resize((180, 180), Image.LANCZOS)
apple.alpha_composite(icon512)
apple.convert("RGB").save(f"{BASE}/apple-touch-icon.png", "PNG")

print("icons generated:", 192, 512, "apple 180")
