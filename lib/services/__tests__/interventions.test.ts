import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import {
  creerIntervention,
  obtenirIntervention,
  modifierIntervention,
  changerStatutIntervention,
  ajouterRapportExecution,
  listerInterventions,
  planningDuJour,
  compterInterventionsNonFacturees,
  statsParCanal,
  type UtilisateurScope,
} from "../interventions";

describe("module Interventions (intégration réelle)", () => {
  let clientId: string;
  let vehiculeId: string;
  let userAdminId: string;
  let userTechId: string;
  let technicienId: string;
  const idsInterventions: string[] = [];

  const admin: UtilisateurScope = { id: "", role: "ADMIN" };
  let technicienScope: UtilisateurScope;
  let autreTechnicienScope: UtilisateurScope;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-INT-${Date.now()}`, nom: "Client interventions", telephone: "0000" },
    });
    clientId = client.id;

    const vehicule = await prisma.vehicule.create({
      data: { immatriculation: `TEST-INT-${Date.now()}`, marque: "T", modele: "T", type: "CAMION_ASPIRATEUR" },
    });
    vehiculeId = vehicule.id;

    const admUser = await prisma.user.create({
      data: { email: `test-admin-int-${Date.now()}@jedco.test`, passwordHash: "x", nom: "A", prenom: "A", role: "ADMIN" },
    });
    userAdminId = admUser.id;
    admin.id = admUser.id;

    const techUser = await prisma.user.create({
      data: { email: `test-tech-int-${Date.now()}@jedco.test`, passwordHash: "x", nom: "T", prenom: "T", role: "TECHNICIEN" },
    });
    userTechId = techUser.id;
    const technicien = await prisma.technicien.create({
      data: { userId: techUser.id, matricule: `TEST-INT-TECH-${Date.now()}` },
    });
    technicienId = technicien.id;
    technicienScope = { id: techUser.id, role: "TECHNICIEN", technicien: { id: technicien.id } };
    autreTechnicienScope = { id: "autre-user-id", role: "TECHNICIEN", technicien: { id: "autre-technicien-id" } };
  });

  afterAll(async () => {
    await prisma.media.deleteMany({ where: { interventionId: { in: idsInterventions } } });
    await prisma.interventionTechnicien.deleteMany({ where: { technicienId } });
    await prisma.intervention.deleteMany({ where: { id: { in: idsInterventions } } });
    await prisma.technicien.delete({ where: { id: technicienId } });
    await prisma.user.deleteMany({ where: { id: { in: [userAdminId, userTechId] } } });
    await prisma.vehicule.delete({ where: { id: vehiculeId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  it("crée une intervention avec une référence INT-<année>-XXXX", async () => {
    const intervention = await creerIntervention({
      clientId,
      type: "VIDANGE",
      adresse: "12 Rue Test",
      ville: "Port-au-Prince",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      dureeEstimeeMin: 60,
      technicienIds: [],
    });
    idsInterventions.push(intervention.id);

    const annee = new Date().getFullYear();
    expect(intervention.reference).toMatch(new RegExp(`^INT-${annee}-\\d{4,}$`));
    expect(intervention.statut).toBe("EN_ATTENTE");
  });

  it("refuse de créer une intervention pour un client inexistant", async () => {
    await expect(
      creerIntervention({
        clientId: "id-inexistant",
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [],
      })
    ).rejects.toThrow(ErreurMetier);
  });

  it("crée une intervention avec véhicule et technicien affectés d'emblée", async () => {
    const intervention = await creerIntervention({
      clientId,
      type: "COLLECTE",
      adresse: "x",
      ville: "x",
      priorite: "URGENTE",
      canal: "TELEPHONE",
      datePlanifiee: new Date("2027-02-01T09:00:00Z"),
      dureeEstimeeMin: 45,
      vehiculeId,
      technicienIds: [technicienId],
    });
    idsInterventions.push(intervention.id);

    expect(intervention.vehicule?.id).toBe(vehiculeId);
    expect(intervention.techniciens).toHaveLength(1);
  });

  it("la portée technicien (§1.6) ne renvoie que les interventions assignées", async () => {
    const assignee = await creerIntervention({
      clientId,
      type: "VIDANGE",
      adresse: "x",
      ville: "x",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      dureeEstimeeMin: 60,
      technicienIds: [technicienId],
    });
    idsInterventions.push(assignee.id);

    const nonAssignee = await creerIntervention({
      clientId,
      type: "VIDANGE",
      adresse: "x",
      ville: "x",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      dureeEstimeeMin: 60,
      technicienIds: [],
    });
    idsInterventions.push(nonAssignee.id);

    // Le technicien voit l'intervention qui lui est assignée...
    expect(await obtenirIntervention(assignee.id, technicienScope)).not.toBeNull();
    // ...mais pas celle qui ne l'est pas.
    expect(await obtenirIntervention(nonAssignee.id, technicienScope)).toBeNull();
    // Un technicien sans fiche liée ne voit jamais rien, même l'assignée d'un autre.
    expect(await obtenirIntervention(assignee.id, autreTechnicienScope)).toBeNull();
    // ADMIN voit tout.
    expect(await obtenirIntervention(assignee.id, admin)).not.toBeNull();
    expect(await obtenirIntervention(nonAssignee.id, admin)).not.toBeNull();
  });

  it("modifie une intervention", async () => {
    const intervention = await creerIntervention({
      clientId,
      type: "VIDANGE",
      adresse: "avant",
      ville: "x",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      dureeEstimeeMin: 60,
      technicienIds: [],
    });
    idsInterventions.push(intervention.id);

    const modifiee = await modifierIntervention(intervention.id, { adresse: "après" }, admin);
    expect(modifiee?.adresse).toBe("après");
  });

  describe("machine à états (intégration)", () => {
    it("suit le chemin nominal EN_ATTENTE → PLANIFIE → EN_COURS → COMPLETE", async () => {
      const intervention = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(intervention.id);

      let resultat = await changerStatutIntervention(intervention.id, "PLANIFIE", admin);
      expect(resultat?.intervention.statut).toBe("PLANIFIE");
      expect(resultat?.factureProposee).toBe(false);

      resultat = await changerStatutIntervention(intervention.id, "EN_COURS", admin);
      expect(resultat?.intervention.statut).toBe("EN_COURS");

      resultat = await changerStatutIntervention(intervention.id, "COMPLETE", admin);
      expect(resultat?.intervention.statut).toBe("COMPLETE");
      expect(resultat?.factureProposee).toBe(true);
    });

    it("refuse de sauter une étape", async () => {
      const intervention = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(intervention.id);

      await expect(changerStatutIntervention(intervention.id, "EN_COURS", admin)).rejects.toThrow(ErreurMetier);
    });

    it("changerStatutIntervention renvoie null pour une intervention introuvable (portée)", async () => {
      const intervention = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(intervention.id);

      // Un technicien non assigné ne peut même pas changer le statut d'une
      // intervention qu'il ne voit pas — c'est la portée §1.6 qui l'empêche.
      expect(await changerStatutIntervention(intervention.id, "PLANIFIE", autreTechnicienScope)).toBeNull();
    });
  });

  it("ajoute un rapport d'exécution avec photos", async () => {
    const intervention = await creerIntervention({
      clientId,
      type: "VIDANGE",
      adresse: "x",
      ville: "x",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      dureeEstimeeMin: 60,
      technicienIds: [],
    });
    idsInterventions.push(intervention.id);

    const misAJour = await ajouterRapportExecution(
      intervention.id,
      {
        notes: "Tout s'est bien passé",
        observations: "RAS",
        photos: ["https://media.jedco.ht/interventions/x/1.jpg"],
      },
      admin
    );

    expect(misAJour?.rapportExecution).toMatchObject({ notes: "Tout s'est bien passé" });

    const medias = await prisma.media.findMany({ where: { interventionId: intervention.id } });
    expect(medias).toHaveLength(1);
  });

  it("liste les interventions filtrées par ville et pagine correctement", async () => {
    const villeUnique = `VilleTest${Date.now()}`;
    const intervention = await creerIntervention({
      clientId,
      type: "VIDANGE",
      adresse: "x",
      ville: villeUnique,
      priorite: "NORMALE",
      canal: "TELEPHONE",
      dureeEstimeeMin: 60,
      technicienIds: [],
    });
    idsInterventions.push(intervention.id);

    const { data, meta } = await listerInterventions({ page: 1, limit: 20, ville: villeUnique }, admin);
    expect(data).toHaveLength(1);
    expect(meta.total).toBe(1);
  });

  it("la recherche trouve une intervention par le nom du client (jointure), insensible aux accents", async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-INT-RECH-${Date.now()}`, nom: "Ézéchiel Joseph Unique", telephone: "0000" },
    });
    const intervention = await creerIntervention({
      clientId: client.id,
      type: "VIDANGE",
      adresse: "x",
      ville: "x",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      dureeEstimeeMin: 60,
      technicienIds: [],
    });

    try {
      const { data } = await listerInterventions({ page: 1, limit: 1, search: "ezechiel joseph" }, admin);
      expect(data.some((i) => i.id === intervention.id)).toBe(true);
    } finally {
      await prisma.intervention.delete({ where: { id: intervention.id } });
      await prisma.client.delete({ where: { id: client.id } });
    }
  });

  it("planningDuJour groupe les interventions par technicien ET par véhicule", async () => {
    const date = new Date("2027-03-01T12:00:00Z");
    const intervention = await creerIntervention({
      clientId,
      type: "VIDANGE",
      adresse: "x",
      ville: "x",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      datePlanifiee: date,
      dureeEstimeeMin: 60,
      vehiculeId,
      technicienIds: [technicienId],
    });
    idsInterventions.push(intervention.id);

    const planning = await planningDuJour(date);
    expect(planning.parTechnicien[technicienId]).toBeDefined();
    expect(planning.parTechnicien[technicienId].some((i) => i.id === intervention.id)).toBe(true);
    expect(planning.parVehicule[vehiculeId]).toBeDefined();
    expect(planning.parVehicule[vehiculeId].some((i) => i.id === intervention.id)).toBe(true);
  });

  it("planningDuJour range une intervention sans véhicule sous \"non_assigne\"", async () => {
    const date = new Date("2027-03-02T12:00:00Z");
    const intervention = await creerIntervention({
      clientId,
      type: "VIDANGE",
      adresse: "x",
      ville: "x",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      datePlanifiee: date,
      dureeEstimeeMin: 60,
      technicienIds: [],
    });
    idsInterventions.push(intervention.id);

    const planning = await planningDuJour(date);
    expect(planning.parVehicule.non_assigne.some((i) => i.id === intervention.id)).toBe(true);
    expect(planning.parTechnicien.non_assigne.some((i) => i.id === intervention.id)).toBe(true);
  });

  describe("filtre nonFacturees — \"Facturé\" n'est pas un statut, c'est calculé", () => {
    // Timeout étendu : ce test enchaîne une quinzaine d'allers-retours base
    // (création, transitions de statut, rapport, facture) pour trois
    // interventions — le défaut de 40s (vitest.config.ts) est parfois trop
    // court avec la latence réseau vers Railway.
    it("liste une intervention COMPLETE sans facture, exclut une COMPLETE facturée et une EN_COURS", async () => {
      const sansFacture = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(sansFacture.id);
      await changerStatutIntervention(sansFacture.id, "PLANIFIE", admin);
      await changerStatutIntervention(sansFacture.id, "EN_COURS", admin);
      await ajouterRapportExecution(sansFacture.id, { notes: "fait", photos: [] }, admin);
      await changerStatutIntervention(sansFacture.id, "COMPLETE", admin);

      const avecFacture = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(avecFacture.id);
      await changerStatutIntervention(avecFacture.id, "PLANIFIE", admin);
      await changerStatutIntervention(avecFacture.id, "EN_COURS", admin);
      await ajouterRapportExecution(avecFacture.id, { notes: "fait", photos: [] }, admin);
      await changerStatutIntervention(avecFacture.id, "COMPLETE", admin);
      const facture = await prisma.facture.create({
        data: {
          reference: `TEST-INT-FAC-${Date.now()}`,
          clientId,
          interventionId: avecFacture.id,
          montantHTG: 1000n,
          totalHTG: 1000n,
          statut: "EN_ATTENTE",
          dateEcheance: new Date(Date.now() + 30 * 86_400_000),
        },
      });

      const enCours = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(enCours.id);
      await changerStatutIntervention(enCours.id, "PLANIFIE", admin);
      await changerStatutIntervention(enCours.id, "EN_COURS", admin);

      try {
        const { data } = await listerInterventions({ page: 1, limit: 100, nonFacturees: true }, admin);
        const ids = data.map((i) => i.id);
        expect(ids).toContain(sansFacture.id);
        expect(ids).not.toContain(avecFacture.id);
        expect(ids).not.toContain(enCours.id);

        const compte = await compterInterventionsNonFacturees(admin);
        expect(compte).toBeGreaterThanOrEqual(1);
      } finally {
        await prisma.paiement.deleteMany({ where: { factureId: facture.id } });
        await prisma.ligneFacture.deleteMany({ where: { factureId: facture.id } });
        await prisma.facture.delete({ where: { id: facture.id } });
      }
    }, 90_000);

    it("compterInterventionsNonFacturees respecte le même périmètre RBAC que listerInterventions", async () => {
      const intervention = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [technicienId],
      });
      idsInterventions.push(intervention.id);
      await changerStatutIntervention(intervention.id, "PLANIFIE", technicienScope);
      await changerStatutIntervention(intervention.id, "EN_COURS", technicienScope);
      await ajouterRapportExecution(intervention.id, { notes: "fait", photos: [] }, technicienScope);
      await changerStatutIntervention(intervention.id, "COMPLETE", technicienScope);

      // Le technicien assigné la voit, un autre technicien non assigné ne la
      // voit pas — scopeInterventions (lib/auth/rbac.ts) s'applique ici
      // exactement comme pour listerInterventions.
      const compteAssigne = await compterInterventionsNonFacturees(technicienScope);
      const compteAutre = await compterInterventionsNonFacturees(autreTechnicienScope);
      expect(compteAssigne).toBeGreaterThanOrEqual(1);
      expect(compteAutre).toBe(0);
    });
  });

  describe("canal d'origine (WEB/TELEPHONE/TERRAIN)", () => {
    it("TELEPHONE par défaut si non précisé, respecté sinon", async () => {
      const parDefaut = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(parDefaut.id);
      expect(parDefaut.canal).toBe("TELEPHONE");

      const web = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "WEB",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(web.id);
      expect(web.canal).toBe("WEB");
    });

    it("listerInterventions filtre par canal", async () => {
      const terrain = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TERRAIN",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(terrain.id);

      const { data } = await listerInterventions({ page: 1, limit: 100, canal: "TERRAIN" }, admin);
      expect(data.every((i) => i.canal === "TERRAIN")).toBe(true);
      expect(data.some((i) => i.id === terrain.id)).toBe(true);
    });

    it("statsParCanal compte par canal sur la fenêtre donnée", async () => {
      const web = await creerIntervention({
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "WEB",
        dureeEstimeeMin: 60,
        technicienIds: [],
      });
      idsInterventions.push(web.id);

      const hier = new Date(Date.now() - 86_400_000);
      const stats = await statsParCanal(hier);
      expect(stats.WEB).toBeGreaterThanOrEqual(1);

      // Une fenêtre qui commence dans le futur ne peut rien compter.
      const demain = new Date(Date.now() + 86_400_000);
      const statsVides = await statsParCanal(demain);
      expect(statsVides.WEB ?? 0).toBe(0);
    });
  });
});
