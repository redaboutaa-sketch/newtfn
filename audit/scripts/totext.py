"""HTML -> texte structuré (titres marqués #, liens [txt](href), images ![alt](src)). Ignore script/style/svg.
Usage: python3 -I totext.py file.html [--main]"""
import sys, re, html as H
from html.parser import HTMLParser

SKIP = {'script', 'style', 'svg', 'noscript', 'template'}
BLOCK = {'p', 'div', 'section', 'li', 'tr', 'br', 'ul', 'ol', 'article', 'header', 'footer', 'nav', 'table', 'form', 'details', 'summary', 'figure', 'figcaption', 'dt', 'dd', 'blockquote'}

class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.out = []; s.skip = 0; s.href = []
    def handle_starttag(s, t, a):
        a = dict(a)
        if t in SKIP: s.skip += 1; return
        if s.skip: return
        if re.fullmatch(r'h[1-6]', t): s.out.append('\n\n' + '#' * int(t[1]) + ' ')
        elif t in BLOCK: s.out.append('\n')
        if t == 'li': s.out.append('- ')
        if t == 'a': s.href.append(a.get('href', ''))
        if t == 'img':
            src = a.get('data-src') or a.get('data-lazy-src') or a.get('src') or ''
            if not src.startswith('data:'): s.out.append(' ![%s](%s) ' % (a.get('alt', ''), src))
        if t in ('input', 'textarea', 'select'):
            s.out.append(' [champ %s name=%s placeholder=%s] ' % (t, a.get('name'), a.get('placeholder')))
    def handle_endtag(s, t):
        if t in SKIP: s.skip = max(0, s.skip - 1); return
        if s.skip: return
        if t == 'a' and s.href:
            h = s.href.pop()
            if h and not h.startswith('#'): s.out.append(' <%s> ' % h)
        if re.fullmatch(r'h[1-6]', t) or t in BLOCK: s.out.append('\n')
    def handle_data(s, d):
        if not s.skip: s.out.append(d)

src = open(sys.argv[1], encoding='utf-8', errors='replace').read()
if '--main' in sys.argv:
    # retire header/footer du thème Pbmit si présents
    m = re.search(r'<div[^>]+id="content-wrapper"', src) or re.search(r'<main', src)
    if m: src = src[m.start():]
    m = re.search(r'<footer', src)
    if m: src = src[:m.start()]
p = P(); p.feed(src)
txt = ''.join(p.out)
txt = re.sub(r'[ \t\xa0]+', ' ', txt)
txt = re.sub(r' *\n *', '\n', txt)
txt = re.sub(r'\n{3,}', '\n\n', txt)
print(txt.strip())
