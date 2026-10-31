// Génère le logo « IA Tech Formation Nord » (SVG couleur + monochrome) dans public/img/logos/.
// Outil ponctuel : le texte est converti en tracés pour ne dépendre d'aucune police à l'affichage.
// Prérequis (hors dépendances du site) : npm i --no-save opentype.js@1.3.4 @fontsource/inter@5.2.8
// Usage : node scripts/logo-ia.mjs [dossier contenant node_modules]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const base = path.resolve(process.argv[2] || '.');
const require = createRequire(path.join(base, 'noop.js'));
const opentype = require('opentype.js');
const font = (w) => opentype.loadSync(path.join(base, `node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff`));
const f800 = font(800);
const f700 = font(700);

// Italique de construction, comme le « TFN » du logo principal.
const SKEW = Math.tan((12 * Math.PI) / 180);
function textPath(f, txt, x, y, size, tracking = 0) {
  let d = '';
  let cx = x;
  for (const ch of txt) {
    const g = f.charToGlyph(ch);
    const p = g.getPath(cx, y, size);
    for (const c of p.commands) {
      const t = (px, py) => `${(px + (y - py) * SKEW).toFixed(2)} ${py.toFixed(2)}`;
      if (c.type === 'M') d += `M${t(c.x, c.y)}`;
      else if (c.type === 'L') d += `L${t(c.x, c.y)}`;
      else if (c.type === 'Q') d += `Q${t(c.x1, c.y1)} ${t(c.x, c.y)}`;
      else if (c.type === 'C') d += `C${t(c.x1, c.y1)} ${t(c.x2, c.y2)} ${t(c.x, c.y)}`;
      else if (c.type === 'Z') d += 'Z';
    }
    cx += (g.advanceWidth / f.unitsPerEm) * size + tracking;
  }
  return { d, end: cx - tracking };
}

// Symbole : l'anneau ouvert du logo TFN, habité par un petit réseau de nœuds.
const cx = 66, cy = 68;
const arc = (r, a0, a1) => {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 1 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
const nodes = [[48, 50], [86, 46], [62, 86], [94, 82]];
const links = [[0, 1], [0, 2], [1, 3], [2, 3], [1, 2]];

const ia = textPath(f800, 'IA', 132, 90, 76, 2);
const tag = textPath(f700, 'TECH FORMATION NORD', 134, 120, 15.5, 1.6);
const W = Math.ceil(Math.max(ia.end, tag.end) + 8);

function svg({ ring, ringAccent, node, link, letters, tagline, title }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 136" width="${W}" height="136" role="img" aria-labelledby="t">
<title id="t">${title}</title>
<path d="${arc(56, -38, 38)}" fill="none" stroke="${ring}" stroke-width="9" stroke-linecap="round"/>
<path d="${arc(44, 150, 250).replace('1 0', '0 1')}" fill="none" stroke="${ringAccent}" stroke-width="6" stroke-linecap="round"/>
<g stroke="${link}" stroke-width="3.2" stroke-linecap="round">${links.map(([a, b]) => `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}"/>`).join('')}</g>
<g fill="${node}">${nodes.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 1 ? 8 : 6.5}"/>`).join('')}</g>
<path fill="${letters}" d="${ia.d}"/>
<path fill="${tagline}" d="${tag.d}"/>
</svg>
`;
}

const out = path.resolve('public/img/logos');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'ia-tech-formation-nord.svg'), svg({ ring: '#3D4856', ringAccent: '#1870B0', node: '#5B3FC4', link: '#1870B0', letters: '#5B3FC4', tagline: '#121A24', title: 'IA Tech Formation Nord' }));
fs.writeFileSync(path.join(out, 'ia-tech-formation-nord-mono.svg'), svg({ ring: 'currentColor', ringAccent: 'currentColor', node: 'currentColor', link: 'currentColor', letters: 'currentColor', tagline: 'currentColor', title: 'IA Tech Formation Nord' }));
console.log('Logo IA généré :', W, '× 136');
