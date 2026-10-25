// Génère les trois illustrations isométriques du portail (src/assets/sketches/*.svg).
// Une seule projection, une seule pièce, un seul trait : les scènes ne diffèrent que par leur mobilier
// et leur teinte d'accent. Les classes « sk-* » servent aux animations (src/styles/global.css).
// Usage : node scripts/sketches.mjs
import fs from 'node:fs';
import path from 'node:path';

const S = 21; // taille d'une unité
const C = Math.cos(Math.PI / 6);
const OX = 182, OY = 126;
const W = 412, H = 362;
const INK = '#22303D';
const SHADOW = 'rgba(18,26,36,.075)';
const NEUTRAL = { t: '#FFFFFF', l: '#F1EEE8', r: '#E3DDD2' };
const WALL = { t: '#FFFFFF', l: '#F7F5F1', r: '#EEEAE3' };
const DARK = { t: '#5A6673', l: '#3F4A56', r: '#2E3842' };

const n = (v) => +v.toFixed(1);
const P = (x, y, z = 0) => [n(OX + (x - y) * C * S), n(OY + (x + y) * 0.5 * S - z * S)];
const pts = (a) => a.map((p) => P(...p).join(',')).join(' ');
const attrs = (o = {}) => Object.entries(o).map(([k, v]) => ` ${k}="${v}"`).join('');
const poly = (a, fill, o) => `<polygon points="${pts(a)}" fill="${fill}"${attrs(o)}/>`;
const line = (a, b, o) => `<path d="M${P(...a)}L${P(...b)}"${attrs(o)}/>`;
const pathOf = (a, closed = false) => 'M' + a.map((p) => P(...p).join(' ')).join('L') + (closed ? 'Z' : '');
const g = (cls, body, o = {}) => `<g${cls ? ` class="${cls}"` : ''}${attrs(o)}>${body}</g>`;

// Pavé : dessus, face avant gauche (y max), face avant droite (x max).
function box(x, y, z, w, d, h, c = NEUTRAL, o = {}) {
  return g(o.cls, [
    poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c.t),
    poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c.l),
    poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c.r),
  ].join(''));
}
// Ombre portée géométrique sur le sol (allongée vers +x).
const shadow = (x, y, w, d, h, z = 0) => poly([[x, y, z], [x + w + h * 0.45, y, z], [x + w + h * 0.45, y + d, z], [x, y + d, z]], SHADOW, { stroke: 'none' });

// Cercle dans un plan quelconque (u, v : axes unitaires du plan).
function circle(c, u, v, r, k = 40) {
  return Array.from({ length: k }, (_, i) => {
    const t = (i / k) * Math.PI * 2;
    return [c[0] + r * (Math.cos(t) * u[0] + Math.sin(t) * v[0]), c[1] + r * (Math.cos(t) * u[1] + Math.sin(t) * v[1]), c[2] + r * (Math.cos(t) * u[2] + Math.sin(t) * v[2])];
  });
}
const disc = (c, r, fill, o) => `<path d="${pathOf(circle(c, [1, 0, 0], [0, 1, 0], r), true)}" fill="${fill}"${attrs(o)}/>`;
const wheelY = (c, r, fill, o) => `<path d="${pathOf(circle(c, [1, 0, 0], [0, 0, 1], r), true)}" fill="${fill}"${attrs(o)}/>`;
const roundX = (c, r, fill, o) => `<path d="${pathOf(circle(c, [0, 1, 0], [0, 0, 1], r), true)}" fill="${fill}"${attrs(o)}/>`;

// Cylindre vertical (corps + couvercle).
function cyl(cx, cy, z, r, h, c = NEUTRAL) {
  const rx = r * Math.SQRT2 * C * S, ry = r * Math.SQRT2 * 0.5 * S;
  const [bx, by] = P(cx, cy, z), [tx, ty] = P(cx, cy, z + h);
  return `<path d="M${n(bx - rx)} ${ty}L${n(bx - rx)} ${by}A${n(rx)} ${n(ry)} 0 0 0 ${n(bx + rx)} ${by}L${n(bx + rx)} ${ty}Z" fill="${c.l}"/>` +
    `<ellipse cx="${tx}" cy="${ty}" rx="${n(rx)}" ry="${n(ry)}" fill="${c.t}"/>`;
}

