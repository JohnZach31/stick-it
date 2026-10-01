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
PAGES = [
    ('privacy-policy-draft.md', 'privacy.html', 'Privacy Policy', 'privacy'),
    ('terms-draft.md', 'terms.html', 'Terms of Service', 'terms'),
    ('copyright-page-draft.md', 'copyright.html', 'Copyright / DMCA', 'copyright'),
]
CSP = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\[((?:OWNER INPUT REQUIRED|LEGAL REVIEW)[^\]]*)\]', lambda m: '<mark class="todo">[' + m.group(1) + ']</mark>', t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*([^*\s][^*]*)\*(?![\w*])', r'<em>\1</em>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: '<a href="%s">%s</a>' % (m.group(2), m.group(1)), t)
    return t


def convert(md):
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
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="robots" content="noindex">
<title>{title} (draft) · Stick-It</title>
<link rel="stylesheet" href="../assets/fonts/fonts.css">
<link rel="stylesheet" href="legal.css">
</head>
<body data-page="{page}">
<a class="skip" href="#main">Skip to the text</a>
<header class="top"><a href="../index.html" class="brand">Stick-It</a>
<nav aria-label="Legal"><a href="privacy.html">Privacy</a> <a href="terms.html">Terms</a> <a href="copyright.html">Copyright / DMCA</a></nav></header>
<div id="draftBanner" class="draftBanner" role="note" hidden></div>
<main id="main">
<article>
{body}
</article>
{extra}
</main>
<footer class="foot"><a href="../index.html">Back to Stick-It</a></footer>
<script src="../js/config.js"></script>
<script src="../js/legal-config.js"></script>
<script src="legal.js"></script>
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

for src, dst, title, page in PAGES:
    md = open(os.path.join(ROOT, 'docs', 'legal', src), encoding='utf-8').read().replace('\r\n', '\n')
    body = convert(md)
    extra = FORM if page == 'copyright' else ''
    out = TEMPLATE.format(csp=CSP, title=title, page=page, body=body, extra=extra)
    os.makedirs(os.path.join(ROOT, 'legal'), exist_ok=True)
    with open(os.path.join(ROOT, 'legal', dst), 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)
    print('wrote legal/' + dst, len(out))
