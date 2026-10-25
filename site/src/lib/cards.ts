// Cartes formation automobile (visuel, nom, durée) partagées par l'accueil, le catalogue et la page pôle.
// Aucune durée n'est inventée : une valeur absente des contenus n'est pas affichée
// (voir docs/points-a-confirmer.md, durées des modules).

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
