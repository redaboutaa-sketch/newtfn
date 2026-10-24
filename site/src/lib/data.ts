// Accès aux données centralisées (src/content/data/*.yaml), lues au moment du build.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const dir = path.resolve('src/content/data');
const cache = new Map<string, any>();
function load<T = any>(name: string): T {
  if (!cache.has(name)) cache.set(name, YAML.parse(fs.readFileSync(path.join(dir, `${name}.yaml`), 'utf8')));
  return cache.get(name);
}

export const organisme = () => load('organisme');
export const poles = (): any[] => [...load<any[]>('poles')].sort((a, b) => a.ordre - b.ordre);
export const pole = (id: string) => poles().find((p) => p.id === id);
export const temoignages = () => load('temoignages');
export const documents = (): any[] => load('documents');

// Environnement : « production » uniquement lorsque explicitement demandé au build.
export const SITE_ENV = (process.env.PUBLIC_SITE_ENV || 'preprod') as 'production' | 'preprod' | 'development';
export const isProduction = SITE_ENV === 'production';
export const FORM_ENDPOINT = process.env.PUBLIC_FORM_ENDPOINT || '/api/contact';
export const ANALYTICS = {
  // Seul Plausible (sans cookie, sans consentement requis) est intégré. Un outil à cookies (GA4…)
  // exigerait d'abord une plateforme de consentement : voir docs/mesure-et-suivi.md.
  provider: isProduction && process.env.PUBLIC_ANALYTICS_PROVIDER === 'plausible' ? 'plausible' : '',
  id: process.env.PUBLIC_ANALYTICS_ID || '',
  domain: process.env.PUBLIC_ANALYTICS_DOMAIN || 'techformanord.fr',
  gsc: process.env.PUBLIC_GSC_VERIFICATION || '',
};

export const telHref = (n: string) => `tel:${n}`;
export const formatDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