// Profil (x, z) extrudé selon y, de y0 à y1 : faces visibles puis flanc avant.
function extrudeY(prof, y0, y1, c = NEUTRAL) {
  const out = [];
  for (let i = 0; i < prof.length; i++) {
    const [ax, az] = prof[i], [bx, bz] = prof[(i + 1) % prof.length];
    const nx = bz - az, nz = -(bx - ax);
    if (nx + nz > 1e-6) out.push(poly([[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]], nz > Math.abs(nx) ? c.t : c.r));
  }
  out.push(poly(prof.map(([x, z]) => [x, y1, z]), c.l));
  return out.join('');
}
// Profil (y, z) extrudé selon x, de x0 à x1.
function extrudeX(prof, x0, x1, c = NEUTRAL) {
  const out = [];
  for (let i = 0; i < prof.length; i++) {
    const [ay, az] = prof[i], [by, bz] = prof[(i + 1) % prof.length];
    const ny = -(bz - az), nz = by - ay;
    if (ny + nz > 1e-6) out.push(poly([[x0, ay, az], [x0, by, bz], [x1, by, bz], [x1, ay, az]], nz > Math.abs(ny) ? c.t : c.l));
  }
  out.push(poly(prof.map(([y, z]) => [x1, y, z]), c.r));
  return out.join('');
}

// Pièce commune : dalle, deux murs coupés, carrelage discret.
function room(acc) {
  const tiles = [];
  for (let x = 2; x < 12; x += 2) tiles.push(line([x, 0, 0], [x, 9, 0], { 'stroke-opacity': '.18' }));
  for (let y = 2; y < 9; y += 2) tiles.push(line([0, y, 0], [12, y, 0], { 'stroke-opacity': '.18' }));
  return [
    box(-0.35, -0.35, -0.45, 12.35, 9.35, 0.45, { t: acc.floor, l: '#E9E4DA', r: '#DDD6C9' }),
    g('', tiles.join('')),
    box(0, -0.35, 0, 12, 0.35, 5.4, WALL),
    box(-0.35, -0.35, 0, 0.35, 9, 5.4, WALL),
  ].join('');
}

function svg(name, title, acc, body) {
  return `<svg class="sketch sketch--${name}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
<!-- ${title} — illustration symbolique (scripts/sketches.mjs), ne représente pas nos locaux. -->
<g fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">
${room(acc)}
${body}
</g>
</svg>
`;
}

