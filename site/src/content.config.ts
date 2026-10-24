// Schéma des contenus éditables. Toute la matière éditoriale (formations, coordonnées,
// pôles, témoignages, documents) vit dans src/content/ : jamais dans les composants.
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const image = z.object({ src: z.string(), alt: z.string(), width: z.number().optional(), height: z.number().optional() });

// Élément de liste pouvant porter des sous-points (« Le contenu », « Les applications pratiques »).
const point = z.union([z.string(), z.object({ texte: z.string(), sous: z.array(z.string()).default([]) })]);

const source = z.object({
  url: z.string().url(),
  collecte: z.string(), // AAAA-MM-JJ
  statut: z.enum(['repris-verifie', 'repris-a-confirmer', 'reformule']).default('repris-a-confirmer'),
});

// Module de formation courte (fiches /service/... du site historique).
const programme = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), // ancre : #prog-<id>
  code: z.string().optional(),
  titre: z.string(),
  contexte: z.array(z.string()).default([]),
  objectifs: z.array(z.string()).default([]),
  objectif_general: z.string().optional(),
  public: z.string().optional(),
  prerequis: z.string().optional(),
  duree: z.string().optional(),
  benefices: z.string().optional(),
  contenu: z.array(point).default([]),
  contenu_titre: z.string().default('Le contenu'),
  applications: z.array(point).default([]),
  note_applications: z.string().optional(),
  methodes: z.array(z.string()).default([]),
  evaluation: z.string().optional(),
  modalite: z.string().optional(), // ex. « 100 % e-learning »
  tarif: z.string().optional(),
});

// Parcours long (reconversion) : informations clés + phases de modules.
const parcours = z.object({
  infos: z.array(z.object({ label: z.string(), valeur: z.string() })),
  presentation: z.array(z.string()).default([]),
  phases: z.array(z.object({
    titre: z.string(),
    note: z.string().optional(),
    modules: z.array(z.object({ titre: z.string(), objectifs: z.array(z.string()) })),
  })),
  schema: image.optional(),
});

const fiches = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/fiches' }),
  schema: z.object({
    url: z.string().regex(/^\/.*\/$/),
    pole: z.enum(['automobile', 'beaute', 'ia']),
    famille: z.string(), // clé de famille (data/poles.yaml)
    type: z.enum(['catalogue', 'parcours']),
    ordre: z.number().default(0),
    titre: z.string(), // H1
    titre_court: z.string(), // libellés de navigation et cartes
    seo_title: z.string().max(70),
    seo_description: z.string().min(70).max(170),
    resume: z.string(), // carte catalogue
    image: image.optional(),
    intro: z.array(z.string()).default([]),
    sections: z.array(z.object({ titre: z.string(), paragraphes: z.array(z.string()).default([]), liste: z.array(z.string()).default([]) })).default([]),
    accessibilite: z.array(z.string()).default([]),
    modalites_acces: z.array(z.string()).default([]),
    programmes: z.array(programme).default([]),
    parcours: parcours.optional(),
    sources: z.array(source).min(1),
  }),
});

export const collections = { fiches };
