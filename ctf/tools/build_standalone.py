#!/usr/bin/env python3
"""Önálló, egyfájlos CTF-változat készítése (szerver és adatbázis nélkül).

Minden feladatot és fájlt beágyaz a ctf/index.html-be (window.CTF_BUNDLE), így a kimenet
dupla kattintással is megnyitható. Mindig helyi próbamódban fut: a fiókok és eredmények
az adott böngészőben tárolódnak.

Futtatás a repó gyökeréből: python3 ctf/tools/build_standalone.py <kimenet.html>
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
out = sys.argv[1]

with open(os.path.join(ROOT, 'index.json'), encoding='utf-8') as f:
    index = json.load(f)
files = {}
for t in index['tasks']:
    base = os.path.join(ROOT, t['path'])
    with open(os.path.join(base, 'task.json'), encoding='utf-8') as f:
        files[f"{t['path']}/task.json"] = f.read()
    for name in sorted(os.listdir(os.path.join(base, 'files'))):
        with open(os.path.join(base, 'files', name), encoding='utf-8') as f:
            files[f"{t['path']}/files/{name}"] = f.read()

bundle = json.dumps({'index': index, 'files': files}, ensure_ascii=False, separators=(',', ':'))
bundle = bundle.replace('</', '<\\/')  # never close the <script> early
config = "window.CTF_CONFIG = { supabaseUrl: '', supabaseAnonKey: '', localInstructors: ['oktato'] };"

with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
    html = f.read()
tag = '<script src="config.js"></script>'
assert html.count(tag) == 1
html = html.replace(tag, f'<script>{config}</script>\n<script>window.CTF_BUNDLE = {bundle};</script>')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'{len(index["tasks"])} feladat, {len(files)} fájl -> {out} ({os.path.getsize(out) // 1024} KB)')
