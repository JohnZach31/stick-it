#!/usr/bin/env python3
"""Builds legal/privacy.html, legal/terms.html and legal/copyright.html from the Markdown drafts in docs/legal/.

  python tools/build-legal.py

The drafts are the single source of truth. Placeholders written as [OWNER INPUT REQUIRED: ...] or [LEGAL REVIEW ...]
are rendered as highlighted <mark class="todo"> and are filled from js/legal-config.js by legal/legal.js when the owner
has provided the value. The pages carry a visible DRAFT banner until the configuration is complete.
"""
import html
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# (markdown source, html name, title en, title he, page id)
PAGES = [
    ('privacy-policy-draft.md', 'privacy.html', 'Privacy Policy', 'מדיניות פרטיות', 'privacy'),
    ('terms-draft.md', 'terms.html', 'Terms of Service', 'תנאי שימוש', 'terms'),
    ('copyright-page-draft.md', 'copyright.html', 'Copyright / DMCA', 'זכויות יוצרים', 'copyright'),
    ('young-people-draft.md', 'young-people.html', 'Young people and parents', 'צעירים והורים', 'young'),
    ('storage-notice-draft.md', 'storage.html', 'Storage notice', 'הודעת אחסון', 'storage'),
    ('accessibility-statement-draft.md', 'accessibility.html', 'Accessibility statement', 'הצהרת נגישות', 'accessibility'),
]
LANGS = {
    'en': dict(dir='ltr', folder='', src='', up='../', other='he', otherLabel='עברית', draft='draft', skip='Skip to the text',
               nav=[('privacy', 'Privacy'), ('terms', 'Terms'), ('copyright', 'Copyright / DMCA'), ('young', 'Young people'), ('storage', 'Storage'), ('accessibility', 'Accessibility')],
               back='Back to Stick-It', navlabel='Legal'),
    'he': dict(dir='rtl', folder='he/', src='he/', up='../../', other='en', otherLabel='English', draft='טיוטה', skip='דלג לטקסט',
               nav=[('privacy', 'פרטיות'), ('terms', 'תנאים'), ('copyright', 'זכויות יוצרים'), ('young', 'צעירים'), ('storage', 'אחסון'), ('accessibility', 'נגישות')],
               back='חזרה ל-Stick-It', navlabel='משפטי'),
}
FILES = {k: v[1] for k, v in ((p[4], p) for p in PAGES)}
CSP = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"


def _config_email(key):
    t = open(os.path.join(ROOT, 'js', 'legal-config.js'), encoding='utf-8').read()
    m = re.search(key + r':\s*"([^"]+@[^"]+)"', t)
    return m.group(1) if m else None


# contact placeholders are filled from js/legal-config.js (the single source); anything not configured stays a visible placeholder
EMAIL_SUBS = []
for key, names in (('supportEmail', ['support e-mail', 'דוא"ל תמיכה', 'דוא"ל נגישות / תמיכה', 'accessibility / support e-mail']),
                   ('privacyEmail', ['privacy e-mail', 'security contact', 'דוא"ל פרטיות', 'איש קשר לאבטחה']),
                   ('copyrightEmail', ['copyright e-mail', 'דוא"ל זכויות יוצרים'])):
    addr = _config_email(key)
    if addr:
        for n in names:
            EMAIL_SUBS.append((re.compile(r'\[(?:OWNER INPUT REQUIRED|נדרש מידע מהבעלים): ' + re.escape(n) + r'\]'), '[%s](mailto:%s)' % (addr, addr)))


def fill_contacts(md):
    for rx, rep in EMAIL_SUBS:
        md = rx.sub(rep, md)
    return md


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\[((?:OWNER INPUT REQUIRED|LEGAL REVIEW|PUBLIC POSTAL ADDRESS|נדרש מידע מהבעלים|מומלץ סקירה משפטית|כתובת דואר ציבורית)[^\]]*)\]', lambda m: '<mark class="todo">[' + m.group(1) + ']</mark>', t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*([^*\s][^*]*)\*(?![\w*])', r'<em>\1</em>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="%s">%s</a>' % (m.group(2), m.group(1)), t)
    return t


