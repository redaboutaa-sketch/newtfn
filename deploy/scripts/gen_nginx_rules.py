"""Génère deploy/nginx/legacy-rules.inc depuis docs/mapping-redirections.csv (source unique).
- 301 directes (jamais de chaîne : chaque ancienne URL pointe vers sa destination finale) ;
- 410 pour les contenus supprimés avec justification ;
- motifs WordPress génériques (archives, flux, points techniques) en 410.
Usage : python3 -I deploy/scripts/gen_nginx_rules.py"""
import csv, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
rows = list(csv.DictReader(open(os.path.join(ROOT, 'docs/mapping-redirections.csv'))))
redirects, gone = {}, set()
kept = {r['ancienne_url'] for r in rows if r['code_http'] == '200'}

def variants(p):
    # WordPress acceptait les deux formes ; on couvre la variante sans/avec barre finale.
    if p.endswith('/') and p != '/':
        return [p, p[:-1]]
    if '.' not in p.rsplit('/', 1)[-1]:
        return [p, p + '/']
    return [p]

for r in rows:
    old, new, code = r['ancienne_url'], r['nouvelle_url'], r['code_http']
    if code == '301':
        for v in variants(old):
            if v not in kept: redirects[v] = new
    elif code == '410':
        for v in variants(old):
            if v not in kept: gone.add(v)

# Contrôle : aucune destination ne doit elle-même être redirigée ou supprimée (pas de chaîne ni boucle).
for src, dst in redirects.items():
    if dst in redirects or dst in gone:
        sys.exit(f'Chaîne ou boucle détectée : {src} -> {dst}')

def q(s):
    return '"' + s.replace('"', '\\"') + '"'

out = ['# Fichier généré par deploy/scripts/gen_nginx_rules.py — ne pas modifier à la main.',
       '# Source : docs/mapping-redirections.csv', '',
       'map $uri $tfn_redirect {', '    default "";']
out += [f'    {q(k)} {q(v)};' for k, v in sorted(redirects.items())]
out += ['}', '', 'map $uri $tfn_gone {', '    default 0;']
out += [f'    {q(k)} 1;' for k in sorted(gone)]
out += [
    '    # Motifs WordPress génériques (contenus de démonstration, archives, flux, technique).',
    '    "~^/[0-9]{4}/[0-9]{2}/" 1;',
    '    "~^/(category|tag|author|team-member|service-category)(/|$)" 1;',
    '    "~/feed/?$" 1;',
    '    "~^/(wp-admin|wp-includes|wp-json)(/|$)" 1;',
    '    "~^/wp-content/(themes|plugins|uploads/elementor|uploads/revslider/slider-demo-03)/" 1;',
    '    "~^/(wp-login\\.php|xmlrpc\\.php|wp-cron\\.php)$" 1;',
    '}', '']
open(os.path.join(ROOT, 'deploy/nginx/legacy-rules.inc'), 'w').write('\n'.join(out))
print(f'{len(redirects)} redirections, {len(gone)} suppressions explicites')
