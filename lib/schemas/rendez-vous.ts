import { z } from "zod";
import { typeServiceSchema } from "@/lib/schemas/enums";

// Statuts gérés par le backoffice — le champ reste un String en base (comme
// DemandeDevis.traite est un Boolean) plutôt qu'un enum Prisma : la fiche est
// un simple aiguillage vers un rendez-vous, pas un objet métier à faire
// évoluer avec une migration à chaque nouvel état.
export const STATUTS_RENDEZ_VOUS = ["EN_ATTENTE", "CONFIRME", "ANNULE", "TERMINE"] as const;
export const statutRendezVousSchema = z.enum(STATUTS_RENDEZ_VOUS);

// Formulaire public (page d'accueil, sans authentification) — même rigueur
// que creerDemandeDevisSchema : c'est la seule barrière avant écriture en
// base pour une route ouverte à Internet.
export const creerRendezVousSchema = z.object({
  nom: z.string().trim().min(1).max(200),
  telephone: z.string().trim().min(1).max(30),
  email: z.email().optional(),
  service: typeServiceSchema,
  ville: z.string().trim().min(1).max(100),
  adresse: z.string().trim().max(300).optional(),
  // Un rendez-vous dans le passé n'a pas de sens ; on laisse une marge de 30
  // minutes pour tolérer l'horloge d'un téléphone légèrement en retard sans
  // pour autant accepter une date d'hier par erreur de saisie.
  dateVoulue: z.coerce.date().min(new Date(Date.now() - 30 * 60_000), "La date doit être future"),
  message: z.string().trim().max(2000).optional(),
});

export const listeRendezVousSchema = z.object({
  statut: statutRendezVousSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const changerStatutRendezVousSchema = z.object({
  statut: statutRendezVousSchema,
});

export type CreerRendezVousInput = z.infer<typeof creerRendezVousSchema>;
export type ListeRendezVousParams = z.infer<typeof listeRendezVousSchema>;
