#!/usr/bin/env python3
"""Download every font Stick-It uses from Google Fonts ONCE, so the production site serves them itself.

  python tools/fetch-fonts.py

Writes assets/fonts/<family>/*.woff2, the licence file of each family (taken from the google/fonts repository),
assets/fonts/fonts.css, and assets/fonts/manifest.json (family, weights, licence, source). Re-run it when a
family is added to FAMILIES. Needs network access; the app itself never needs it.
"""
import concurrent.futures as cf
import hashlib
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'fonts')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

# family -> weights actually requested by the app (None = regular 400)
FAMILIES = {
    'Sora': '400;500;600;700;800', 'Caveat': '500;700', 'Kalam': '400;700', 'Shadows Into Light': None, 'Indie Flower': None,
    'Patrick Hand': None, 'Gochi Hand': None, 'Architects Daughter': None, 'Permanent Marker': None, 'Reenie Beanie': None,
    'Homemade Apple': None, 'Nanum Pen Script': None, 'Covered By Your Grace': None, 'Schoolbell': None, 'Crafty Girls': None,
    'Neucha': None, 'Dancing Script': None, 'Handlee': None, 'Caveat Brush': None, 'Sriracha': None, 'Zeyada': None, 'Rock Salt': None,
    'Secular One': None, 'Rubik': '500;700', 'Heebo': '500;700', 'Ma Shan Zheng': None, 'Zhi Mang Xing': None, 'Long Cang': None,
    'Liu Jian Mao Cao': None, 'Klee One': '600', 'Yomogi': None, 'Hachi Maru Pop': None, 'Gaegu': '700', 'Amatic SC': '700',
    'Karantina': '400;700', 'Solitreo': None, 'Playpen Sans Hebrew': '400;600', 'Varela Round': None, 'Suez One': None,
    'Fredoka': '500', 'Gamja Flower': None, 'Hi Melody': None, 'Poor Story': None, 'Zen Kurenaido': None,
    'Gloria Hallelujah': None, 'Just Another Hand': None, 'Sue Ellen Francisco': None, 'Walter Turncoat': None, 'Rancho': None,
    'Nothing You Could Do': None, 'Shadows Into Light Two': None, 'Swanky and Moo Moo': None, 'Mansalva': None,
    'Delicious Handrawn': None, 'Short Stack': None, 'Loved by the King': None, 'Give You Glory': None,
    'Waiting for the Sunrise': None, 'Over the Rainbow': None, 'Kristi': None, 'Gveret Levin': None, 'Rubik Scribble': None,
    'Alef': None, 'Miriam Libre': None, 'Frank Ruhl Libre': None, 'Bellefair': None, 'David Libre': None, 'Marck Script': None,
    'Bad Script': None, 'Pangolin': None, 'Comforter': None, 'Underdog': None, 'Ruslan Display': None, 'Aref Ruqaa': None,
    'Katibeh': None, 'Marhey': None, 'Rakkas': None, 'Lalezar': None, 'Reem Kufi': None, 'Mada': None, 'Lateef': None, 'Harmattan': None,
    # typewriter / thermal-print faces for receipts and tickets (not offered in the handwriting picker)
    'Cutive Mono': None, 'Special Elite': None, 'Courier Prime': '400;700',
}
# scripts the app supports today. Numbered subsets are the Chinese/Japanese/Korean slices.
KEEP = {'latin', 'latin-ext', 'vietnamese', 'cyrillic', 'cyrillic-ext', 'hebrew', 'arabic'}


def get(url, binary=False, tries=4):
    last = None
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                return data if binary else data.decode('utf-8')
        except Exception as e:  # noqa
            last = e
    raise last


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def fetch_license(family):
    key = re.sub(r'[^a-z0-9]', '', family.lower())
    for kind in ('ofl', 'apache', 'ufl'):
        base = f'https://raw.githubusercontent.com/google/fonts/main/{kind}/{key}/'
        try:
            meta = get(base + 'METADATA.pb')
        except Exception:
            continue
        lic = (re.search(r'license:\s*"([^"]+)"', meta) or [None, kind.upper()])[1]
        text, name = None, None
        for fn in ('OFL.txt', 'LICENSE.txt', 'UFL.txt'):
            try:
                text = get(base + fn); name = fn; break
            except Exception:
                pass
        designer = (re.search(r'designer:\s*"([^"]+)"', meta) or [None, ''])[1]
        return {'license': lic, 'licenseText': text, 'licenseFile': name, 'designer': designer, 'source': base}
    return {'license': 'UNKNOWN', 'licenseText': None, 'licenseFile': None, 'designer': '', 'source': ''}


