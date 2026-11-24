import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const catalog = JSON.parse(readFileSync(new URL('../site/src/data/trainingforme.json', import.meta.url)));
const file = process.env.LMS_DB || 'data/trainingforme.sqlite';
if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
export const db = new DatabaseSync(file);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');

export function transaction(run) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = run();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export const get = (sql, ...args) => db.prepare(sql).get(...args);
export const all = (sql, ...args) => db.prepare(sql).all(...args);
export const write = (sql, ...args) => db.prepare(sql).run(...args);
const migrationDir = new URL('./migrations/', import.meta.url);
transaction(() => {
  db.exec('CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY) STRICT');
  for (const name of readdirSync(migrationDir).sort()) {
    if (get('SELECT name FROM migrations WHERE name=?', name)) continue;
    db.exec(readFileSync(new URL(name, migrationDir), 'utf8'));
    if (name === '001-initial.sql') for (const c of catalog) write('INSERT INTO courses(id,title,hours,price) VALUES(?,?,?,?)', c.id, c.title, c.hours, c.price);
    write('INSERT INTO migrations VALUES(?)', name);
  }
});

const dummy = randomBytes(16).toString('hex');
export const token = () => randomBytes(32).toString('hex');
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password, hash) {
  const [salt, hex] = (hash || dummy + ':' + '00'.repeat(64)).split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hex, 'hex')) && Boolean(hash);
}
export function audit(user, event, target = '') {
  write('INSERT INTO audit(user_id,event,target) VALUES(?,?,?)', user, event, String(target));
}
