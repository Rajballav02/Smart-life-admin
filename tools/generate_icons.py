#!/usr/bin/env python3
"""Draws the app icons (PWA / home-screen / apple-touch). Needs: pip install pillow."""
import math, os
from PIL import Image, ImageDraw

OUT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'client', 'public', 'icons'))
os.makedirs(OUT, exist_ok=True)
A, B = (108, 92, 231), (0, 194, 168)


def gradient(n):
    img = Image.new('RGB', (n, n))
    px = img.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * n)
            px[x, y] = tuple(int(A[i] * (1 - t) + B[i] * t) for i in range(3))
    return img


def glyph(draw, S, ox, oy, scale):
    """Logo mark in a 64-unit box: a check inside a ring, with an orbiting dot (the 'hub')."""
    def p(x, y):
        return (ox + x * scale, oy + y * scale)
    w = max(2, int(4.6 * scale))
    c = p(32, 32)
    r = 21 * scale
    draw.arc([c[0] - r, c[1] - r, c[0] + r, c[1] + r], start=-15, end=285, fill='white', width=w)
    draw.line([p(22.5, 33), p(29.5, 40), p(42, 25.5)], fill='white', width=w, joint='curve')
    for q in (p(22.5, 33), p(29.5, 40), p(42, 25.5)):
        draw.ellipse([q[0] - w / 2, q[1] - w / 2, q[0] + w / 2, q[1] + w / 2], fill='white')
    dx, dy = p(32 + 21 * math.cos(math.radians(-45)), 32 + 21 * math.sin(math.radians(-45)))
    rr = 5.2 * scale
    draw.ellipse([dx - rr, dy - rr, dx + rr, dy + rr], fill='white')
    # round the arc end caps
    for ang in (-15, 285):
        ex = c[0] + r * math.cos(math.radians(ang)) - 0
        ey = c[1] + r * math.sin(math.radians(ang))
        draw.ellipse([ex - w / 2, ey - w / 2, ex + w / 2, ey + w / 2], fill='white')


def make(size, maskable=False, name=''):
    S = size * 3
    base = gradient(S // 4).resize((S, S), Image.BICUBIC)
    d = ImageDraw.Draw(base)
    scale = S / 64 * (0.62 if maskable else 0.86)      # maskable icons need a bigger safe margin
    off = (S - 64 * scale) / 2
    glyph(d, S, off, off, scale)
    if not maskable:
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S, S], radius=int(S * 0.22), fill=255)
        base.putalpha(mask)
    base.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))


make(192, name='icon-192.png')
make(512, name='icon-512.png')
make(512, maskable=True, name='icon-maskable-512.png')
make(180, maskable=True, name='apple-touch-icon.png')   # iOS rounds the corners itself
print('icons written to', OUT)
