// Prépare les médias de la direction artistique (à relancer seulement si les recadrages changent) :
// - télécharge les originaux haute définition dans .cache/ (non versionné) ;
// - produit des recadrages AVIF/WebP responsives dans public/img/photos/ + manifeste src/data/photos.json ;
// - copie les polices variables (sous-ensemble latin, OFL) dans public/fonts/.
// Usage : node scripts/prepare-media.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const CACHE = '.cache/photos';
const OUT = 'public/img/photos';
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// Sources : images déjà publiées par l'organisme (ancien site) ou par Maison Beauxlieux.
// Les visuels Maison Beauxlieux sont générés par IA : seules des natures mortes d'outils sont
// utilisées, jamais comme représentation des locaux ou des activités (docs/direction-artistique.md).
const SOURCES = {
  cle: 'https://techformanord.fr/wp-content/uploads/2024/09/hands-car-mechanic-with-wrench-garage.jpg',
  peinture: 'https://techformanord.fr/wp-content/uploads/2024/09/man-painting-car-door-side-view.jpg',
  showroom: 'https://techformanord.fr/wp-content/uploads/2024/09/stylish-elegant-woman-car-salon.jpg',
  ongles: 'https://maisonbeauxlieux.com/images/section-studio.webp',
};

// Recadrages : région en fractions de l'original [gauche, haut, largeur, hauteur] + largeurs produites.
const CROPS = [
  { id: 'auto-cle-portrait', src: 'cle', region: [0.18, 0, 0.54, 1], widths: [420, 720, 1000], alt: 'Main gantée tenant une clé plate, dans un atelier automobile' },
  { id: 'auto-cle-paysage', src: 'cle', region: [0, 0.12, 1, 0.86], widths: [640, 1100, 1600], alt: 'Mécanicien tenant une clé plate dans un atelier automobile' },
  { id: 'auto-peinture-portrait', src: 'peinture', region: [0.16, 0.05, 0.5, 0.95], widths: [420, 720, 1000], alt: 'Pistolet de peinture en action au-dessus d’un élément de carrosserie' },
  { id: 'auto-peinture-paysage', src: 'peinture', region: [0, 0.08, 1, 0.84], widths: [640, 1100, 1600], alt: 'Application de peinture au pistolet sur un élément de carrosserie' },
  { id: 'auto-showroom-paysage', src: 'showroom', region: [0, 0, 1, 1], widths: [640, 1100, 1600], alt: 'Vente d’un véhicule dans un showroom automobile' },
  { id: 'beaute-ongles', src: 'ongles', region: [0.2, 0.36, 0.62, 0.64], widths: [420, 720, 870], alt: 'Outils de manucure et flacons de vernis disposés sur une table' },
];

async function original(key) {
  const url = SOURCES[key];
  const file = path.join(CACHE, key + path.extname(new URL(url).pathname));
  if (!fs.existsSync(file)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} : ${r.status}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return file;
}

const manifest = {};
for (const c of CROPS) {
  const file = await original(c.src);
  const meta = await sharp(file).metadata();
  const [l, t, w, h] = c.region;
  const region = { left: Math.round(l * meta.width), top: Math.round(t * meta.height), width: Math.round(w * meta.width), height: Math.round(h * meta.height) };
  const widths = c.widths.filter((x) => x <= region.width);
  for (const width of widths) {
    const base = sharp(file).extract(region).resize({ width }).modulate({ saturation: 0.92 });
    await base.clone().avif({ quality: 52, effort: 6 }).toFile(`${OUT}/${c.id}-${width}.avif`);
    await base.clone().webp({ quality: 74 }).toFile(`${OUT}/${c.id}-${width}.webp`);
  }
  manifest[c.id] = { alt: c.alt, widths, ratio: +(region.width / region.height).toFixed(4), width: widths.at(-1), height: Math.round(widths.at(-1) * region.height / region.width), source: SOURCES[c.src] };
  console.log(c.id, widths.join('/'), manifest[c.id].ratio);
}
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/photos.json', JSON.stringify(manifest, null, 1) + '\n');

fs.mkdirSync('public/fonts', { recursive: true });
fs.copyFileSync('node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2', 'public/fonts/bricolage-grotesque-latin.woff2');
fs.copyFileSync('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'public/fonts/inter-latin.woff2');
console.log('polices copiées');
