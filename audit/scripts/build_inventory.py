"""Construit docs/inventaire-url.csv et docs/mapping-redirections.csv à partir de la collecte
(audit/index/tfn.json + URL techniques sondées). Usage : python3 -I audit/scripts/build_inventory.py
Chaque ancienne URL reçoit un sort explicite : conservée (200), redirigée (301) ou supprimée (410)."""
import csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
idx = json.load(open(os.path.join(ROOT, 'audit/index/tfn.json')))
date = idx['collected_at']
BASE = 'https://techformanord.fr'

# URL découvertes hors crawl : sondées manuellement le 2026-10-24 (curl) ou issues de l'API REST / médias.
EXTRA = [
    ('/contact', 301, 'redirection existante vers /contact-us/'),
    ('/sitemap.xml', 301, 'redirection existante vers /wp-sitemap.xml'),
    ('/wp-sitemap.xml', 200, 'index des sitemaps WordPress'),
    ('/wp-sitemap-posts-post-1.xml', 200, 'sitemap WordPress'),
    ('/wp-sitemap-posts-page-1.xml', 200, 'sitemap WordPress'),
    ('/wp-sitemap-posts-pbmit-service-1.xml', 200, 'sitemap WordPress'),
    ('/wp-sitemap-posts-pbmit-team-member-1.xml', 200, 'sitemap WordPress'),
    ('/wp-sitemap-taxonomies-category-1.xml', 200, 'sitemap WordPress'),
    ('/wp-sitemap-taxonomies-post_tag-1.xml', 200, 'sitemap WordPress'),
    ('/wp-sitemap-taxonomies-pbmit-service-category-1.xml', 200, 'sitemap WordPress'),
    ('/feed/', 200, 'flux RSS'), ('/comments/feed/', 200, 'flux RSS'), ('/service/feed/', 200, 'flux RSS'), ('/shop/feed/', 200, 'flux RSS'),
    ('/wp-login.php', 200, 'technique WordPress'), ('/xmlrpc.php', 503, 'technique WordPress'), ('/wp-admin/', 302, 'technique WordPress'),
    ('/wp-json/', 200, 'API REST WordPress'),
    ('/wp-content/uploads/2025/07/Site-scaled.jpg', 200, 'média : ancien certificat Qualinow'),
    ('/wp-content/uploads/2025/11/Capture-decran-2025-11-19-a-16.10.34.png', 200, 'média : ancien certificat Sphinx'),
    ('/wp-content/uploads/2026/06/Satisfaction-clients.png', 200, 'média : badge « Avis global 4,9/5 »'),
    ('/wp-content/uploads/2026/06/Satisfaction-clients-1.png', 200, 'média : badge « Avis global 4,9/5 »'),
    ('/wp-content/uploads/2025/09/Capture-decran-2025-09-08-a-16.02.21.png', 200, 'média : dates de sessions 2025'),
    ('/wp-content/uploads/2024/09/ACT_logotype_cartouche_rvb.png', 200, 'média : logo « les acteurs de la compétence »'),
    ('/wp-content/uploads/2026/06/2026-03-10-16-51.pdf', 200, 'document : certificat Qualiopi CCTA (PDF)'),
    ('/wp-content/uploads/2026/06/2026-03-10-16-51-scaled.jpg', 200, 'média : certificat Qualiopi CCTA (image)'),
    ('/wp-content/uploads/2025/07/plandacces.png', 200, 'document : plan d’accès'),
    ('/wp-content/uploads/2024/11/processe.jpg', 200, 'média : schéma parcours Aide carrossier'),
]

