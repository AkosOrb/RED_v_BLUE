#!/usr/bin/env python3
"""Ellenőrzi a feladatbankot és újragenerálja a ctf/index.json-t.

Futtatás a repó gyökeréből: python3 ctf/tools/build_index.py
Hibás feladat esetén nem nulla kóddal lép ki (a GitHub Action ettől piros).
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
TASKS = os.path.join(ROOT, 'tasks')
KEY_TYPES = {1: 'hostname', 2: 'account', 3: 'time', 4: 'domain', 5: 'subnet', 6: 'keyword', 7: 'final'}
SIDES, MODES = ('red', 'blue'), ('easy', 'hard')

errors, index = [], []


def need(cond, path, msg):
    if not cond:
        errors.append(f'{path}: {msg}')


for side in SIDES:
    for mode in MODES:
        for layer in range(1, 8):
            d = os.path.join(TASKS, side, mode, f'L{layer}')
            if not os.path.isdir(d):
                continue
            for tid in sorted(os.listdir(d)):
                p = os.path.join(d, tid, 'task.json')
                if not os.path.isfile(p):
                    continue
                rel = os.path.relpath(p, ROOT)
                with open(p, encoding='utf-8') as f:
                    t = json.load(f)
                need(t.get('id') == tid, rel, 'az id nem egyezik a mappanévvel')
                need((t.get('side'), t.get('mode'), t.get('layer')) == (side, mode, layer), rel,
                     'side/mode/layer nem egyezik a mappával')
                for k in ('title', 'story'):
                    need({'hu', 'en'} <= set(t.get(k, {})), rel, f'{k}: hu és en kell')
                ko = t.get('keyOut') or {}
                need(ko.get('type') == KEY_TYPES[layer], rel, f'keyOut.type legyen {KEY_TYPES[layer]}')
                need('value' in ko, rel, 'keyOut.value hiányzik')
                ki = t.get('keyIn')
                if layer == 1:
                    need(ki is None, rel, 'az 1. rétegnek nincs keyIn-je')
                else:
                    need(ki and ki.get('type') == KEY_TYPES[layer - 1], rel,
                         f'keyIn.type legyen {KEY_TYPES[layer - 1]}')
                flags = t.get('flags', [])
                need(len(flags) == 4, rel, 'pontosan 4 részzászló kell')
                for fl in flags:
                    need(len(fl.get('hash', '')) == 64, rel, f'{fl.get("id")}: sha256 hash kell')
                    need('a' not in fl and 'answer' not in fl, rel, f'{fl.get("id")}: nyílt válasz nem lehet a fájlban')
                    need([h.get('tier') for h in fl.get('hints', [])] == [1, 2, 3], rel,
                         f'{fl.get("id")}: 3 fokozatú tipp kell')
                for fi in t.get('files', []):
                    need(os.path.isfile(os.path.join(d, tid, 'files', fi['name'])), rel,
                         f'hiányzó fájl: {fi["name"]}')
                index.append({'id': tid, 'side': side, 'mode': mode, 'layer': layer,
                              'path': os.path.relpath(os.path.join(d, tid), ROOT).replace(os.sep, '/')})

if errors:
    print('\n'.join(errors))
    sys.exit(1)
with open(os.path.join(ROOT, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump({'tasks': index}, f, ensure_ascii=False, indent=1)
print(f'{len(index)} feladat rendben, index.json frissítve.')
