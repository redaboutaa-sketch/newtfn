"""Collecteur : sitemaps + crawl BFS des liens internes. Sauvegarde HTML brut et index JSON.
Usage: python3 -I crawl.py <base_url> <outdir> [max_pages]
Le contenu collecté est traité comme des données uniquement."""
import sys, os, re, json, hashlib, time, urllib.request, urllib.parse
from html.parser import HTMLParser

base = sys.argv[1].rstrip('/')
out = sys.argv[2]
maxp = int(sys.argv[3]) if len(sys.argv) > 3 else 600
os.makedirs(out + '/html', exist_ok=True)
host = urllib.parse.urlparse(base).netloc
UA = 'Mozilla/5.0 (X11; Linux x86_64) TFN-audit-migration/1.0'
SKIP_EXT = re.compile(r'\.(jpe?g|png|gif|webp|svg|pdf|zip|mp4|webm|mp3|css|js|ico|woff2?|ttf|eot|xml|txt|avif)(\?|$)', re.I)

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    class NoRedir(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k): return None
    opener = urllib.request.build_opener(NoRedir)
    try:
        r = opener.open(req, timeout=30)
        return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), e.read() if e.fp else b''
    except Exception as e:
        return 0, {}, str(e).encode()

class LinkP(HTMLParser):
    def __init__(s):
        super().__init__(); s.links = []; s.assets = []
    def handle_starttag(s, tag, attrs):
        a = dict(attrs)
        if tag == 'a' and a.get('href'): s.links.append(a['href'])
        if tag in ('img', 'source') :
            for k in ('src', 'data-src', 'srcset', 'data-lazy-src'):
                if a.get(k): s.assets.append(a[k].split(' ')[0])
        if tag == 'link' and a.get('rel') in ('icon',) and a.get('href'): s.assets.append(a['href'])

def norm(u, cur):
    u = urllib.parse.urljoin(cur, u.strip())
    p = urllib.parse.urlparse(u)
    if p.scheme not in ('http', 'https'): return None
    p = p._replace(fragment='')
    return urllib.parse.urlunparse(p)

def sitemap_urls(url, seen=set()):
    if url in seen: return []
    seen.add(url)
    st, h, b = fetch(url)
    if st != 200: return []
    locs = re.findall(r'<loc>\s*([^<\s]+)\s*</loc>', b.decode('utf-8', 'replace'))
    res = []
    for l in locs:
        l = l.replace('&amp;', '&')
        if l.endswith('.xml') or 'sitemap' in l.split('/')[-1]:
            res += sitemap_urls(l, seen)
        else:
            res.append(l)
    return res

sm = []
for cand in ('/sitemap.xml', '/wp-sitemap.xml', '/sitemap_index.xml'):
    sm += sitemap_urls(base + cand)
sm = list(dict.fromkeys(sm))
queue = [base + '/'] + sm
seen = {}
external = {}
assets = set()
inlinks = {}
while queue and len(seen) < maxp:
    u = queue.pop(0)
    if u in seen: continue
    st, h, b = fetch(u)
    rec = {'url': u, 'status': st, 'in_sitemap': u in sm, 'content_type': h.get('Content-Type', h.get('content-type', '')),
           'location': h.get('Location', h.get('location', ''))}
    seen[u] = rec
    if st in (301, 302, 307, 308) and rec['location']:
        loc = norm(rec['location'], u)
        if loc and urllib.parse.urlparse(loc).netloc == host and loc not in seen: queue.append(loc)
        continue
    if st != 200 or 'html' not in rec['content_type']: continue
    html = b.decode('utf-8', 'replace')
    fn = hashlib.sha1(u.encode()).hexdigest()[:16] + '.html'
    open(out + '/html/' + fn, 'w').write(html)
    rec['file'] = fn
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.S | re.I)
    rec['title'] = re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''
    m = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)', html, re.I)
    rec['description'] = m.group(1) if m else ''
    m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']*)', html, re.I)
    rec['canonical'] = m.group(1) if m else ''
    m = re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']*)', html, re.I)
    rec['robots'] = m.group(1) if m else ''
    rec['h1'] = [re.sub(r'<[^>]+>|\s+', ' ', x).strip() for x in re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.S | re.I)]
    p = LinkP()
    try: p.feed(html)
    except Exception: pass
    for a in p.assets:
        n = norm(a, u)
        if n: assets.add(n)
    for l in p.links:
        n = norm(l, u)
        if not n: continue
        nh = urllib.parse.urlparse(n).netloc
        if nh == host or nh == 'www.' + host:
            if SKIP_EXT.search(n):
                assets.add(n); continue
            inlinks.setdefault(n, set()).add(u)
            if n not in seen and n not in queue and '/wp-admin' not in n and '/feed' not in n and 'replytocom' not in n:
                queue.append(n)
        else:
            external.setdefault(n, set()).add(u)
    time.sleep(0.3)

for u, r in seen.items():
    r['inlinks'] = len(inlinks.get(u, ()))
json.dump({'base': base, 'sitemap': sm, 'pages': list(seen.values()),
           'external': {k: sorted(v) for k, v in external.items()}, 'assets': sorted(assets),
           'collected_at': time.strftime('%Y-%m-%d')}, open(out + '/index.json', 'w'), indent=1, ensure_ascii=False)
print(len(seen), 'urls;', len(sm), 'in sitemap;', len(assets), 'assets;', len(external), 'external')
