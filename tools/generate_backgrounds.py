#!/usr/bin/env python3
"""
Generates the per-page background artwork for Smart Life Admin.

For every page it renders a 3840x2160 (4K) WebP plus a 1920x1080 fallback that the CSS
uses on small screens, and writes client/src/assets/backgrounds/index.js so the React app
can import them.

Each background is themed to its page label (Finance = rising charts and coins, Documents =
sheets and shields, Calendar = date grid, Settings = gears, and so on) on top of a soft
colour wash, kept light enough for the UI to stay readable. Tune SATURATION, ART_BOOST and ART_MAX_ALPHA at the top of the script to make them stronger or softer.

Usage (needs: pip install pillow numpy):
    python3 tools/generate_backgrounds.py            # all pages
    python3 tools/generate_backgrounds.py finance    # just one or more pages
"""
import math
import os
import random
import sys
import zlib

import numpy as np
from PIL import Image, ImageDraw

W4, H4, SS = 3840, 2160, 2          # output size and supersampling factor for crisp lines
W2, H2 = W4 * SS, H4 * SS
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'client', 'src', 'assets', 'backgrounds'))

VIOLET, TEAL, ORANGE = '#6C5CE7', '#00B894', '#FF9F43'

# Visibility tuning: how strongly the artwork and colour wash show up.
SATURATION = 1.9     # colour wash saturation
BRIGHTNESS = 0.93    # slightly deeper than pure pastel
ART_BOOST = 2.8      # multiplier on every artwork layer's opacity (capped below)
ART_MAX_ALPHA = 0.62


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def P(v):
    return int(round(v * SS))


