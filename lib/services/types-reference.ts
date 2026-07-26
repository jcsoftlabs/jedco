import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";

export type TypeReference = { code: string; libelle: string; actif: boolean; ordre: number };

// Le code sert de clé primaire et se retrouve dans toutes les colonnes déjà
// remplies : on le normalise pour qu'il reste stable et comparable
// (majuscules, séparateurs unifiés), quelle que soit la saisie de l'admin.
export function normaliserCode(valeur: string): string {
  return valeur
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function listerTypesService(seulementActifs = false) {
  return prisma.typeService.findMany({
    where: seulementActifs ? { actif: true } : {},
    orderBy: [{ ordre: "asc" }, { libelle: "asc" }],
  });
}

export async function listerTypesVehicule(seulementActifs = false) {
  return prisma.typeVehicule.findMany({
    where: seulementActifs ? { actif: true } : {},
    orderBy: [{ ordre: "asc" }, { libelle: "asc" }],
  });
}

// ─── Validation ─────────────────────────────────────────────────────────────
// Ces fonctions remplacent la garantie que donnait l'énumération PostgreSQL.
// Les colonnes sont désormais du texte libre côté base (voir la migration
// types_reference : deux d'entre elles sont des tableaux, impossibles à
// contraindre par une FK), donc c'est ICI que se joue l'intégrité.
//
// On accepte un code INACTIF : désactiver un type doit seulement le retirer
// des listes de saisie, jamais casser la modification d'un enregistrement
// existant qui le porte déjà.

export async function verifierTypesService(codes: string[]): Promise<void> {
  const uniques = [...new Set(codes.filter(Boolean))];
  if (uniques.length === 0) return;

  const connus = await prisma.typeService.findMany({
    where: { code: { in: uniques } },
    select: { code: true },
  });
  const trouves = new Set(connus.map((c) => c.code));
  const inconnus = uniques.filter((c) => !trouves.has(c));

  if (inconnus.length > 0) {
    throw new ErreurMetier(
      `Type de service inconnu : ${inconnus.join(", ")}. Ajoutez-le d'abord dans Paramètres → Types.`,
      400
    );
  }
}

export async function verifierTypeVehicule(code: string): Promise<void> {
  const connu = await prisma.typeVehicule.findUnique({ where: { code }, select: { code: true } });
  if (!connu) {
    throw new ErreurMetier(
      `Type de véhicule inconnu : ${code}. Ajoutez-le d'abord dans Paramètres → Types.`,
      400
    );
  }
}

// ─── Écriture ───────────────────────────────────────────────────────────────

type EntreeType = { code?: string; libelle: string; ordre?: number };
type MajType = { libelle?: string; actif?: boolean; ordre?: number };

// Le code est dérivé du libellé quand il n'est pas fourni : l'admin saisit
// « Curage de canalisation » et obtient CURAGE_DE_CANALISATION sans avoir à
// connaître la convention interne.
function codeDepuis(input: EntreeType): string {
  const code = normaliserCode(input.code ?? input.libelle);
  if (!code) throw new ErreurMetier("Le libellé ne permet pas de dériver un code valide", 400);
  return code;
}

function conflit(code: string, libelle: string): never {
  throw new ErreurMetier(`Le code ${code} est déjà utilisé (${libelle})`, 409);
}

// Les deux modèles sont volontairement traités séparément : les délégués
// Prisma ont des signatures génériques distinctes, et les réunir derrière une
// variable commune produit un type d'union non appelable.
export async function creerTypeService(input: EntreeType) {
  const code = codeDepuis(input);
  const existant = await prisma.typeService.findUnique({ where: { code } });
  if (existant) conflit(code, existant.libelle);

  return prisma.typeService.create({
    data: { code, libelle: input.libelle.trim(), ordre: input.ordre ?? 0 },
  });
}

export async function creerTypeVehicule(input: EntreeType) {
  const code = codeDepuis(input);
  const existant = await prisma.typeVehicule.findUnique({ where: { code } });
  if (existant) conflit(code, existant.libelle);

  return prisma.typeVehicule.create({
    data: { code, libelle: input.libelle.trim(), ordre: input.ordre ?? 0 },
  });
}

export async function modifierTypeService(code: string, input: MajType) {
  const existant = await prisma.typeService.findUnique({ where: { code } });
  if (!existant) return null;
  return prisma.typeService.update({ where: { code }, data: input });
}

export async function modifierTypeVehicule(code: string, input: MajType) {
  const existant = await prisma.typeVehicule.findUnique({ where: { code } });
  if (!existant) return null;
  return prisma.typeVehicule.update({ where: { code }, data: input });
}

// Compte les enregistrements qui utilisent un code, pour prévenir l'admin
// avant qu'il ne le désactive — et pour interdire toute suppression réelle.
export async function usagesTypeService(code: string) {
  const [interventions, contrats, techniciens, lignesFacture, lignesDevis, articles] = await Promise.all([
    prisma.intervention.count({ where: { type: code } }),
    prisma.contrat.count({ where: { services: { has: code } } }),
    prisma.technicien.count({ where: { specialites: { has: code } } }),
    prisma.ligneFacture.count({ where: { service: code } }),
    prisma.ligneDevis.count({ where: { service: code } }),
    prisma.articleCatalogue.count({ where: { type: code } }),
  ]);
  const total = interventions + contrats + techniciens + lignesFacture + lignesDevis + articles;
  return { total, interventions, contrats, techniciens, lignesFacture, lignesDevis, articles };
}

export async function usagesTypeVehicule(code: string) {
  const vehicules = await prisma.vehicule.count({ where: { type: code } });
  return { total: vehicules, vehicules };
}

// Suppression volontairement absente : un type utilisé par un historique ne
// doit jamais disparaître, sinon d'anciennes factures afficheraient un code
// sans libellé. On désactive (actif = false), ce qui le retire des listes de
// saisie sans toucher aux données existantes.
