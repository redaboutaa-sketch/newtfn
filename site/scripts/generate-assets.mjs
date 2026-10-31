// Génère favicon, icône Apple et image de partage (Open Graph) à partir du logo officiel.
import sharp from 'sharp';
import fs from 'node:fs';

const blue = '#1870b0';
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${blue}"/><text x="32" y="42" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="-1">TFN</text></svg>`;
fs.writeFileSync('public/favicon.svg', favicon);
await sharp(Buffer.from(favicon)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
// favicon.ico : PNG 32x32 encapsulé dans un conteneur ICO.
const png32 = await sharp(Buffer.from(favicon)).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6); header.writeUInt8(32, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(png32.length, 14); header.writeUInt32LE(22, 18);
fs.writeFileSync('public/favicon.ico', Buffer.concat([header, png32]));

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect y="560" width="400" height="70" fill="#1870b0"/><rect x="400" y="560" width="400" height="70" fill="#a23b72"/><rect x="800" y="560" width="400" height="70" fill="#5b3fc4"/>
  <text x="80" y="330" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="800" fill="#17212e">Formations professionnelles</text>
  <text x="80" y="400" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="#4b5563">Automobile · Beauté · Intelligence artificielle</text>
  <text x="80" y="460" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="#4b5563">Vendeville, près de Lille</text>
</svg>`;
const logo = await sharp('public/img/logo-tfn.png').resize({ width: 420 }).toBuffer();
await sharp(Buffer.from(og)).composite([{ input: logo, left: 80, top: 80 }]).png({ compressionLevel: 9 }).toFile('public/img/og-default.png');
// Image de partage du site automobile (/acceuil/ et pages internes) ; og-default reste celle du portail.
const ogAuto = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect y="560" width="1200" height="70" fill="#1870b0"/>
  <text x="80" y="330" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="800" fill="#17212e">Formations automobile</text>
  <text x="80" y="400" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="#4b5563">Maintenance · Carrosserie · Commerce · Reconversion</text>
  <text x="80" y="460" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="#4b5563">Vendeville, près de Lille</text>
</svg>`;
await sharp(Buffer.from(ogAuto)).composite([{ input: logo, left: 80, top: 80 }]).png({ compressionLevel: 9 }).toFile('public/img/og-automobile.png');
console.log('assets: favicon.svg, favicon.ico, apple-touch-icon.png, img/og-default.png, img/og-automobile.png');
