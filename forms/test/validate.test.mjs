import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../validate.mjs';

const ok = { nom: 'Jeanne Test', email: 'jeanne@example.fr', message: 'Bonjour, je souhaite un devis.', consentement: 'oui', pole: 'automobile', t: '1000' };

test('demande valide acceptée', () => {
  const r = validate(ok, { now: 10_000 });
  assert.equal(r.spam, null); assert.deepEqual(r.errors, []); assert.equal(r.data.pole, 'automobile');
});
test('champ piège = spam', () => assert.equal(validate({ ...ok, site_web: 'x' }).spam, 'champ_piege'));
test('envoi trop rapide = spam', () => assert.equal(validate({ ...ok, t: '9000' }, { now: 10_000 }).spam, 'trop_rapide'));
test('sans JavaScript (t vide) accepté', () => assert.deepEqual(validate({ ...ok, t: '' }).errors, []));
test('champs obligatoires et consentement', () => {
  const r = validate({ t: '' });
  assert.equal(r.errors.length, 4);
});
test('injection d’en-tête neutralisée', () => {
  const r = validate({ ...ok, nom: 'A\r\nBcc: x@y.z', t: '' });
  assert.ok(!/[\r\n]/.test(r.data.nom));
});
test('pôle inconnu refusé', () => assert.ok(validate({ ...ok, pole: 'hack', t: '' }).errors.length > 0));
test('e-mail invalide refusé', () => assert.ok(validate({ ...ok, email: 'pas-un-email', t: '' }).errors.length > 0));
