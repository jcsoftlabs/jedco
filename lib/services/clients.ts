import { prisma } from "@/lib/db";
import { codeClient } from "@/lib/codes";
import { motifsRecherche } from "@/lib/services/recherche";
import { STATUTS_FACTURE_IMPAYES } from "@/lib/schemas/clients";
import type { Prisma } from "@/app/generated/prisma/client";
import type { CreerClientInput, ListeClientsParams, ModifierClientInput } from "@/lib/schemas/clients";

export async function listerClients(params: ListeClientsParams) {
  const { page, limit, ville, type, actif, service, statutPaiement, search } = params;

  // Recherche insensible à la casse ET aux accents, tous les mots doivent
  // matcher (comme TableauFiltrable côté client) — mais ici sur TOUTE la
  // table, pas seulement la page déjà chargée dans le navigateur. On
  // pré-résout les id concernés par requête brute (unaccent n'est pas
  // exprimable par le query builder Prisma), puis on filtre normalement.
  let idsRecherche: string[] | undefined;
  if (search?.trim()) {
    const motifs = motifsRecherche(search);
    const lignes = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Client"
      WHERE unaccent(lower(
        coalesce(nom, '') || ' ' || coalesce(code, '') || ' ' || coalesce(ville, '') ||
        ' ' || coalesce(telephone, '') || ' ' || coalesce(email, '') || ' ' || type::text
      )) LIKE ALL(${motifs}::text[])
    `;
    idsRecherche = lignes.map((l) => l.id);
  }

  const where: Prisma.ClientWhereInput = {
    deletedAt: null,
    ...(ville ? { ville } : {}),
    ...(type ? { type } : {}),
    ...(actif !== undefined ? { actif } : {}),
    // Contrat ACTIF plutôt que "n'importe quel contrat passé" : la
    // segmentation répond à "qui consomme ce service en ce moment", pas à
    // "qui l'a déjà consommé un jour" — un contrat résilié ou expiré ne
    // qualifie plus le client pour ce filtre.
    ...(service ? { contrats: { some: { deletedAt: null, statut: "ACTIF", services: { has: service } } } } : {}),
    ...(statutPaiement === "IMPAYE"
      ? { factures: { some: { deletedAt: null, statut: { in: [...STATUTS_FACTURE_IMPAYES] } } } }
      : statutPaiement === "EN_REGLE"
        ? { factures: { none: { deletedAt: null, statut: { in: [...STATUTS_FACTURE_IMPAYES] } } } }
        : {}),
    ...(idsRecherche ? { id: { in: idsRecherche } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

// Destinée aux menus déroulants « choisir un client » des formulaires de
// facture, devis, contrat et intervention. listerClients ferait deux
// allers-retours (findMany + count) et rapatrierait toutes les colonnes,
// alors que seuls trois champs sont affichés — chaque aller-retour vers la
// base coûte ~160 ms depuis les fonctions serveur, ce n'est pas négligeable
// sur une page qui en enchaîne déjà plusieurs.
export async function listerClientsPourSelection() {
  return prisma.client.findMany({
    where: { deletedAt: null, actif: true },
    select: { id: true, nom: true, code: true },
    orderBy: { nom: "asc" },
  });
}

export async function obtenirClient(id: string) {
  return prisma.client.findFirst({ where: { id, deletedAt: null } });
}

export async function statsClient(id: string) {
  const client = await obtenirClient(id);
  if (!client) return null;

  const [totalInterventions, factures] = await Promise.all([
    prisma.intervention.count({ where: { clientId: id, deletedAt: null } }),
    prisma.facture.findMany({
      where: { clientId: id, deletedAt: null },
      select: { totalHTG: true, statut: true },
    }),
  ]);

  const montantDuHTG = factures
    .filter((f) => (STATUTS_FACTURE_IMPAYES as readonly string[]).includes(f.statut))
    .reduce((total, f) => total + f.totalHTG, 0n);

  return {
    totalInterventions,
    totalFactures: factures.length,
    montantDuHTG,
  };
}

// Villes distinctes des clients actifs, pour peupler le menu déroulant
// "Zone" de la segmentation — plutôt qu'une liste figée à l'avance qui
// dériverait des vraies zones desservies dès qu'un client d'une nouvelle
// ville est ajouté.
export async function listerVillesClients(): Promise<string[]> {
  const lignes = await prisma.client.findMany({
    where: { deletedAt: null },
    select: { ville: true },
    distinct: ["ville"],
    orderBy: { ville: "asc" },
  });
  return lignes.map((l) => l.ville);
}

export async function creerClient(input: CreerClientInput) {
  const code = await codeClient();
  return prisma.client.create({ data: { ...input, code } });
}

export async function modifierClient(id: string, input: ModifierClientInput) {
  const client = await obtenirClient(id);
  if (!client) return null;
  return prisma.client.update({ where: { id }, data: input });
}

// Soft delete (§1.12) — jamais de suppression physique : un client supprimé
// peut encore être référencé par des factures ou interventions historiques.
export async function supprimerClient(id: string) {
  const client = await obtenirClient(id);
  if (!client) return null;
  return prisma.client.update({ where: { id }, data: { deletedAt: new Date(), actif: false } });
}