/* ---------- Automobile : véhicule sur pont élévateur ---------- */
function auto() {
  const A = { t: '#DDEBF7', l: '#BFD7EE', r: '#9DBFE0', floor: '#FBFAF7' };
  const acc = '#1870B0';
  const parts = [];
  // Panneau à outils sur le mur du fond.
  parts.push(poly([[1.2, 0, 2.2], [5.6, 0, 2.2], [5.6, 0, 4.4], [1.2, 0, 4.4]], '#F2F6FA'));
  for (let i = 0; i < 5; i++) {
    const x = 1.8 + i * 0.85;
    parts.push(line([x, 0, 2.7], [x, 0, 3.9 - (i % 2) * 0.3]));
    parts.push(wheelY([x, 0, 3.95 - (i % 2) * 0.3], 0.16, '#FFFFFF'));
  }
  // Servante d'atelier contre le mur.
  parts.push(shadow(9.4, 0.25, 2.1, 1.4, 2.6));
  parts.push(box(9.4, 0.25, 0, 2.1, 1.4, 2.6, A));
  for (const z of [0.6, 1.2, 1.8]) parts.push(line([9.5, 1.65, z], [11.4, 1.65, z]), line([10.2, 1.65, z + 0.3], [10.7, 1.65, z + 0.3], { 'stroke-width': '2.2' }));
  parts.push(box(9.6, 0.4, 2.6, 0.7, 0.5, 0.35, NEUTRAL));
  // Pile de pneus.
  parts.push(shadow(0.8, 6.6, 1.8, 1.8, 1.2));
  for (const z of [0, 0.55]) parts.push(cyl(1.7, 7.5, z, 0.9, 0.55, DARK));
  parts.push(disc([1.7, 7.5, 1.1], 0.42, '#E3DDD2'));
  // Pont élévateur à ciseaux.
  parts.push(shadow(2.6, 3.5, 6.8, 2.6, 1.4));
  parts.push(box(2.8, 3.6, 0, 6.4, 2.4, 0.22, NEUTRAL));
  const sc = [];
  for (const y of [3.75, 5.85]) {
    sc.push(line([3.4, y, 0.22], [8.6, y, 1.25], { 'stroke-width': '2.4', stroke: '#3F4A56' }));
    sc.push(line([3.4, y, 1.25], [8.6, y, 0.22], { 'stroke-width': '2.4', stroke: '#3F4A56' }));
  }
  sc.push(wheelY([6, 5.85, 0.735], 0.13, '#FFFFFF'));
  parts.push(g('sk-scissor', sc.join('')));
  const lift = [];
  lift.push(box(2.6, 3.5, 1.25, 6.8, 2.6, 0.24, { t: '#EDF0F3', l: '#D5DBE1', r: '#BCC5CE' }));
  // Véhicule : profil extrudé, vitrages, roues.
  const z0 = 1.64, x0 = 2.4, y0 = 3.55, y1 = 6.05;
  const prof = [[0, 0.35], [7.2, 0.35], [7.2, 1.1], [6.9, 1.35], [5.15, 1.5], [4.0, 2.4], [1.7, 2.4], [0.55, 1.55], [0, 1.42]]
    .map(([x, z]) => [x0 + x, z0 + z]);
  lift.push(wheelY([x0 + 1.5, y0 + 0.02, z0 + 0.38], 0.6, '#2E3842'));
  lift.push(wheelY([x0 + 5.75, y0 + 0.02, z0 + 0.38], 0.6, '#2E3842'));
  lift.push(extrudeY(prof, y0, y1, A));
  const win = (a) => poly(a.map(([x, z]) => [x0 + x, y1, z0 + z]), '#F4F8FC');
  lift.push(win([[0.95, 1.62], [2.5, 1.62], [2.5, 2.24], [1.75, 2.24]]));
  lift.push(win([[2.65, 1.62], [4.85, 1.62], [3.92, 2.24], [2.65, 2.24]]));
  lift.push(line([x0 + 2.58, y1, z0 + 0.5], [x0 + 2.58, y1, z0 + 1.55]), line([x0 + 4.9, y1, z0 + 0.5], [x0 + 4.9, y1, z0 + 1.5]));
  lift.push(line([x0 + 3.0, y1, z0 + 1.32], [x0 + 3.4, y1, z0 + 1.32], { 'stroke-width': '2' }));
  lift.push(poly([[x0 + 7.2, y1 - 0.15, z0 + 0.8], [x0 + 7.2, y1 - 0.65, z0 + 0.8], [x0 + 7.2, y1 - 0.65, z0 + 1.02], [x0 + 7.2, y1 - 0.15, z0 + 1.02]], '#FFFFFF'));
  for (const wx of [1.5, 5.75]) {
    lift.push(wheelY([x0 + wx, y1 + 0.02, z0 + 0.38], 0.62, '#2E3842'));
    lift.push(wheelY([x0 + wx, y1 + 0.04, z0 + 0.38], 0.3, '#E3E8ED'));
    lift.push(g('sk-hub', wheelY([x0 + wx, y1 + 0.05, z0 + 0.38], 0.08, '#2E3842')));
  }
  parts.push(g('sk-lift', lift.join('')));
  // Chariot de diagnostic avec tracé animé.
  parts.push(shadow(10.2, 3.4, 1.5, 1.2, 2.4));
  parts.push(box(10.2, 3.4, 0.3, 1.5, 1.2, 1.2, NEUTRAL));
  parts.push(line([10.2, 4.6, 0.75], [11.7, 4.6, 0.75], { 'stroke-opacity': '.5' }));
  for (const [a, b] of [[10.35, 4.45], [11.55, 4.45]]) parts.push(wheelY([a, b + 0.15, 0.15], 0.15, '#2E3842'));
  parts.push(box(10.85, 3.75, 1.5, 0.2, 0.2, 0.4, NEUTRAL));
  parts.push(box(10.3, 3.8, 1.9, 1.3, 0.14, 1.0, { t: '#FFFFFF', l: '#1F2B37', r: '#3B4754' }));
  const sy = 3.96;
  const wave = [[10.42, sy, 2.35], [10.65, sy, 2.35], [10.78, sy, 2.7], [10.92, sy, 2.08], [11.05, sy, 2.55], [11.18, sy, 2.35], [11.48, sy, 2.35]];
  parts.push(`<path class="sk-trace" d="${pathOf(wave)}" pathLength="100" stroke="#7DB9EA" stroke-width="1.8"/>`);
  parts.push(`<path class="sk-cable" d="M${P(10.3, 4.4, 1.0)}Q${P(9.9, 4.9, 0.5)} ${P(9.6, 5.0, 2.3)}" stroke-dasharray="1 4" stroke="${acc}"/>`);
  return svg('auto', 'Atelier de maintenance automobile', A, parts.join('\n'));
}

