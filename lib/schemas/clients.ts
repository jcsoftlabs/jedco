import { z } from "zod";
import { typeServiceSchema } from "@/lib/schemas/enums";

export const typeClientSchema = z.enum(["PARTICULIER", "ENTREPRISE", "INSTITUTION", "ONG"]);

// EN_REGLE / IMPAYE plutôt que de recopier StatutFacture ici : la
// segmentation raisonne sur "ce client a-t-il quelque chose à payer en ce
// moment", pas sur le statut précis d'une facture donnée — un client avec
// une facture EN_ATTENTE et une autre EN_RETARD est IMPAYE des deux façons,
// on n'a pas besoin de les distinguer à ce niveau.
export const statutPaiementClientSchema = z.enum(["EN_REGLE", "IMPAYE"]);
// Statuts qui rendent un client "IMPAYE" pour cette segmentation — mêmes
// valeurs que statutsImpayes dans statsClient (lib/services/clients.ts),
// gardées ici pour que le filtre de liste et le calcul par fiche parlent
// toujours de la même chose.
export const STATUTS_FACTURE_IMPAYES = ["EN_ATTENTE", "PARTIELLEMENT_PAYEE", "EN_RETARD"] as const;

export const creerClientSchema = z.object({
  nom: z.string().trim().min(1).max(200),
  type: typeClientSchema.default("PARTICULIER"),
  telephone: z.string().trim().min(1).max(30),
  email: z.email().optional(),
  adresse: z.string().trim().max(500).optional(),
  ville: z.string().trim().min(1).max(100).default("Port-au-Prince"),
  notes: z.string().trim().max(2000).optional(),
});

// Sur la création, un champ facultatif vide est simplement omis (voir
// NouveauClientForm). Sur la modification, il faut distinguer "ne pas
// toucher ce champ" (absent de la requête) de "effacer la valeur existante"
// (chaîne vide envoyée depuis le formulaire d'édition, pré-rempli avec la
// valeur actuelle) — sinon un client qui avait une adresse ne pourrait
// jamais la retirer. Une chaîne vide est donc convertie en null ici, ce que
// creerClientSchema.partial() seul ne permettrait pas (null y échouerait la
// validation email()/string()).
const champEffacable = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" ? null : v), schema.nullable().optional());

export const modifierClientSchema = creerClientSchema.partial().extend({
  email: champEffacable(z.email()),
  adresse: champEffacable(z.string().trim().max(500)),
});

// §1.19 du plan : plafond de pagination pour éviter qu'une liste sans limite
// ne devienne un vecteur de déni de service accidentel.
export const listeClientsSchema = z.object({
  ville: z.string().optional(),
  type: typeClientSchema.optional(),
  actif: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  // Segmente sur le service consommé, pas sur le type de client — un
  // client rattaché à un contrat actif dont les `services` incluent ce code.
  service: typeServiceSchema.optional(),
  statutPaiement: statutPaiementClientSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreerClientInput = z.infer<typeof creerClientSchema>;
export type ModifierClientInput = z.infer<typeof modifierClientSchema>;
export type ListeClientsParams = z.infer<typeof listeClientsSchema>;