KEEP = {
    '/': 'Accueil refondu (portail des trois pôles).',
    '/services/': 'Catalogue des formations : devient le catalogue global des trois pôles.',
    '/service/maintenance/': 'Fiche Maintenance (5 modules) : contenu pédagogique intégralement repris.',
    '/service/wheels-alignment/': 'Fiche Commerce (2 modules) : slug hérité du thème mais URL indexée et liée depuis 82 pages ; conservée.',
    '/service/interior-cleaning/': 'Fiche Carrosserie peinture (12 modules) : slug hérité du thème mais URL indexée ; conservée.',
    '/about-us/': 'Page « À propos » devenue « Notre organisme ».',
    '/contact-us/': 'Page contact (formulaire, coordonnées).',
    '/infinite-grid-col-2/': 'Page « Reconversion » (menu principal, 82 liens internes) : slug hérité du thème, conservée.',
    '/m-grid-col-3/': 'Parcours Mécanicien service rapide : contenu repris.',
    '/m-grid-col-2/': 'Parcours Aide carrossier : contenu repris.',
}
REDIRECT = {
    '/reconvention/': ('/infinite-grid-col-2/', 'Doublon de la page Reconversion (texte repris d’un tiers, mention GNFA).'),
    '/service/': ('/services/', 'Archive automatique des « services » du thème ; équivalent : catalogue des formations.'),
    '/contact': ('/contact-us/', 'Redirection existante maintenue, directe.'),
    '/wp-sitemap.xml': ('/sitemap.xml', 'Sitemap WordPress remplacé par le sitemap du nouveau site.'),
    '/wp-content/uploads/2026/06/2026-03-10-16-51-scaled.jpg': ('/documents/certificat-qualiopi-tech-formation-nord.pdf', 'Image du certificat en vigueur : renvoi vers le PDF officiel du certificat.'),
}
for k in ['/wp-sitemap-posts-post-1.xml', '/wp-sitemap-posts-page-1.xml', '/wp-sitemap-posts-pbmit-service-1.xml',
          '/wp-sitemap-posts-pbmit-team-member-1.xml', '/wp-sitemap-taxonomies-category-1.xml',
          '/wp-sitemap-taxonomies-post_tag-1.xml', '/wp-sitemap-taxonomies-pbmit-service-category-1.xml']:
    REDIRECT[k] = ('/sitemap.xml', 'Sous-sitemap WordPress remplacé par le sitemap unique du nouveau site.')

# Fichiers conservés à l'identique (servis depuis site/public/wp-content/...).
def asset_kept(path):
    return os.path.exists(os.path.join(ROOT, 'site/public', path.lstrip('/')))

def classify(path, title):
    """Retourne (catégorie, sort, destination, code, justification)."""
    if path in KEEP:
        return 'contenu réel', 'conservée', path, 200, KEEP[path]
    if path in REDIRECT:
        d, j = REDIRECT[path]
        return 'contenu réel' if not path.endswith('.xml') else 'technique', 'redirigée', d, 301, j
    if path == '/sitemap.xml':
        return 'technique', 'conservée', path, 200, 'Sitemap XML généré par le nouveau site (production uniquement).'
    if path.startswith('/wp-content/'):
        if asset_kept(path):
            return 'média', 'conservée', path, 200, 'Fichier utile conservé au même chemin.'
        return 'média', 'supprimée', '', 410, 'Média non repris : ' + {
            'Site-scaled': 'certificat Qualinow remplacé par le certificat CCTA en vigueur.',
            'Capture-decran-2025-11-19': 'certificat Sphinx remplacé par le certificat CCTA en vigueur.',
            'Satisfaction-clients': 'note « 4,9/5 » sans source vérifiable.',
            'Capture-decran-2025-09-08': 'dates de sessions 2025 échues.',
            'ACT_logotype': 'adhésion « les acteurs de la compétence » non justifiée.',
        }.get(next((k for k in ['Site-scaled', 'Capture-decran-2025-11-19', 'Satisfaction-clients', 'Capture-decran-2025-09-08', 'ACT_logotype'] if k in path), ''), 'fichier du thème de démonstration.')
    if re.match(r'^/\d{4}/\d{2}/\d{2}/', path):
        return 'démo thème', 'supprimée', '', 410, 'Article de démonstration du thème (anglais, sans rapport avec l’organisme) ; aucun équivalent pertinent.'
    if path.startswith('/team-member/') or path == '/our-team/':
        return 'démo thème', 'supprimée', '', 410, 'Équipe fictive du thème (noms, coordonnées factices) : ne doit plus être publiée.'
    if path.startswith(('/category/', '/tag/', '/service-category/', '/author/')):
        return 'démo thème', 'supprimée', '', 410, 'Archive de taxonomie du thème (libellés sans rapport) ; aucun équivalent pertinent.'
    if path.endswith('/feed/'):
        return 'technique', 'supprimée', '', 410, 'Flux RSS WordPress sans contenu éditorial utile.'
    if path.startswith(('/wp-', '/xmlrpc.php')):
        return 'technique', 'supprimée', '', 410, 'Point d’entrée technique WordPress ; plus de CMS WordPress.'
    if path in ('/shop/', '/cart/', '/checkout/', '/my-account/'):
        return 'démo thème', 'supprimée', '', 410, 'Page WooCommerce vide (aucune vente en ligne).'
    if path in ('/faq/', '/our-plans/', '/element/', '/homepage-01/', '/homepage-02/', '/page-d-exemple/', '/blog-classic/') or re.match(r'^/(blog-|sortable-|infinite-grid-|grid-col|m-grid)', path):
        return 'démo thème', 'supprimée', '', 410, f'Page de démonstration du thème ({title or "sans titre"}) : lorem ipsum ou modèle vide ; aucun équivalent pertinent.'
    return 'à classer', 'à décider', '', '', ''

