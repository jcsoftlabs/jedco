import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  creerClient,
  obtenirClient,
  modifierClient,
  supprimerClient,
  listerClients,
  statsClient,
} from "../clients";

describe("module Clients (intégration réelle)", () => {
  const idsCrees: string[] = [];

  afterAll(async () => {
    // Nettoyage — suppression physique réelle (le soft delete n'est qu'un
    // comportement applicatif, pas une contrainte de la base de test).
    await prisma.client.deleteMany({ where: { id: { in: idsCrees } } });
    await prisma.$disconnect();
  });

  it("crée un client avec un code auto-généré au format JED-XXXX", async () => {
    const client = await creerClient({
      nom: "Test Client SA",
      type: "ENTREPRISE",
      telephone: "3712-3456",
      ville: "Jacmel",
    });
    idsCrees.push(client.id);

    expect(client.code).toMatch(/^JED-\d{4,}$/);
    expect(client.ville).toBe("Jacmel");
    expect(client.actif).toBe(true);
    expect(client.deletedAt).toBeNull();
  });

  it("récupère un client par id", async () => {
    const cree = await creerClient({ nom: "Recherche Test", type: "PARTICULIER", telephone: "1234", ville: "Port-au-Prince" });
    idsCrees.push(cree.id);

    const trouve = await obtenirClient(cree.id);
    expect(trouve?.nom).toBe("Recherche Test");
  });

  it("modifie un client existant", async () => {
    const cree = await creerClient({ nom: "Avant Modif", type: "PARTICULIER", telephone: "1234", ville: "Port-au-Prince" });
    idsCrees.push(cree.id);

    const modifie = await modifierClient(cree.id, { nom: "Après Modif" });
    expect(modifie?.nom).toBe("Après Modif");
  });

  it("modifierClient renvoie null pour un id inexistant", async () => {
    const resultat = await modifierClient("id-qui-nexiste-pas", { nom: "X" });
    expect(resultat).toBeNull();
  });

  it("le soft delete masque le client des recherches normales (§1.12)", async () => {
    const cree = await creerClient({ nom: "À supprimer", type: "PARTICULIER", telephone: "1234", ville: "Port-au-Prince" });
    idsCrees.push(cree.id);

    await supprimerClient(cree.id);

    expect(await obtenirClient(cree.id)).toBeNull();

    // Toujours en base, pas de suppression physique — c'est le point du soft delete.
    const enBase = await prisma.client.findUnique({ where: { id: cree.id } });
    expect(enBase).not.toBeNull();
    expect(enBase?.deletedAt).not.toBeNull();
    expect(enBase?.actif).toBe(false);
  });

  it("un client supprimé n'apparaît pas dans listerClients", async () => {
    const cree = await creerClient({ nom: "Fantome Liste", type: "PARTICULIER", telephone: "1234", ville: "TestVilleUnique" });
    idsCrees.push(cree.id);
    await supprimerClient(cree.id);

    const { data } = await listerClients({ page: 1, limit: 20, ville: "TestVilleUnique" });
    expect(data.find((c) => c.id === cree.id)).toBeUndefined();
  });

  it("filtre par recherche texte (nom, code, téléphone)", async () => {
    const cree = await creerClient({ nom: "UnNomTresSpecifiqueXYZ", type: "PARTICULIER", telephone: "9999999", ville: "Port-au-Prince" });
    idsCrees.push(cree.id);

    const { data } = await listerClients({ page: 1, limit: 20, search: "TresSpecifiqueXYZ" });
    expect(data.some((c) => c.id === cree.id)).toBe(true);
  });

  it("statsClient calcule le montant dû à partir des factures impayées", async () => {
    const client = await creerClient({ nom: "Client Stats", type: "PARTICULIER", telephone: "1111", ville: "Port-au-Prince" });
    idsCrees.push(client.id);

    await prisma.facture.create({
      data: {
        reference: `TEST-STATS-${Date.now()}`,
        clientId: client.id,
        montantHTG: 100_000n,
        totalHTG: 100_000n,
        statut: "EN_ATTENTE",
        dateEcheance: new Date(),
      },
    });

    const stats = await statsClient(client.id);
    expect(stats?.totalFactures).toBe(1);
    expect(stats?.montantDuHTG).toBe(100_000n);

    await prisma.facture.deleteMany({ where: { clientId: client.id } });
  });

  it("statsClient renvoie null pour un client introuvable", async () => {
    expect(await statsClient("id-qui-nexiste-pas")).toBeNull();
  });
});
