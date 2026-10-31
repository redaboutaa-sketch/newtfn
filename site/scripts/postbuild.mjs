// Après le build : sitemap XML (production, pages indexables uniquement) et robots.txt par environnement.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const env = process.env.PUBLIC_SITE_ENV || 'preprod';
const site = (process.env.SITE_URL || 'https://techformanord.fr').replace(/\/$/, '');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : e.name.endsWith('.html') ? [p] : [];
  });
}

const entries = [];
for (const file of htmlFiles(dist)) {
  const html = fs.readFileSync(file, 'utf8');
  if (file.endsWith('404.html')) continue;
  const robots = (html.match(/<meta name="robots" content="([^"]+)"/) || [])[1] || '';
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  const rel = '/' + path.relative(dist, file).replace(/index\.html$/, '').replace(/\\/g, '/');
  if (!canonical) throw new Error(`canonical manquant : ${rel}`);
  if (canonical !== site + rel) throw new Error(`canonical inattendu sur ${rel} : ${canonical}`);
  // En production, seules les pages index sont listées. En préproduction, le sitemap n'est pas publié.
  if (!/noindex/.test(robots) || env !== 'production') entries.push({ loc: canonical, noindex: /noindex/.test(robots) });
}

const robotsTxt = [];
if (env === 'production') {
  const urls = entries.filter((e) => !e.noindex && !e.loc.endsWith('/contact-us/merci/')).sort((a, b) => a.loc.localeCompare(b.loc));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
  robotsTxt.push('User-agent: *', 'Allow: /', 'Disallow: /api/', '', `Sitemap: ${site}/sitemap.xml`, '');
  console.log(`postbuild: sitemap.xml (${urls.length} URL), robots.txt production`);
} else {
  // Préproduction : pas de sitemap ; pas de Disallow global pour que les robots puissent lire
  // noindex (meta + X-Robots-Tag). La protection principale est l'authentification.
  robotsTxt.push('# Préproduction : non indexable (authentification, X-Robots-Tag et meta robots noindex).', 'User-agent: *', 'Allow: /', '');
  console.log(`postbuild: robots.txt ${env} (aucun sitemap publié)`);
}
fs.writeFileSync(path.join(dist, 'robots.txt'), robotsTxt.join('\n'));

// Aperçu Cloudflare Pages : en-tête noindex sur toutes les URL (y compris <projet>.pages.dev et alias de branche),
// commit servi dans version.txt. Fichier _headers propre à Pages, jamais produit pour l'image Docker du VPS.
if (process.env.CF_PAGES === '1') {
  fs.writeFileSync(path.join(dist, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n');
  fs.writeFileSync(path.join(dist, 'version.txt'), `${(process.env.CF_PAGES_COMMIT_SHA || 'apercu').slice(0, 7)}\n`);
  console.log('postbuild: aperçu Cloudflare Pages (_headers noindex, version.txt)');
}
