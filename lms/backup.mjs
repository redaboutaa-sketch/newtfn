import { backup } from 'node:sqlite';
import { open, rm } from 'node:fs/promises';
import { db } from './db.mjs';

const [destination] = process.argv.slice(2);
if (!destination?.endsWith('.sqlite')) throw new Error('Indiquez un nouveau chemin de sauvegarde se terminant par .sqlite.');
const file = await open(destination,'wx',0o600);
await file.close();
try {
  await backup(db,destination);
} catch (error) {
  await rm(destination,{force:true});
  throw error;
}
console.log('Sauvegarde SQLite créée.');
