// Cartes formation (visuel, nom, durée) partagées par l'accueil, le catalogue et les pages pôles.
// Aucune durée n'est inventée : une valeur absente des contenus n'est pas affichée
// (voir docs/points-a-confirmer.md, durées des modules).
import { pole } from './data';

// Photo d'illustration par fiche automobile (recadrages de la direction artistique).
const autoPhoto: Record<string, string> = {
  '/service/maintenance/': 'auto-cle-paysage',
  '/service/wheels-alignment/': 'auto-showroom-paysage',
  '/service/interior-cleaning/': 'auto-peinture-paysage',
  '/m-grid-col-3/': 'auto-cle-paysage',
  '/m-grid-col-2/': 'auto-peinture-paysage',
};

// Durée d'un module si elle est publiée, sinon rien.
export const dureeModule = (p: any): string | null => p.duree || null;
export const dureeParcours = (f: any): string | null => f.parcours?.infos.find((i: any) => i.label === 'Durée')?.valeur ?? null;

export function autoCards(fiches: any[], type?: 'catalogue' | 'parcours') {
  return fiches
    .filter((f) => f.pole === 'automobile' && (!type || f.type === type))
    .map((f) => ({
      href: f.url,
      titre: f.type === 'parcours' ? `Parcours ${f.titre_court.toLowerCase()}` : f.titre_court,
      // Fiches « catalogue » : pas de volume global publié, on indique le nombre de modules.
      duree: f.type === 'parcours' ? dureeParcours(f) : `${f.programmes.length} module${f.programmes.length > 1 ? 's' : ''}`,
      accent: 'auto',
      photo: autoPhoto[f.url],
    }));
}

// Cadrage de l'illustration du portail selon la thématique beauté.
const beauteCadre: Record<string, { pos: string; zoom: number }> = {
  regard: { pos: '18% 40%', zoom: 2.1 },
  'visage-sourire': { pos: '22% 52%', zoom: 1.8 },
  'corps-bien-etre': { pos: '48% 62%', zoom: 1.5 },
  cheveux: { pos: '30% 70%', zoom: 1.9 },
  ongles: { pos: '70% 82%', zoom: 1.9 },
};

export function beauteCards() {
  const p = pole('beaute');
  return p.familles.map((fam: any) => ({
    famille: fam,
    cards: fam.formations.map((x: any) => ({
      href: x.url, titre: x.titre, duree: x.duree, accent: 'beaute', ext: 'maisonbeauxlieux.com', pole: 'beaute',
      sketch: { name: 'beaute', ...beauteCadre[fam.id] },
    })),
  }));
}

const iaCadre: Record<string, { pos: string; zoom: number }> = {
  'artisans-tpe': { pos: '62% 42%', zoom: 1.7 },
  entreprises: { pos: '20% 38%', zoom: 2.0 },
  particuliers: { pos: '86% 30%', zoom: 2.0 },
};

export function iaCards() {
  const p = pole('ia');
  return p.familles.map((fam: any) => ({
    href: fam.lien.url, titre: fam.nom, duree: fam.duree, accent: 'ia', ext: 'iatechformanord.fr', pole: 'ia',
    sketch: { name: 'ia', ...iaCadre[fam.id] },
  }));
}