rows = {}
for p in idx['pages']:
    path = p['url'].replace(BASE, '') or '/'
    if path == '': path = '/'
    if p['url'] == BASE:  # variante sans barre finale
        continue
    title = re.sub(r'\s*&#8211;\s*Tech Formation Nord.*$', '', p.get('title', '')).replace('&#8211;', '–')
    rows[path] = dict(url=BASE + path, statut=p['status'], sitemap='oui' if p['in_sitemap'] else 'non', liens=p.get('inlinks', 0),
                      titre=title, description=p.get('description', ''), canonical=p.get('canonical', ''), h1=' | '.join(p.get('h1', []))[:150],
                      decouverte='sitemap+crawl' if p['in_sitemap'] else 'crawl')
for path, st, note in EXTRA:
    rows.setdefault(path, dict(url=BASE + path, statut=st, sitemap='non', liens='', titre=note, description='', canonical='', h1='', decouverte='sondage/API'))

# Médias et documents référencés par les pages (img src/srcset, liens vers fichiers).
for a in idx['assets']:
    if not a.startswith(BASE + '/wp-content/uploads/'):
        continue
    path = a.replace(BASE, '').split('?')[0]
    rows.setdefault(path, dict(url=BASE + path, statut='', sitemap='non', liens='', titre='média référencé par une page', description='', canonical='', h1='', decouverte='référence HTML'))
real_assets = os.path.join(ROOT, 'audit/index/tfn-medias-references.txt')
if os.path.exists(real_assets):
    for a in open(real_assets).read().split():
        path = a.replace(BASE, '')
        if '/elementor/css/' in path: continue
        rows.setdefault(path, dict(url=BASE + path, statut='', sitemap='non', liens='', titre='média référencé par une page (srcset)', description='', canonical='', h1='', decouverte='référence HTML'))

out = []
for path in sorted(rows, key=lambda x: (0 if x in KEEP else 1, x)):
    r = rows[path]
    cat, sort, dest, code, just = classify(path, r['titre'])
    r.update(chemin=path, categorie=cat, sort=sort, destination=dest, code=code, justification=just)
    out.append(r)

unclassified = [r['chemin'] for r in out if r['sort'] == 'à décider']
if unclassified:
    print('URL non classées :', unclassified); sys.exit(1)

cols = ['url', 'chemin', 'decouverte', 'statut', 'sitemap', 'liens', 'titre', 'h1', 'description', 'canonical', 'categorie', 'sort', 'destination', 'code', 'justification']
with open(os.path.join(ROOT, 'docs/inventaire-url.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore'); w.writeheader(); w.writerows(out)
with open(os.path.join(ROOT, 'docs/mapping-redirections.csv'), 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['ancienne_url', 'nouvelle_url', 'traitement', 'code_http', 'justification'])
    for r in out:
        w.writerow([r['chemin'], r['destination'], {'conservée': 'conservation', 'redirigée': 'redirection', 'supprimée': 'suppression'}[r['sort']], r['code'], r['justification']])
print(len(out), 'URL —', {s: sum(1 for r in out if r['sort'] == s) for s in ('conservée', 'redirigée', 'supprimée')}, '— collecte', date)
