import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { referenceIntervention } from "@/lib/codes";

// C'est le test le plus important de tout le plan (§1.3) : la faille la plus
// grave identifiée dans le master prompt v1 était l'absence de protection
// contre le double-booking d'un véhicule ou d'un technicien. Ce test prouve
// que la contrainte d'exclusion PostgreSQL — pas une vérification côté
// application — refuse réellement le chevauchement, y compris sous
// concurrence réelle (Promise.allSettled, pas un test séquentiel qui ne
// prouverait rien sur la course).
describe("contrainte d'exclusion anti double-booking (§1.3, intégration réelle)", () => {
  let clientId: string;
  let vehiculeId: string;
  let userTechId: string;
  let technicienId: string;
  const idsInterventions: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-EXCL-${Date.now()}`, nom: "Client exclusion", telephone: "0000" },
    });
    clientId = client.id;

    const vehicule = await prisma.vehicule.create({
      data: { immatriculation: `TEST-${Date.now()}`, marque: "Test", modele: "Test", type: "CAMION_ASPIRATEUR" },
    });
    vehiculeId = vehicule.id;

    const user = await prisma.user.create({
      data: {
        email: `test-tech-${Date.now()}@jedco.test`,
        passwordHash: "x",
        nom: "Technicien",
        prenom: "Test",
        role: "TECHNICIEN",
      },
    });
    userTechId = user.id;

    const technicien = await prisma.technicien.create({
      data: { userId: user.id, matricule: `TEST-TECH-${Date.now()}` },
    });
    technicienId = technicien.id;
  });

  afterAll(async () => {
    await prisma.interventionTechnicien.deleteMany({ where: { technicienId } });
    await prisma.intervention.deleteMany({ where: { id: { in: idsInterventions } } });
    await prisma.technicien.delete({ where: { id: technicienId } });
    await prisma.user.delete({ where: { id: userTechId } });
    await prisma.vehicule.delete({ where: { id: vehiculeId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  async function creerIntervention(overrides: {
    vehiculeId?: string;
    datePlanifiee: Date;
    dureeEstimeeMin?: number;
  }) {
    const reference = await referenceIntervention();
    const intervention = await prisma.intervention.create({
      data: {
        reference,
        clientId,
        type: "VIDANGE",
        adresse: "Test",
        ville: "Port-au-Prince",
        statut: "PLANIFIE",
        datePlanifiee: overrides.datePlanifiee,
        dureeEstimeeMin: overrides.dureeEstimeeMin ?? 60,
        ...(overrides.vehiculeId ? { vehiculeId: overrides.vehiculeId } : {}),
      },
    });
    idsInterventions.push(intervention.id);
    return intervention;
  }

  it("refuse deux interventions sur le même véhicule à des horaires qui se chevauchent — même en séquentiel", async () => {
    const debut = new Date("2027-01-10T09:00:00Z");

    await creerIntervention({ vehiculeId, datePlanifiee: debut, dureeEstimeeMin: 60 });

    // 09:30, chevauche [09:00, 10:00) de la première.
    const chevauchement = new Date("2027-01-10T09:30:00Z");
    await expect(creerIntervention({ vehiculeId, datePlanifiee: chevauchement, dureeEstimeeMin: 60 })).rejects.toThrow();
  });

  it("autorise deux interventions sur le même véhicule à des horaires qui NE se chevauchent PAS", async () => {
    const debut = new Date("2027-01-11T09:00:00Z");
    await creerIntervention({ vehiculeId, datePlanifiee: debut, dureeEstimeeMin: 60 });

    // 10:00 exactement — la première se termine à 10:00 (borne exclusive '[)'),
    // donc pas de chevauchement.
    const apres = new Date("2027-01-11T10:00:00Z");
    const deuxieme = await creerIntervention({ vehiculeId, datePlanifiee: apres, dureeEstimeeMin: 60 });
    expect(deuxieme.id).toBeTruthy();
  });

  it("refuse le chevauchement même sous concurrence réelle (Promise.allSettled)", async () => {
    const debut = new Date("2027-01-12T14:00:00Z");
    const chevauchement = new Date("2027-01-12T14:15:00Z");

    // Les deux tentatives partent en même temps — c'est exactement le
    // scénario "deux dispatchers cliquent en même temps" du plan. Un test
    // séquentiel (créer A, puis tenter B) ne prouve pas que la protection
    // tient sous course réelle ; celui-ci le prouve.
    const resultats = await Promise.allSettled([
      creerIntervention({ vehiculeId, datePlanifiee: debut, dureeEstimeeMin: 60 }),
      creerIntervention({ vehiculeId, datePlanifiee: chevauchement, dureeEstimeeMin: 60 }),
    ]);

    const reussies = resultats.filter((r) => r.status === "fulfilled");
    const echouees = resultats.filter((r) => r.status === "rejected");

    expect(reussies).toHaveLength(1);
    expect(echouees).toHaveLength(1);
  });

  it("refuse d'affecter le même technicien à deux interventions qui se chevauchent", async () => {
    const i1 = await creerIntervention({ datePlanifiee: new Date("2027-01-13T09:00:00Z"), dureeEstimeeMin: 60 });
    const i2 = await creerIntervention({ datePlanifiee: new Date("2027-01-13T09:30:00Z"), dureeEstimeeMin: 60 });

    await prisma.interventionTechnicien.create({
      data: { interventionId: i1.id, technicienId },
    });

    await expect(
      prisma.interventionTechnicien.create({ data: { interventionId: i2.id, technicienId } })
    ).rejects.toThrow();
  });

  it("autorise le même technicien sur deux interventions qui ne se chevauchent pas", async () => {
    const i1 = await creerIntervention({ datePlanifiee: new Date("2027-01-14T09:00:00Z"), dureeEstimeeMin: 60 });
    const i2 = await creerIntervention({ datePlanifiee: new Date("2027-01-14T11:00:00Z"), dureeEstimeeMin: 60 });

    await prisma.interventionTechnicien.create({ data: { interventionId: i1.id, technicienId } });
    const deuxieme = await prisma.interventionTechnicien.create({
      data: { interventionId: i2.id, technicienId },
    });
    expect(deuxieme.id).toBeTruthy();
  });

  it("libère le créneau technicien quand l'intervention est annulée", async () => {
    const i1 = await creerIntervention({ datePlanifiee: new Date("2027-01-15T09:00:00Z"), dureeEstimeeMin: 60 });
    const i2 = await creerIntervention({ datePlanifiee: new Date("2027-01-15T09:15:00Z"), dureeEstimeeMin: 60 });

    await prisma.interventionTechnicien.create({ data: { interventionId: i1.id, technicienId } });

    // Sans annulation, ceci échouerait (chevauchement) — on le vérifie d'abord.
    await expect(
      prisma.interventionTechnicien.create({ data: { interventionId: i2.id, technicienId } })
    ).rejects.toThrow();

    // Le trigger de propagation doit libérer le créneau du technicien quand
    // l'intervention passe à ANNULE.
    await prisma.intervention.update({ where: { id: i1.id }, data: { statut: "ANNULE" } });

    const deuxieme = await prisma.interventionTechnicien.create({
      data: { interventionId: i2.id, technicienId },
    });
    expect(deuxieme.id).toBeTruthy();
  });

  it("libère le créneau véhicule quand l'intervention est complétée", async () => {
    const debut = new Date("2027-01-16T09:00:00Z");
    const premiere = await creerIntervention({ vehiculeId, datePlanifiee: debut, dureeEstimeeMin: 60 });

    await prisma.intervention.update({ where: { id: premiere.id }, data: { statut: "COMPLETE" } });

    // Même créneau, même véhicule — mais la première est COMPLETE, donc hors
    // du filtre WHERE de la contrainte : plus de conflit.
    const deuxieme = await creerIntervention({ vehiculeId, datePlanifiee: debut, dureeEstimeeMin: 60 });
    expect(deuxieme.id).toBeTruthy();
  });
});
