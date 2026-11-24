import PDFDocument from 'pdfkit';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function requireThat(value, message = 'Veuillez vérifier les données saisies.', status = 400) {
  if (!value) throw new HttpError(status, message);
  return value;
}
export const forbidden = () => requireThat(false, 'Vous ne disposez pas de cet accès.', 403);
export const found = (value) => requireThat(value, 'Cette ressource est introuvable.', 404);
export const redirect = (location, headers = {}) => ({ status:303, headers:{ Location:location, ...headers }, body:'' });
export function field(data, key, max = 1000, required = true) {
  const value = data.get(key);
  requireThat(value === null || typeof value === 'string');
  const text = (value || '').trim();
  requireThat((!required || text.length > 0) && text.length <= max, `Vérifiez le champ « ${key} » (maximum ${max} caractères).`);
  return text;
}
export function number(data, key, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const value = Number(field(data, key, 16));
  requireThat(Number.isSafeInteger(value) && value >= min && value <= max);
  return value;
}
export function attachment(data, key, allowed) {
  const file = data.get(key);
  if (!file || file.size === 0) return null;
  requireThat(file instanceof File && allowed.includes(file.type) && file.size <= 20 * 1024 * 1024,
    'Le fichier doit respecter les formats indiqués et la limite de 20 Mio.');
  return file;
}
export function download(name, mime, body, inline = false) {
  const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120);
  return { status:200, headers:{ 'Content-Type':mime, 'Content-Disposition':`${inline ? 'inline' : 'attachment'}; filename="${safeName}"` }, body };
}
export async function pdf(name, title, lines) {
  const document = new PDFDocument({ size:'A4', margin:50 });
  const chunks = [];
  const result = new Promise((resolve, reject) => {
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(download(name, 'application/pdf', Buffer.concat(chunks))));
    document.on('error', reject);
  });
  document.fillColor('#124d82').fontSize(22).text(title).moveDown();
  document.fillColor('#112e4d').fontSize(11);
  for (const line of lines) document.text(String(line)).moveDown(.45);
  document.end();
  return result;
}
