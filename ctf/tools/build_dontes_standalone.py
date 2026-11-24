#!/usr/bin/env python3
"""Önálló, egyfájlos változat a döntési incidenskezelés-módból (ctf/dontes/).

A scenarios.js és az engine.js tartalmát beágyazza az index.html-be, így a kimenet
dupla kattintással is megnyitható. A vissza-linkek a mellette lévő önálló fájlokra mutatnak
(RedVsBlue_jatek.html, RedVsBlue_CTF.html).

Futtatás a repó gyökeréből: python3 ctf/tools/build_dontes_standalone.py <kimenet.html>
"""
import os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dontes')
out = sys.argv[1]
with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
    html = f.read()
links = "window.IR_MENU_URL = 'RedVsBlue_jatek.html'; window.IR_CTF_URL = 'RedVsBlue_CTF.html';"
for name in ('scenarios.js', 'engine.js'):
    tag = f'<script src="{name}"></script>'
    assert html.count(tag) == 1, tag
    with open(os.path.join(ROOT, name), encoding='utf-8') as f:
        js = f.read().replace('</', '<\\/')  # never close the <script> early
    html = html.replace(tag, f'<script>{links if name == "scenarios.js" else ""}\n{js}</script>')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'-> {out} ({os.path.getsize(out) // 1024} KB)')