/* ---------- Esthétique et bien-être : cabine de soin ---------- */
function beaute() {
  const B = { t: '#F8E9EF', l: '#EFD3DF', r: '#E2BCCD', floor: '#FCFAF8' };
  const GOLD = { t: '#F3EADB', l: '#E6D6BC', r: '#D6C19F' };
  const parts = [];
  // Ligne décorative murale (arche).
  parts.push(poly([[3.0, 0, 0.2], [8.6, 0, 0.2], [8.6, 0, 4.4], [3.0, 0, 4.4]], '#FBF4F7'));
  parts.push(`<path class="sk-deco" d="${pathOf([[3.6, 0, 0.6], [3.6, 0, 2.0], ...circle([5.8, 0, 2.0], [-1, 0, 0], [0, 0, 1], 2.2, 48).slice(0, 25), [8.0, 0, 0.6]])}" pathLength="100" stroke="#C98BA8"/>`);
  // Miroir rond sur le mur de gauche, reflet animé.
  const mc = [0, 6.2, 3.3];
  parts.push(roundX(mc, 1.45, '#FFFFFF'));
  parts.push(`<clipPath id="sk-mirror"><path d="${pathOf(circle(mc, [0, 1, 0], [0, 0, 1], 1.25), true)}"/></clipPath>`);
  parts.push(roundX(mc, 1.25, '#EEF1F4'));
  parts.push(g('', `<path class="sk-glint" d="M${P(0, 5.4, 2.6)}L${P(0, 6.6, 4.4)}M${P(0, 5.9, 2.4)}L${P(0, 6.9, 3.9)}" stroke="#FFFFFF" stroke-width="3.5"/>`, { 'clip-path': 'url(#sk-mirror)' }));
  // Étagère murale et flacons.
  parts.push(box(8.9, 0, 3.0, 2.6, 0.7, 0.15, GOLD));
  parts.push(cyl(9.4, 0.35, 3.15, 0.22, 0.6, NEUTRAL), cyl(10.1, 0.35, 3.15, 0.28, 0.42, B), cyl(10.85, 0.35, 3.15, 0.2, 0.75, GOLD));
  // Plante.
  parts.push(shadow(10.4, 1.0, 1.2, 1.2, 1.4));
  parts.push(cyl(11.0, 1.6, 0, 0.55, 0.9, GOLD));
  const leaf = (a, b, c2) => `<path d="M${P(...a)}Q${P(...b)} ${P(...c2)}Q${P(b[0] + 0.9, b[1], b[2] - 0.7)} ${P(...a)}Z" fill="#DCE8DA"/>`;
  parts.push(leaf([11, 1.6, 0.9], [10.2, 1.6, 1.8], [10.0, 1.6, 2.6]), leaf([11, 1.6, 0.9], [11.6, 1.6, 2.0], [11.8, 1.6, 2.9]), leaf([11, 1.6, 0.9], [11.0, 1.9, 2.3], [10.9, 2.0, 3.3]));
  // Console sous le miroir : pot à pinceaux, coffret.
  parts.push(shadow(0, 5.0, 0.9, 2.4, 1.7));
  parts.push(box(0, 5.0, 1.55, 0.95, 2.4, 0.2, GOLD));
  parts.push(line([0.9, 5.15, 1.55], [0.9, 5.15, 0]), line([0.9, 7.25, 1.55], [0.9, 7.25, 0]));
  parts.push(cyl(0.45, 5.5, 1.75, 0.2, 0.35, B));
  parts.push(line([0.45, 5.5, 2.1], [0.35, 5.45, 2.55]), line([0.45, 5.5, 2.1], [0.6, 5.55, 2.5]));
  parts.push(box(0.15, 6.6, 1.75, 0.6, 0.55, 0.25, NEUTRAL));
  // Table de soin : pied, matelas, dossier relevé, serviette.
  parts.push(shadow(2.7, 3.6, 6.6, 2.4, 1.6));
  parts.push(box(4.4, 4.1, 0, 3.4, 1.4, 1.05, GOLD));
  parts.push(box(3.9, 3.8, 0, 4.4, 2.0, 0.12, GOLD));
  parts.push(box(2.7, 3.6, 1.05, 6.6, 2.4, 0.5, B));
  parts.push(extrudeY([[3.95, 1.55], [4.65, 1.55], [3.35, 2.85], [2.75, 2.7]], 3.6, 6.0, B));
  parts.push(box(7.4, 3.75, 1.55, 1.5, 2.1, 0.22, NEUTRAL));
  parts.push(line([7.4, 5.85, 1.66], [8.9, 5.85, 1.66], { 'stroke-opacity': '.5' }));
  // Tabouret.
  parts.push(shadow(1.45, 5.75, 1.1, 1.1, 1.2));
  parts.push(line([2.0, 6.3, 0], [2.0, 6.3, 1.0], { 'stroke-width': '2.2' }));
  parts.push(cyl(2.0, 6.3, 0, 0.5, 0.1, NEUTRAL), cyl(2.0, 6.3, 1.0, 0.6, 0.22, B));
  // Desserte : plateaux, montants, accessoires.
  const dx = 9.4, dy = 5.9;
  parts.push(shadow(dx, dy, 1.6, 1.4, 2.4));
  for (const [a, b] of [[0, 0], [1.6, 0], [1.6, 1.4], [0, 1.4]]) if (!(a === 0 && b === 0)) parts.push(line([dx + a, dy + b, 0], [dx + a, dy + b, 2.2], { 'stroke-width': '1.8' }));
  parts.push(box(dx, dy, 0.25, 1.6, 1.4, 0.1, GOLD), box(dx, dy, 1.2, 1.6, 1.4, 0.1, GOLD));
  parts.push(box(dx + 0.25, dy + 0.3, 1.3, 1.0, 0.8, 0.35, NEUTRAL));
  parts.push(line([dx + 0.25, dy + 1.1, 1.47], [dx + 1.25, dy + 1.1, 1.47], { 'stroke-opacity': '.5' }));
  parts.push(box(dx, dy, 2.2, 1.6, 1.4, 0.1, GOLD));
  parts.push(cyl(dx + 0.45, dy + 0.5, 2.3, 0.2, 0.55, NEUTRAL), cyl(dx + 1.1, dy + 0.45, 2.3, 0.24, 0.35, B), cyl(dx + 0.9, dy + 1.0, 2.3, 0.16, 0.7, GOLD));
  return svg('beaute', 'Cabine de soin esthétique', B, parts.join('\n'));
}