# --------------------------------------------------------------------------- drawing layers
class Layer:
    """A single-colour layer drawn as an antialiased mask, composited at a given opacity."""

    def __init__(self, color, alpha):
        self.mask = Image.new('L', (W2, H2), 0)
        self.d = ImageDraw.Draw(self.mask)
        self.color = rgb(color)
        self.alpha = alpha

    def line(self, pts, w=4):
        self.d.line([(P(x), P(y)) for x, y in pts], fill=255, width=max(1, P(w)), joint='curve')

    def circle(self, cx, cy, r, w=0):
        box = [P(cx - r), P(cy - r), P(cx + r), P(cy + r)]
        if w:
            self.d.ellipse(box, outline=255, width=max(1, P(w)))
        else:
            self.d.ellipse(box, fill=255)

    def arc(self, cx, cy, r, a0, a1, w=4):
        self.d.arc([P(cx - r), P(cy - r), P(cx + r), P(cy + r)], a0, a1, fill=255, width=max(1, P(w)))

    def poly(self, pts, w=0):
        p = [(P(x), P(y)) for x, y in pts]
        if w:
            self.d.line(p + [p[0]], fill=255, width=max(1, P(w)), joint='curve')
        else:
            self.d.polygon(p, fill=255)

    def rrect(self, x, y, w, h, r, stroke=0):
        box = [P(x), P(y), P(x + w), P(y + h)]
        if stroke:
            self.d.rounded_rectangle(box, radius=P(r), outline=255, width=max(1, P(stroke)))
        else:
            self.d.rounded_rectangle(box, radius=P(r), fill=255)

    def stamp(self, cx, cy, w, h, angle, draw_fn):
        """Draw a shape on a small scratch mask, rotate it and merge it in at (cx, cy)."""
        pad = 60
        tmp = Layer.__new__(Layer)
        tmp.mask = Image.new('L', (P(w + 2 * pad), P(h + 2 * pad)), 0)
        tmp.d = ImageDraw.Draw(tmp.mask)
        draw_fn(tmp, pad, pad, w, h)
        rot = tmp.mask.rotate(angle, resample=Image.BICUBIC, expand=True)
        self.mask.paste(255, (P(cx) - rot.size[0] // 2, P(cy) - rot.size[1] // 2), rot)


# --------------------------------------------------------------------------- reusable shapes
def doc_shape(t, ox, oy, w, h, lines=5, stroke=6):
    t.rrect(ox, oy, w, h, 30, stroke)
    t.poly([(ox + w - 80, oy), (ox + w, oy + 80), (ox + w - 80, oy + 80)], w=stroke * 0.8)
    for i in range(lines):
        y = oy + h * 0.34 + i * (h * 0.11)
        end = 0.86 if i < lines - 1 else 0.55
        t.line([(ox + w * 0.14, y), (ox + w * end, y)], w=stroke)


def card_shape(t, ox, oy, w, h, stroke=6):
    t.rrect(ox, oy, w, h, 44, stroke)
    t.rrect(ox + w * 0.1, oy + h * 0.2, w * 0.16, h * 0.18, 12, stroke * 0.8)
    t.line([(ox + w * 0.1, oy + h * 0.68), (ox + w * 0.6, oy + h * 0.68)], w=stroke)
    t.line([(ox + w * 0.1, oy + h * 0.82), (ox + w * 0.38, oy + h * 0.82)], w=stroke)


def shield(layer, cx, cy, w, h, stroke=8):
    right = []
    for i in range(0, 41):
        t = i / 40
        right.append((cx + w * (1 - t ** 2.2), cy - 0.8 * h + 1.8 * h * t))
    left = [(2 * cx - x, y) for x, y in reversed(right)]
    layer.poly(right + left, w=stroke)


def check(layer, cx, cy, s, w=8):
    layer.line([(cx - s, cy), (cx - s * 0.3, cy + s * 0.7), (cx + s, cy - s * 0.7)], w=w)


def sparkle(layer, cx, cy, r):
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        rad = r if i % 2 == 0 else r * 0.22
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    layer.poly(pts)


def bell(layer, cx, cy, s, stroke=10):
    pts = []
    for i in range(21):
        a = math.pi + math.pi * i / 20
        pts.append((cx + 0.5 * s * math.cos(a), cy - 0.25 * s + 0.5 * s * math.sin(a)))
    pts += [(cx + 0.5 * s, cy + 0.15 * s), (cx + 0.68 * s, cy + 0.38 * s), (cx + 0.74 * s, cy + 0.47 * s),
            (cx - 0.74 * s, cy + 0.47 * s), (cx - 0.68 * s, cy + 0.38 * s), (cx - 0.5 * s, cy + 0.15 * s)]
    layer.poly(pts, w=stroke)
    layer.circle(cx, cy + 0.66 * s, 0.1 * s, w=stroke)
    layer.circle(cx, cy - 0.8 * s, 0.05 * s, w=stroke)


def padlock(layer, cx, cy, s, stroke=10):
    layer.rrect(cx - 0.55 * s, cy - 0.05 * s, 1.1 * s, 0.85 * s, 0.12 * s, stroke)
    layer.arc(cx, cy - 0.3 * s, 0.36 * s, 180, 360, stroke)
    layer.line([(cx - 0.36 * s, cy - 0.3 * s), (cx - 0.36 * s, cy - 0.05 * s)], w=stroke)
    layer.line([(cx + 0.36 * s, cy - 0.3 * s), (cx + 0.36 * s, cy - 0.05 * s)], w=stroke)
    layer.circle(cx, cy + 0.3 * s, 0.09 * s)
    layer.line([(cx, cy + 0.32 * s), (cx, cy + 0.55 * s)], w=stroke)


def magnifier(layer, cx, cy, r, stroke=22):
    layer.circle(cx, cy, r, w=stroke)
    ang = math.radians(45)
    x0, y0 = cx + r * math.cos(ang), cy + r * math.sin(ang)
    x1, y1 = cx + (r + 0.75 * r) * math.cos(ang), cy + (r + 0.75 * r) * math.sin(ang)
    layer.line([(x0, y0), (x1, y1)], w=stroke * 2.4)
    layer.circle(x1, y1, stroke * 1.2)
    layer.arc(cx, cy, r * 0.74, 200, 255, stroke * 0.6)


def gear(layer, cx, cy, ro, ri, teeth, rot=0.0, stroke=8):
    s = 2 * math.pi / teeth
    pts = []
    for i in range(teeth):
        a = rot + s * i
        for da, rad in [(-0.38, ri), (-0.2, ro), (0.2, ro), (0.38, ri), (0.5, ri)]:
            ang = a + da * s
            pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    layer.poly(pts, w=stroke)
    layer.circle(cx, cy, ri * 0.42, w=stroke)


def dots(layer, step=56, r=2.4):
    for y in range(step // 2, H4, step):
        for x in range(step // 2, W4, step):
            layer.circle(x, y, r)


def dashed_circle(layer, cx, cy, r, w=4, dash=7, gap=6):
    a = 0
    while a < 360:
        layer.arc(cx, cy, r, a, a + dash, w)
        a += dash + gap


def network(ring_layer, node_layers, cx, cy, radii, rng):
    """Hub-and-spoke: orbit rings, nodes and spokes. node_layers is a list of Layers cycled across nodes."""
    for r in radii:
        ring_layer.circle(cx, cy, r, w=3)
    k = 0
    for ri, r in enumerate(radii):
        count = 3 + ri * 2
        base = rng.uniform(0, math.tau)
        for i in range(count):
            a = base + math.tau * i / count
            nx, ny = cx + r * math.cos(a), cy + r * math.sin(a)
            nl = node_layers[k % len(node_layers)]
            nl.circle(nx, ny, 20 + (3 - ri) * 6)
            if ri == 0:
                ring_layer.line([(cx, cy), (nx, ny)], w=3)
            k += 1
    node_layers[0].circle(cx, cy, 60)


# --------------------------------------------------------------------------- per-page artwork
def art_landing(rng):
    v, t, o, dot = Layer(VIOLET, .22), Layer(TEAL, .24), Layer(ORANGE, .26), Layer(VIOLET, .10)
    dots(dot)
    network(v, [v, t, o], 2750, 1000, [260, 480, 720], rng)
    t.stamp(3300, 380, 460, 290, -12, lambda l, x, y, w, h: card_shape(l, x, y, w, h))
    t.stamp(520, 1700, 420, 270, 9, lambda l, x, y, w, h: card_shape(l, x, y, w, h))
    o.stamp(3450, 1750, 330, 440, 8, lambda l, x, y, w, h: doc_shape(l, x, y, w, h))
    shield(o, 640, 520, 150, 190, 8)
    check(o, 640, 540, 52, 9)
    for _ in range(9):
        sparkle(v, rng.uniform(100, 3700), rng.uniform(100, 2050), rng.uniform(18, 34))
    return [dot, v, t, o]


def art_login(rng):
    v, t, dot = Layer(VIOLET, .16), Layer(TEAL, .18), Layer(VIOLET, .08)
    dots(dot, 72)
    for r in range(220, 1500, 150):
        v.circle(3000, 1080, r, w=3)
    padlock(v, 3000, 1080, 560, 14)
    for _ in range(14):
        a, r = rng.uniform(0, math.tau), rng.choice([370, 520, 670, 820, 970])
        t.circle(3000 + r * math.cos(a), 1080 + r * math.sin(a), rng.uniform(14, 26))
    shield(t, 250, 1880, 110, 140, 7)
    check(t, 250, 1893, 36, 8)
    return [dot, v, t]


def art_register(rng):
    t, v, o = Layer(TEAL, .20), Layer(VIOLET, .18), Layer(ORANGE, .22)
    # a fanned stack of cards, "one note -> many cards"
    for i, (cx, cy, ang) in enumerate([(3000, 1250, -14), (3100, 1100, -4), (3200, 950, 7)]):
        (t, v, o)[i].stamp(cx, cy, 760, 480, ang, lambda l, x, y, w, h: card_shape(l, x, y, w, h, 8))
    for _ in range(40):
        x, y, s = rng.uniform(80, 3760), rng.uniform(80, 2080), rng.uniform(16, 28)
        l = rng.choice([t, v])
        l.line([(x - s, y), (x + s, y)], w=5)
        l.line([(x, y - s), (x, y + s)], w=5)
    for _ in range(7):
        sparkle(o, rng.uniform(100, 3700), rng.uniform(100, 2050), rng.uniform(20, 36))
    t.circle(620, 1500, 260, w=6)
    t.circle(620, 1410, 90, w=6)
    t.arc(620, 1680, 170, 200, 340, 6)
    return [t, v, o]


def art_hub(rng):
    v, t, o, dot = Layer(VIOLET, .18), Layer(TEAL, .30), Layer(ORANGE, .32), Layer(VIOLET, .08)
    dots(dot, 80)
    network(v, [v, t, o], 1920, 1080, [380, 700, 1040], rng)
    v.stamp(3350, 400, 360, 240, -8, lambda l, x, y, w, h: card_shape(l, x, y, w, h))
    t.stamp(480, 1650, 360, 240, 7, lambda l, x, y, w, h: card_shape(l, x, y, w, h))
    o.stamp(3400, 1700, 280, 380, -6, lambda l, x, y, w, h: doc_shape(l, x, y, w, h))
    return [dot, v, t, o]


def art_personal(rng):
    v, vf, dot = Layer(VIOLET, .20), Layer(VIOLET, .08), Layer(VIOLET, .08)
    dots(dot, 90)
    for i in range(7):                                    # checklist rows
        y = 330 + i * 245
        v.circle(2780, y, 56, w=7)
        if i in (0, 1, 3):
            check(v, 2780, y, 26, 10)
        v.line([(2900, y), (2900 + rng.choice([520, 640, 760]), y)], w=8)
        vf.rrect(2700, y - 100, 1020, 200, 40)
    cx, cy, r = 760, 1450, 430                            # clock
    v.circle(cx, cy, r, w=8)
    for k in range(12):
        a = math.tau * k / 12
        v.line([(cx + (r - 50) * math.cos(a), cy + (r - 50) * math.sin(a)),
                (cx + (r - 14) * math.cos(a), cy + (r - 14) * math.sin(a))], w=8)
    v.line([(cx, cy), (cx, cy - 250)], w=12)
    v.line([(cx, cy), (cx + 170, cy + 60)], w=12)
    v.circle(cx, cy, 16)
    for r_ in range(3):                                   # small calendar squares top-left
        for c_ in range(5):
            v.rrect(160 + c_ * 120, 160 + r_ * 120, 90, 90, 18, 5)
    return [dot, vf, v]


def art_finance(rng):
    g, gf, bars, dot = Layer(TEAL, .34), Layer(TEAL, .09), Layer(TEAL, .13), Layer(TEAL, .08)
    for y in range(300, 2100, 300):
        dot.line([(0, y), (W4, y)], w=2)
    pts, y = [], 1750
    for i in range(0, 25):
        x = i * W4 / 24
        y = 1750 - (i / 24) * 1050 + rng.uniform(-110, 110)
        pts.append((x, y))
    g.line(pts, w=10)
    gf.poly(pts + [(W4, H4), (0, H4)])
    for x, y in pts[::3]:
        g.circle(x, y, 22)
    for i in range(16):                                    # bars
        h = 160 + i * 38 + rng.uniform(-40, 40)
        bars.rrect(2420 + i * 88, 2160 - h, 56, h, 16)
    for cx, cy, r in [(3300, 480, 190), (3580, 760, 120), (620, 560, 150)]:   # coins
        g.circle(cx, cy, r, w=10)
        g.circle(cx, cy, r * 0.66, w=6)
        g.line([(cx - r * 0.26, cy - r * 0.3), (cx + r * 0.26, cy - r * 0.3)], w=8)      # rupee-style mark
        g.line([(cx - r * 0.26, cy - r * 0.1), (cx + r * 0.26, cy - r * 0.1)], w=8)
        g.line([(cx - r * 0.18, cy - r * 0.1), (cx + r * 0.2, cy + r * 0.38)], w=8)
    return [dot, gf, bars, g]


def art_documents(rng):
    o, of, y = Layer(ORANGE, .28), Layer(ORANGE, .08), Layer('#F6B93B', .24)
    for i, (cx, cy, ang, w, h) in enumerate([(3050, 760, -9, 520, 690), (3350, 980, 6, 480, 640),
                                              (2720, 1250, 14, 460, 610), (700, 1500, -7, 440, 580)]):
        (o, y)[i % 2].stamp(cx, cy, w, h, ang, lambda l, x_, y_, w_, h_: doc_shape(l, x_, y_, w_, h_, 6, 8))
    shield(o, 3550, 1650, 190, 240, 10)
    check(o, 3550, 1670, 70, 12)
    shield(y, 640, 520, 150, 190, 8)
    check(y, 640, 540, 52, 10)
    for k in range(4):                                     # a fanned pile of folders
        o.rrect(1450 + k * 70, 1560 - k * 45, 560, 360, 40, 6)
    of.rrect(1450 + 3 * 70, 1560 - 3 * 45, 560, 360, 40)
    for _ in range(10):
        o.circle(rng.uniform(100, 3700), rng.uniform(100, 2050), rng.uniform(10, 18))
    return [of, o, y]


def art_notes(rng):
    v, rose, pen = Layer(VIOLET, .10), Layer('#F472B6', .24), Layer(VIOLET, .24)
    for y in range(160, 2160, 120):
        v.line([(0, y), (W4, y)], w=2)
    rose.line([(560, 0), (560, H4)], w=5)
    pen.stamp(3000, 900, 1100, 90, -38, lambda l, x, y, w, h: (
        l.rrect(x, y, w * 0.82, h, 40, 8),
        l.poly([(x + w * 0.82, y), (x + w, y + h / 2), (x + w * 0.82, y + h)], w=8)))
    pts = [(2050 + i * 14, 1650 + 70 * math.sin(i / 5.0)) for i in range(120)]
    pen.line(pts, w=9)
    for _ in range(11):
        sparkle(rng.choice([rose, pen]), rng.uniform(700, 3700), rng.uniform(100, 2050), rng.uniform(20, 38))
    return [v, rose, pen]


def art_calendar(rng):
    b, bf, ring = Layer('#4F6BED', .16), Layer('#4F6BED', .08), Layer(VIOLET, .24)
    cw, ch, gap = 380, 300, 40
    x0, y0 = (W4 - 7 * (cw + gap)) // 2, 160
    fills = set(rng.sample(range(35), 7))
    for i in range(35):
        c, r = i % 7, i // 7
        x, y = x0 + c * (cw + gap), y0 + r * (ch + gap) + 120
        b.rrect(x, y, cw, ch, 36, 4)
        if i in fills:
            bf.rrect(x, y, cw, ch, 36)
    ring.circle(x0 + 3 * (cw + gap) + cw / 2, y0 + 2 * (ch + gap) + 120 + ch / 2, 150, w=10)
    return [bf, b, ring]


def art_search(rng):
    c, cf, i = Layer('#0EA5E9', .26), Layer('#0EA5E9', .10), Layer('#6366F1', .18)
    magnifier(c, 3000, 900, 420, 24)
    for r in range(620, 1500, 170):
        dashed_circle(i, 3000, 900, r, 4)
    for k in range(5):
        y = 1560 + k * 100
        cf.rrect(380, y, 1300 - k * 140, 64, 32)
        c.circle(330, y + 32, 14)
    for _ in range(22):
        i.circle(rng.uniform(100, 3700), rng.uniform(100, 2050), rng.uniform(8, 16))
    return [cf, c, i]


def art_notifications(rng):
    c, a, cf = Layer('#FF6B5B', .26), Layer('#F6B93B', .26), Layer('#FF6B5B', .08)
    bell(c, 3000, 1050, 760, 12)
    c.circle(3350, 600, 70)
    for r in (520, 680, 840):
        c.arc(3000, 1000, r, 200, 245, 8)
        c.arc(3000, 1000, r, 295, 340, 8)
    for k in range(3):
        y = 500 + k * 330
        a.rrect(380, y, 1250, 240, 50, 7)
        a.circle(520, y + 120, 54, w=7)
        a.line([(640, y + 90), (1300, y + 90)], w=8)
        a.line([(640, y + 150), (1050, y + 150)], w=8)
        cf.rrect(380, y, 1250, 240, 50)
    for _ in range(10):
        sparkle(a, rng.uniform(100, 3700), rng.uniform(100, 2050), rng.uniform(16, 30))
    return [cf, c, a]


def art_profile(rng):
    v, rose, vf = Layer('#8B5CF6', .20), Layer('#F472B6', .24), Layer('#8B5CF6', .08)
    for r in range(240, 1300, 140):
        v.circle(3000, 900, r, w=3)
    rose.circle(3000, 760, 190, w=12)                       # avatar
    rose.arc(3000, 1230, 360, 200, 340, 12)
    vf.circle(3000, 900, 560)
    v.stamp(700, 1450, 760, 480, -6, lambda l, x, y, w, h: (
        l.rrect(x, y, w, h, 44, 8),
        l.circle(x + w * 0.24, y + h * 0.4, 90, w=8),
        [l.line([(x + w * 0.46, y + h * f), (x + w * 0.86, y + h * f)], w=8) for f in (0.3, 0.46, 0.62)]))
    rose.circle(3550, 1700, 120, w=10)
    check(rose, 3550, 1700, 42, 12)
    return [vf, v, rose]


def art_settings(rng):
    s, b, sf = Layer('#64748B', .22), Layer('#6366F1', .24), Layer('#64748B', .08)
    gear(s, 3100, 900, 540, 450, 14, 0.0, 10)
    gear(b, 2330, 1620, 330, 270, 10, 0.16, 9)
    gear(s, 3620, 1750, 190, 150, 8, 0.3, 8)
    sf.circle(3100, 900, 450)
    for k, (frac) in enumerate([0.3, 0.7, 0.5]):
        y = 1450 + k * 190
        b.line([(300, y), (1300, y)], w=8)
        b.circle(300 + 1000 * frac, y, 42)
    b.rrect(300, 760, 260, 130, 65, 8)
    b.circle(495, 825, 44)
    s.rrect(660, 760, 260, 130, 65, 8)
    s.circle(725, 825, 44, w=8)
    return [sf, s, b]


PAGES = {
    # name: (gradient start, gradient end, blobs [(x, y, radius, colour, strength)], artwork)
    'landing': ('#FAF9FE', '#EFEBFB', [(.12, .15, .34, '#8B7CF6', .55), (.90, .12, .30, '#2DD4BF', .45),
                                       (.85, .85, .36, '#FFB37A', .45), (.10, .90, .28, '#2DD4BF', .35),
                                       (.50, .50, .30, '#8B7CF6', .25)], art_landing),
    'login': ('#F7F5FF', '#E9E4FF', [(.85, .20, .40, '#8B7CF6', .50), (.10, .90, .30, '#2DD4BF', .30),
                                     (.20, .10, .25, '#B7AEFB', .40)], art_login),
    'register': ('#F4FBFA', '#EAF3FF', [(.15, .20, .35, '#2DD4BF', .45), (.90, .80, .38, '#8B7CF6', .40),
                                        (.80, .10, .20, '#FFB37A', .30)], art_register),
    'hub': ('#F8F7FD', '#EEEAFB', [(.08, .10, .32, '#8B7CF6', .45), (.93, .20, .30, '#2DD4BF', .40),
                                   (.80, .95, .34, '#FFB37A', .40), (.15, .85, .26, '#B7AEFB', .30)], art_hub),
    'personal': ('#F7F5FF', '#ECE7FF', [(.10, .10, .36, '#8B7CF6', .50), (.90, .90, .34, '#B7AEFB', .45),
                                        (.55, .45, .26, '#C4BBFF', .25)], art_personal),
    'finance': ('#F2FBF8', '#E3F6F0', [(.90, .15, .36, '#34D399', .45), (.10, .90, .34, '#2DD4BF', .40),
                                       (.50, .50, .26, '#A7F3D0', .30)], art_finance),
    'documents': ('#FFF9F2', '#FFEFDD', [(.88, .15, .36, '#FFB37A', .50), (.10, .85, .34, '#FFC857', .40),
                                         (.50, .50, .26, '#FFD7A8', .30)], art_documents),
    'notes': ('#F8F6FF', '#F1E9FF', [(.10, .15, .34, '#B7AEFB', .45), (.90, .85, .34, '#F5A3D0', .35),
                                     (.60, .30, .24, '#C4BBFF', .25)], art_notes),
    'calendar': ('#F3F6FF', '#E6ECFF', [(.10, .10, .34, '#7C9CFF', .45), (.92, .85, .36, '#B7AEFB', .40),
                                        (.55, .50, .24, '#C7D4FF', .25)], art_calendar),
    'search': ('#F1FAFF', '#E4F1FF', [(.88, .20, .36, '#38BDF8', .45), (.10, .85, .34, '#818CF8', .35),
                                      (.50, .50, .26, '#BAE6FD', .30)], art_search),
    'notifications': ('#FFF7F5', '#FFEBE4', [(.88, .20, .36, '#FF8A7A', .40), (.10, .85, .34, '#FFC857', .38),
                                             (.50, .50, .26, '#FFD1C8', .30)], art_notifications),
    'profile': ('#FAF6FF', '#F2E9FF', [(.88, .20, .36, '#A78BFA', .42), (.10, .85, .34, '#F9A8D4', .36),
                                       (.50, .50, .26, '#DDD0FF', .28)], art_profile),
    'settings': ('#F4F6FA', '#E7EBF3', [(.88, .20, .36, '#94A3B8', .40), (.10, .85, .34, '#8B9CF6', .34),
                                        (.50, .50, .26, '#CBD5E1', .30)], art_settings),
}


# --------------------------------------------------------------------------- compositing
def wash(c1, c2, blobs):
    """Smooth colour wash, computed at half resolution and upscaled (gradients don't need more)."""
    w, h = 1920, 1080
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx, ny = xx / w, yy / h
    t = (nx * 0.6 + ny * 0.4)[..., None]
    img = np.array(rgb(c1), np.float32) * (1 - t) + np.array(rgb(c2), np.float32) * t
    aspect = w / h
    for bx, by, br, col, strength in blobs:
        d2 = ((nx - bx) * aspect) ** 2 + (ny - by) ** 2
        wgt = (strength * np.exp(-d2 / (2 * (br * 0.55) ** 2)))[..., None]
        img = img * (1 - wgt) + np.array(rgb(col), np.float32) * wgt
    # richer, more saturated colour so the background is clearly visible behind the UI
    grey = img.mean(axis=2, keepdims=True)
    img = grey + (img - grey) * SATURATION
    img = img * BRIGHTNESS
    base = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
    return base.resize((W4, H4), Image.BICUBIC)


def bokeh(base, rng, name):
    """Large soft light discs (photographic depth of field) so the picture feels like a real image."""
    w, h = 1920, 1080
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    arr = np.asarray(base.resize((w, h), Image.BICUBIC)).astype(np.float32)
    for _ in range(16):
        cx, cy, r = rng.uniform(0, w), rng.uniform(0, h), rng.uniform(70, 230)
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        edge = np.clip((r - d) / 18, 0, 1)                      # soft edge
        ring = np.clip(1 - np.abs(d - r * 0.92) / 10, 0, 1) * 0.5  # brighter rim like a lens bokeh
        a = (edge * 0.10 + ring * 0.10)[..., None]
        arr = arr * (1 - a) + 255 * a
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB').resize((W4, H4), Image.BICUBIC)


def render(name):
    c1, c2, blobs, art = PAGES[name]
    rng = random.Random(zlib.crc32(name.encode()))
    base = wash(c1, c2, blobs)
    base = bokeh(base, rng, name)
    for layer in art(rng):
        alpha = min(ART_MAX_ALPHA, layer.alpha * ART_BOOST)
        small = layer.mask.reduce(SS).point(lambda v, a=alpha: int(v * a))
        base.paste(layer.color, mask=small)
        layer.mask = None
    # a whisper of noise so the large gradients don't show banding at 4K
    arr = np.asarray(base).astype(np.float32)
    arr += np.random.default_rng(zlib.crc32(name.encode())).normal(0, 1.8, (H4, W4, 1)).astype(np.float32)
    final = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB')
    os.makedirs(OUT, exist_ok=True)
    final.save(os.path.join(OUT, f'{name}-4k.webp'), 'WEBP', quality=92, method=5)
    final.resize((1920, 1080), Image.LANCZOS).save(os.path.join(OUT, f'{name}-hd.webp'), 'WEBP', quality=92, method=5)
    k4 = os.path.getsize(os.path.join(OUT, f'{name}-4k.webp')) // 1024
    hd = os.path.getsize(os.path.join(OUT, f'{name}-hd.webp')) // 1024
    print(f'{name:14s} 3840x2160 {k4:5d} KB   1920x1080 {hd:4d} KB', flush=True)


def write_index():
    names = list(PAGES)
    lines = ['// Generated by tools/generate_backgrounds.py - do not edit by hand.']
    for n in names:
        key = n.replace('-', '_')
        lines.append(f"import {key}K4 from './{n}-4k.webp';")
        lines.append(f"import {key}Hd from './{n}-hd.webp';")
    lines.append('')
    lines.append('export const BACKGROUNDS = {')
    for n in names:
        key = n.replace('-', '_')
        lines.append(f"  {n}: {{ k4: {key}K4, hd: {key}Hd }},")
    lines.append('};')
    lines.append('')
    with open(os.path.join(OUT, 'index.js'), 'w') as f:
        f.write('\n'.join(lines))


if __name__ == '__main__':
    wanted = sys.argv[1:] or list(PAGES)
    for page in wanted:
        if page not in PAGES:
            sys.exit(f'Unknown page "{page}". Choose from: {", ".join(PAGES)}')
        render(page)
    write_index()