def process(family):
    weights = FAMILIES[family]
    q = family.replace(' ', '+') + (':wght@' + weights if weights else '')
    css = get(f'https://fonts.googleapis.com/css2?family={q}&display=swap')
    d = os.path.join(OUT, slug(family))
    os.makedirs(d, exist_ok=True)
    faces, files = [], {}
    # Latin-script families label each block (/* latin */); Chinese/Japanese/Korean families come as numbered slices
    # (...woff2 names ending .12.woff2) with no label. The numbered slices are all kept so any CJK text renders.
    for m in re.finditer(r'(?:/\*\s*([^*]+?)\s*\*/\s*)?@font-face\s*\{([^}]*)\}', css):
        subset, body = (m.group(1) or '').strip(), m.group(2)
        if not subset:
            sl = re.search(r'\.(\d+)\.woff2\)', body)
            if not sl:
                continue
            subset = '[' + sl.group(1) + ']'
        elif subset not in KEEP:
            continue
        url = re.search(r'url\((https://[^)]+\.woff2)\)', body).group(1)
        weight = re.search(r'font-weight:\s*([^;]+);', body).group(1).strip()
        style = re.search(r'font-style:\s*([^;]+);', body).group(1).strip()
        urange = (re.search(r'unicode-range:\s*([^;]+);', body) or [None, ''])[1].strip()
        tag = 's' + subset.strip('[]') if subset.startswith('[') else subset
        fname = f'{slug(family)}-{weight.replace(" ", "-")}-{tag}-{hashlib.sha1(url.encode()).hexdigest()[:6]}.woff2'
        files[fname] = url
        faces.append((family, style, weight, urange, f'{slug(family)}/{fname}'))
    for fname, url in files.items():
        p = os.path.join(d, fname)
        if not os.path.exists(p):
            with open(p, 'wb') as f:
                f.write(get(url, binary=True))
    lic = fetch_license(family)
    if lic['licenseText']:
        with open(os.path.join(d, lic['licenseFile']), 'w', encoding='utf-8', newline='\n') as f:
            f.write(lic['licenseText'])
    size = sum(os.path.getsize(os.path.join(d, f)) for f in files)
    return family, faces, {'family': family, 'weights': weights or '400', 'files': len(files), 'bytes': size,
                           'license': lic['license'], 'licenseFile': lic['licenseFile'], 'designer': lic['designer'],
                           'source': 'https://fonts.google.com/specimen/' + family.replace(' ', '+'), 'licenseSource': lic['source']}


def main():
    os.makedirs(OUT, exist_ok=True)
    results = {}
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(process, f): f for f in FAMILIES}
        for fu in cf.as_completed(futs):
            fam = futs[fu]
            try:
                results[fam] = fu.result()
                print('ok', fam, results[fam][2]['files'], results[fam][2]['license'], flush=True)
            except Exception as e:  # noqa
                print('FAILED', fam, e, flush=True)
                sys.exit(1)
    css = ['/* Self-hosted fonts. Generated by tools/fetch-fonts.py; licences are in each family folder and docs/fonts-licenses.md. */']
    manifest = []
    for fam in FAMILIES:
        _, faces, info = results[fam]
        manifest.append(info)
        for (family, style, weight, urange, path) in faces:
            css.append("@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:swap;src:url(%s) format('woff2');%s}" %
                       (family, style, weight, path, ('unicode-range:' + urange + ';') if urange else ''))
    with open(os.path.join(OUT, 'fonts.css'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(css) + '\n')
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
    total = sum(m['bytes'] for m in manifest)
    print('families', len(manifest), 'files', sum(m['files'] for m in manifest), 'MB', round(total / 1048576, 1))
    print('licenses:', sorted({m['license'] for m in manifest}))


if __name__ == '__main__':
    main()