/* ---------- Intelligence artificielle : poste de travail ---------- */
function ia() {
  const V = { t: '#ECE8FB', l: '#D6CEF5', r: '#BEB2EC', floor: '#FBFAF8' };
  const parts = [];
  // Tableau de flux sur le mur de gauche.
  parts.push(poly([[0, 1.4, 1.8], [0, 4.8, 1.8], [0, 4.8, 4.4], [0, 1.4, 4.4]], '#FFFFFF'));
  const r = (y, z, w, h, f) => poly([[0, y, z], [0, y + w, z], [0, y + w, z + h], [0, y, z + h]], f);
  parts.push(r(1.8, 3.6, 1.0, 0.45, V.t), r(3.4, 3.6, 1.0, 0.45, V.t), r(2.6, 2.3, 1.0, 0.45, '#F1EEE8'));
  parts.push(line([0, 2.8, 3.82], [0, 3.4, 3.82]), line([0, 2.3, 3.6], [0, 3.0, 2.75]), line([0, 3.9, 3.6], [0, 3.2, 2.75]));
  // Réseau de nœuds sur le mur du fond : circulation ponctuelle.
  const N = [[7.6, 4.3], [9.0, 4.85], [10.6, 4.4], [8.3, 3.2], [9.9, 3.4], [11.2, 3.1]].map(([x, z]) => [x, 0, z]);
  const E = [[0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4], [4, 5], [3, 4]];
  parts.push(g('', E.map(([a, b]) => line(N[a], N[b], { 'stroke-opacity': '.55' })).join('')));
  parts.push(`<path class="sk-pulse" d="${pathOf([N[3], N[1], N[4], N[2]])}" pathLength="100" stroke="#5B3FC4" stroke-width="2.6"/>`);
  parts.push(`<path class="sk-pulse sk-pulse--b" d="${pathOf([N[0], N[1], N[2], N[4], N[5]])}" pathLength="100" stroke="#5B3FC4" stroke-width="2.6"/>`);
  parts.push(N.map((p, i) => wheelY(p, i === 1 ? 0.24 : 0.17, i === 1 ? '#5B3FC4' : '#FFFFFF', { class: `sk-node sk-node--${i}` })).join(''));
  // Plante.
  parts.push(shadow(10.8, 6.8, 1.0, 1.0, 1.2));
  parts.push(cyl(11.3, 7.3, 0, 0.5, 0.8, NEUTRAL));
  const leaf = (a, b, c2) => `<path d="M${P(...a)}Q${P(...b)} ${P(...c2)}Q${P(b[0] + 0.9, b[1], b[2] - 0.7)} ${P(...a)}Z" fill="#DCE8DA"/>`;
  parts.push(leaf([11.3, 7.3, 0.8], [10.6, 7.3, 1.6], [10.4, 7.3, 2.3]), leaf([11.3, 7.3, 0.8], [11.8, 7.3, 1.7], [12.0, 7.3, 2.5]), leaf([11.3, 7.3, 0.8], [11.3, 7.6, 2.0], [11.2, 7.7, 2.8]));
  // Bureau : plateau et deux joues.
  parts.push(shadow(2.8, 1.6, 7.0, 2.8, 2.4));
  parts.push(box(3.0, 1.7, 0, 0.25, 2.6, 2.3, NEUTRAL), box(9.25, 1.7, 0, 0.25, 2.6, 2.3, NEUTRAL));
  parts.push(box(2.8, 1.6, 2.3, 7.0, 2.8, 0.22, { t: '#FFFFFF', l: '#EAE5DB', r: '#DCD5C8' }));
  // Écran : pied, cadre, conversation.
  parts.push(box(6.2, 2.15, 2.52, 0.9, 0.6, 0.08, NEUTRAL), box(6.5, 2.3, 2.6, 0.3, 0.2, 0.7, NEUTRAL));
  parts.push(box(4.5, 2.1, 3.1, 4.3, 0.22, 2.5, { t: '#FFFFFF', l: '#2A3541', r: '#3B4754' }));
  const sy = 2.33;
  const scr = (x, z, w, h, f) => poly([[x, sy, z], [x + w, sy, z], [x + w, sy, z + h], [x, sy, z + h]], f, { 'stroke-width': '1' });
  const chat = [];
  chat.push(scr(4.65, 3.25, 4.0, 2.2, '#F7F6FB'));
  chat.push(g('sk-msg sk-msg--1', scr(4.85, 4.55, 2.0, 0.6, '#FFFFFF') + line([5.0, sy, 4.92], [6.5, sy, 4.92], { 'stroke-width': '1' }) + line([5.0, sy, 4.75], [6.1, sy, 4.75], { 'stroke-width': '1' })));
  chat.push(g('sk-msg sk-msg--2', scr(6.4, 3.75, 2.05, 0.65, V.l) + line([6.55, sy, 4.15], [8.25, sy, 4.15], { 'stroke-width': '1' }) + line([6.55, sy, 3.97], [7.6, sy, 3.97], { 'stroke-width': '1' })));
  chat.push(g('sk-msg sk-msg--3', [5.05, 5.3, 5.55].map((x) => wheelY([x, sy, 3.6], 0.07, '#5B3FC4', { stroke: 'none' })).join('')));
  parts.push(g('', chat.join('')));
  // Clavier, souris, tasse, carnet.
  parts.push(box(5.0, 3.15, 2.52, 3.0, 0.75, 0.08, NEUTRAL));
  for (let i = 1; i < 6; i++) parts.push(line([5.0 + i * 0.5, 3.2, 2.6], [5.0 + i * 0.5, 3.85, 2.6], { 'stroke-opacity': '.35', 'stroke-width': '1' }));
  parts.push(line([5.05, 3.52, 2.6], [7.95, 3.52, 2.6], { 'stroke-opacity': '.35', 'stroke-width': '1' }));
  parts.push(box(8.35, 3.35, 2.52, 0.35, 0.5, 0.1, NEUTRAL));
  parts.push(cyl(3.7, 3.4, 2.52, 0.3, 0.5, V));
  parts.push(box(3.4, 2.0, 2.52, 1.0, 0.75, 0.1, { t: '#FFFFFF', l: V.l, r: V.r }));
  // Fauteuil de bureau (en retrait, côté gauche).
  parts.push(shadow(1.0, 5.6, 1.8, 1.8, 2.0));
  for (const a of [0, 72, 144, 216, 288]) { const t = (a * Math.PI) / 180; parts.push(line([1.9, 6.5, 0.15], [1.9 + 0.8 * Math.cos(t), 6.5 + 0.8 * Math.sin(t), 0.08], { 'stroke-width': '2' })); }
  parts.push(line([1.9, 6.5, 0.15], [1.9, 6.5, 1.3], { 'stroke-width': '2.4' }));
  parts.push(box(1.1, 5.7, 1.3, 1.6, 1.6, 0.3, V));
  parts.push(box(1.1, 7.15, 1.6, 1.6, 0.18, 1.7, V));
  return svg('ia', 'Poste de travail et usages de l’IA', V, parts.join('\n'));
}

// Version en ligne (portail, animée) et fichier statique (vignettes des cartes formation).
const out = path.resolve('src/assets/sketches');
const pub = path.resolve('public/img/sketches');
for (const d of [out, pub]) fs.mkdirSync(d, { recursive: true });
for (const [name, fn] of [['automobile', auto], ['beaute', beaute], ['ia', ia]]) {
  const s = fn();
  fs.writeFileSync(path.join(out, `${name}.svg`), s);
  fs.writeFileSync(path.join(pub, `${name}.svg`), s.replace(' aria-hidden="true" focusable="false"', ''));
  console.log(name, (s.length / 1024).toFixed(1), 'Ko');
}