def brandize(h):
    """Every plain-text 'Stick-It' gets one restrained treatment (semibold, never underlined: underline means a link)."""
    parts = re.split(r'(<[^>]+>)', h)
    depth = 0
    out = []
    for part in parts:
        if part.startswith('<'):
            if re.match(r'<(code|pre|a)', part): depth += 1
            elif re.match(r'</(code|pre|a)>', part): depth = max(0, depth - 1)
            out.append(part)
        else:
            out.append(part if depth else re.sub(r'(?<![A-Za-z0-9_/.])Stick-It(?![A-Za-z0-9_-])', '<span class="bw">Stick-It</span>', part))
    return ''.join(out)


def convert(md):
    return brandize(convert_raw(md))


def convert_raw(md):
    out, lines, i = [], md.split('\n'), 0
    para = []

    def flush():
        if para:
            out.append('<p>' + inline(' '.join(para)) + '</p>')
            para.clear()
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            flush(); i += 1; continue
        if ln.startswith('```'):
            flush(); i += 1; buf = []
            while i < len(lines) and not lines[i].startswith('```'):
                buf.append(lines[i]); i += 1
            out.append('<pre><code>' + html.escape('\n'.join(buf)) + '</code></pre>'); i += 1; continue
        m = re.match(r'^(#{1,4})\s+(.*)$', ln)
        if m:
            flush(); n = len(m.group(1))
            out.append('<h%d>%s</h%d>' % (n, inline(m.group(2)), n)); i += 1; continue
        if ln.startswith('> '):
            flush(); buf = []
            while i < len(lines) and lines[i].startswith('>'):
                buf.append(lines[i].lstrip('> ').strip()); i += 1
            out.append('<blockquote class="draftNote"><p>' + inline(' '.join(buf)) + '</p></blockquote>'); continue
        if ln.startswith('|'):
            flush(); rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')]); i += 1
            head, body = rows[0], [r for r in rows[2:]] if len(rows) > 1 and set(''.join(rows[1])) <= set('-: ') else rows[1:]
            t = '<div class="tableWrap"><table>'
            if any(h for h in head):
                t += '<thead><tr>' + ''.join('<th scope="col">%s</th>' % inline(h) for h in head) + '</tr></thead>'
            t += '<tbody>' + ''.join('<tr>' + ''.join(('<th scope="row">%s</th>' if j == 0 and not any(head) else '<td>%s</td>') % inline(c) for j, c in enumerate(r)) + '</tr>' for r in body) + '</tbody></table></div>'
            out.append(t); continue
        if re.match(r'^\s*[-*]\s+', ln):
            flush(); items = []
            while i < len(lines) and re.match(r'^\s*[-*]\s+', lines[i]):
                items.append(re.sub(r'^\s*[-*]\s+', '', lines[i])); i += 1
            out.append('<ul>' + ''.join('<li>%s</li>' % inline(x) for x in items) + '</ul>'); continue
        if re.match(r'^\s*\d+\.\s+', ln):
            flush(); items = []
            while i < len(lines) and re.match(r'^\s*\d+\.\s+', lines[i]):
                items.append(re.sub(r'^\s*\d+\.\s+', '', lines[i])); i += 1
            out.append('<ol>' + ''.join('<li>%s</li>' % inline(x) for x in items) + '</ol>'); continue
        para.append(ln.strip()); i += 1
    flush()
    return '\n'.join(out)


TEMPLATE = '''<!DOCTYPE html>
<html lang="{lang}" dir="{dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="robots" content="noindex">
<title>{title} ({draft}) · Stick-It</title>
<link rel="stylesheet" href="{up}assets/fonts/fonts.css">
<link rel="stylesheet" href="{cssup}legal.css">
<script src="{up}js/a11y.js"></script>
</head>
<body data-page="{page}" data-lang="{lang}">
<a class="skip" href="#main">{skip}</a>
<header class="top"><div class="topMain"><a href="{up}index.html" class="brand">Stick-It</a><span class="topTitle">{navlabel}</span></div>
<nav aria-label="{navlabel}">{nav} <a class="langSwitch" href="{otherHref}" hreflang="{other}" lang="{other}">{otherLabel}</a></nav></header>
<div id="draftBanner" class="draftBanner" role="note" hidden></div>
<main id="main">
<article>
{body}
</article>
{extra}
</main>
<footer class="foot"><a href="{up}index.html">{back}</a></footer>
<script src="{up}js/config.js"></script>
<script src="{up}js/lang.js"></script>
<script src="{up}js/legal-config.js"></script>
<script src="{up}js/legal-fill.js"></script>
<script src="{cssup}legal.js"></script>
<script src="{cssup}legal-ui.js"></script>
</body>
</html>
'''

