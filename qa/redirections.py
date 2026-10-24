"""Vérifie docs/mapping-redirections.csv contre un environnement : code HTTP attendu, destination
exacte des 301 et destination finale en 200 (aucune chaîne, aucune boucle).
Usage : python3 -I qa/redirections.py http://127.0.0.1:8095 [mode]
mode=preprod tolère /sitemap.xml absent (publié uniquement en production)."""
import csv, os, sys, urllib.request, urllib.error
base = sys.argv[1].rstrip('/'); mode = sys.argv[2] if len(sys.argv) > 2 else 'preprod'
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class NoRedir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
op = urllib.request.build_opener(NoRedir)
def get(path):
    try:
        r = op.open(urllib.request.Request(base + path, method='GET'), timeout=15); return r.status, r.headers.get('Location')
    except urllib.error.HTTPError as e: return e.code, e.headers.get('Location')
ok = ko = 0
for row in csv.DictReader(open(os.path.join(root, 'docs/mapping-redirections.csv'))):
    old, new, code = row['ancienne_url'], row['nouvelle_url'], int(row['code_http'])
    st, loc = get(old); errs = []
    if st != code and not (mode == 'preprod' and old == '/sitemap.xml'): errs.append(f'statut {st} au lieu de {code}')
    if code == 301:
        if loc != new: errs.append(f'Location {loc} au lieu de {new}')
        st2, _ = get(new)
        if st2 != 200 and not (mode == 'preprod' and new == '/sitemap.xml'): errs.append(f'destination {new} -> {st2}')
    if errs: ko += 1; print('KO', old, '|', '; '.join(errs))
    else: ok += 1
print(f'{ok} conformes, {ko} non conformes')
sys.exit(1 if ko else 0)
