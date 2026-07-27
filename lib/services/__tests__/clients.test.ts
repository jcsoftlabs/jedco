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
  listerVillesClients,
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

  it("modifierClient efface adresse/email quand le schéma les convertit en null", async () => {
    const cree = await creerClient({
      nom: "Avec coordonnées",
      type: "PARTICULIER",
      telephone: "1234",
      ville: "Port-au-Prince",
      adresse: "12 Rue X",
      email: "avant@example.com",
    });
    idsCrees.push(cree.id);

    // modifierClientSchema.parse({ adresse: "", email: "" }) produirait
    // exactement { adresse: null, email: null } — voir
    // lib/schemas/__tests__/clients.test.ts pour cette conversion. On simule
    // directement le résultat du parse ici pour tester la persistance.
    const modifie = await modifierClient(cree.id, { adresse: null, email: null });
    expect(modifie?.adresse).toBeNull();
    expect(modifie?.email).toBeNull();
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

  it("la recherche est insensible aux accents — saisir sans accent trouve un nom accentué", async () => {
    const cree = await creerClient({
      nom: "Pétionville Spécial Test",
      type: "PARTICULIER",
      telephone: "1234",
      ville: "Port-au-Prince",
    });
    idsCrees.push(cree.id);

    const { data } = await listerClients({ page: 1, limit: 20, search: "petionville special" });
    expect(data.some((c) => c.id === cree.id)).toBe(true);
  });

  it("la recherche exige tous les mots (ET), pas juste l'un d'entre eux", async () => {
    const cree = await creerClient({
      nom: "Jean Baptiste Unique Test",
      type: "PARTICULIER",
      telephone: "1234",
      ville: "Port-au-Prince",
    });
    idsCrees.push(cree.id);

    const { data: avecLesDeuxMots } = await listerClients({ page: 1, limit: 20, search: "jean baptiste unique" });
    expect(avecLesDeuxMots.some((c) => c.id === cree.id)).toBe(true);

    const { data: avecMotAbsent } = await listerClients({
      page: 1,
      limit: 20,
      search: "jean motquinexistepasdutout",
    });
    expect(avecMotAbsent.some((c) => c.id === cree.id)).toBe(false);
  });

  it("la recherche porte sur toute la table, pas seulement la page demandée", async () => {
    // Corrige le bug initial : avant, un enregistrement au-delà du lot chargé
    // par la page admin était introuvable par la recherche. Ici, limit: 1
    // simule un client hors de la "première page" — il doit rester trouvable.
    const cree = await creerClient({
      nom: "AuDelaDeLaPageChargeeXYZ",
      type: "PARTICULIER",
      telephone: "1234",
      ville: "Port-au-Prince",
    });
    idsCrees.push(cree.id);

    const { data, meta } = await listerClients({ page: 1, limit: 1, search: "AuDelaDeLaPageChargeeXYZ" });
    expect(meta.total).toBe(1);
    expect(data[0]?.id).toBe(cree.id);
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

  describe("segmentation (zone, service, statut de paiement)", () => {
    const suffix = Date.now();
    let clientImpaye: string;
    let clientEnRegle: string;
    let clientVidange: string;

    afterAll(async () => {
      await prisma.facture.deleteMany({ where: { clientId: { in: [clientImpaye, clientEnRegle, clientVidange] } } });
      await prisma.contrat.deleteMany({ where: { clientId: clientVidange } });
    });

    it("prépare trois clients : deux à Jacmel (un impayé, un en règle), un aux Cayes avec un contrat Vidange actif", async () => {
      const jacmelImpaye = await creerClient({
        nom: `Segment Jacmel Impayé ${suffix}`,
        type: "PARTICULIER",
        telephone: "0000",
        ville: "Jacmel",
      });
      clientImpaye = jacmelImpaye.id;
      idsCrees.push(clientImpaye);

      const jacmelRegle = await creerClient({
        nom: `Segment Jacmel Réglé ${suffix}`,
        type: "PARTICULIER",
        telephone: "0000",
        ville: "Jacmel",
      });
      clientEnRegle = jacmelRegle.id;
      idsCrees.push(clientEnRegle);

      const cayesVidange = await creerClient({
        nom: `Segment Cayes Vidange ${suffix}`,
        type: "PARTICULIER",
        telephone: "0000",
        ville: "Les Cayes",
      });
      clientVidange = cayesVidange.id;
      idsCrees.push(clientVidange);

      await prisma.facture.create({
        data: {
          reference: `TEST-SEGMENT-FAC-${suffix}`,
          clientId: clientImpaye,
          montantHTG: 1000n,
          totalHTG: 1000n,
          statut: "EN_ATTENTE",
          dateEcheance: new Date(Date.now() + 30 * 86_400_000),
        },
      });

      await prisma.contrat.create({
        data: {
          reference: `TEST-SEGMENT-CTR-${suffix}`,
          clientId: clientVidange,
          type: "MENSUEL",
          services: ["VIDANGE"],
          montantHTG: 1000n,
          dateDebut: new Date(Date.now() - 10 * 86_400_000),
          dateFin: new Date(Date.now() + 300 * 86_400_000),
          statut: "ACTIF",
        },
      });
    });

    it("filtre par zone", async () => {
      const { data } = await listerClients({ page: 1, limit: 100, ville: "Jacmel" });
      const noms = data.map((c) => c.id);
      expect(noms).toContain(clientImpaye);
      expect(noms).toContain(clientEnRegle);
      expect(noms).not.toContain(clientVidange);
    });

    it("filtre par statut de paiement IMPAYE", async () => {
      const { data } = await listerClients({ page: 1, limit: 100, statutPaiement: "IMPAYE" });
      const ids = data.map((c) => c.id);
      expect(ids).toContain(clientImpaye);
      expect(ids).not.toContain(clientEnRegle);
    });

    it("filtre par statut de paiement EN_REGLE", async () => {
      const { data } = await listerClients({ page: 1, limit: 100, statutPaiement: "EN_REGLE" });
      const ids = data.map((c) => c.id);
      expect(ids).toContain(clientEnRegle);
      expect(ids).toContain(clientVidange);
      expect(ids).not.toContain(clientImpaye);
    });

    it("filtre par service consommé via un contrat actif", async () => {
      const { data } = await listerClients({ page: 1, limit: 100, service: "VIDANGE" });
      const ids = data.map((c) => c.id);
      expect(ids).toContain(clientVidange);
      expect(ids).not.toContain(clientImpaye);
      expect(ids).not.toContain(clientEnRegle);
    });

    it("combine plusieurs filtres à la fois (ET logique)", async () => {
      const { data } = await listerClients({
        page: 1,
        limit: 100,
        ville: "Jacmel",
        statutPaiement: "IMPAYE",
      });
      const ids = data.map((c) => c.id);
      expect(ids).toContain(clientImpaye);
      expect(ids).not.toContain(clientEnRegle);
    });

    it("listerVillesClients renvoie des zones distinctes triées, sans doublon", async () => {
      const villes = await listerVillesClients();
      expect(villes).toContain("Jacmel");
      expect(villes).toContain("Les Cayes");
      expect(new Set(villes).size).toBe(villes.length);
      expect(villes).toEqual([...villes].sort());
    });
  });
});