FORM = '''<section id="copyrightForm" hidden aria-labelledby="cfH">
<h2 id="cfH">Submit a copyright notice</h2>
<form id="cfForm" novalidate>
<p><label for="cfName">Your full name</label><input id="cfName" name="name" autocomplete="name" required></p>
<p><label for="cfEmail">E-mail</label><input id="cfEmail" name="email" type="email" autocomplete="email" required></p>
<p><label for="cfAddr">Postal address (optional)</label><input id="cfAddr" name="address" autocomplete="street-address"></p>
<p><label for="cfWork">The work you say was copied</label><textarea id="cfWork" name="work" rows="3" required></textarea></p>
<p><label for="cfUrl">Where it is on Stick-It (the share link address)</label><input id="cfUrl" name="url" required></p>
<p class="check"><input id="cfGood" type="checkbox"><label for="cfGood">I have a good-faith belief that this use is not authorised by the copyright owner, its agent, or the law.</label></p>
<p class="check"><input id="cfAcc" type="checkbox"><label for="cfAcc">The information in this notice is accurate, and under penalty of perjury I am the owner of, or authorised to act for the owner of, the copyright.</label></p>
<p><label for="cfSig">Signature (type your full name)</label><input id="cfSig" name="signature" required></p>
<p><button type="submit" id="cfGo">Send notice</button></p>
<p id="cfMsg" role="status"></p>
</form>
</section>'''

DOCS = {}          # the same converted bodies, for the in-app reader (js/legal-content.js)

for lang, L in LANGS.items():
    for src, dst, title_en, title_he, page in PAGES:
        md = open(os.path.join(ROOT, 'docs', 'legal', L['src'] + src), encoding='utf-8').read().replace('\r\n', '\n')
        body = convert(fill_contacts(md))
        DOCS.setdefault(lang, {})[page] = {'title': title_en if lang == 'en' else title_he, 'file': dst, 'html': body}
        extra = FORM if (page == 'copyright' and lang == 'en') else ''
        nav = ' '.join('<a href="%s" data-tab="%d"%s>%s</a>' % (FILES[pid], i % 5, ' aria-current="page"' if pid == page else '', label) for i, (pid, label) in enumerate(L['nav']))
        out = TEMPLATE.format(csp=CSP, title=title_en if lang == 'en' else title_he, page=page, body=body, extra=extra, lang=lang, dir=L['dir'],
                              up=L['up'] if lang == 'he' else '../', cssup='../' if lang == 'he' else '', draft=L['draft'], skip=L['skip'], navlabel=L['navlabel'],
                              nav=nav, other=L['other'], otherLabel=L['otherLabel'], back=L['back'],
                              otherHref=('he/' + dst) if lang == 'en' else ('../' + dst))
        folder = os.path.join(ROOT, 'legal', L['folder'])
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, dst), 'w', encoding='utf-8', newline='\n') as f:
            f.write(out)
        print('wrote legal/' + L['folder'] + dst, len(out))


# One source, two outputs: the standalone pages above and this file are both generated from the Markdown drafts, so the in-app reader can never drift.
import json
header = ("/* GENERATED by tools/build-legal.py from docs/legal/*.md (and he/). Do not edit by hand.\n"
          " * The in-app Legal reader renders exactly these bodies; the standalone pages in legal/ are built from the same text. */\n")
order = [p[4] for p in PAGES]
payload = {'order': order, 'docs': DOCS}
with open(os.path.join(ROOT, 'js', 'legal-content.js'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(header + "(function (root) { var Stick = root.Stick = root.Stick || {}; Stick.legalContent = " + json.dumps(payload, ensure_ascii=False) + "; })(typeof window !== 'undefined' ? window : globalThis);\n")
print('wrote js/legal-content.js')
