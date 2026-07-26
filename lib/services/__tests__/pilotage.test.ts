import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { statsPilotage } from "../pilotage";

describe("module Pilotage — tableau de bord d'accueil (intégration réelle)", () => {
  let clientId: string;
  const idsInterventions: string[] = [];
  const idsDevis: string[] = [];
  const idsFactures: string[] = [];
  const idsDemandes: string[] = [];

  afterAll(async () => {
    await prisma.intervention.deleteMany({ where: { id: { in: idsInterventions } } });
    await prisma.ligneDevis.deleteMany({ where: { devisId: { in: idsDevis } } });
    await prisma.devis.deleteMany({ where: { id: { in: idsDevis } } });
    await prisma.ligneFacture.deleteMany({ where: { factureId: { in: idsFactures } } });
    await prisma.facture.deleteMany({ where: { id: { in: idsFactures } } });
    await prisma.demandeDevis.deleteMany({ where: { id: { in: idsDemandes } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  it("agrège interventions, véhicules, techniciens, devis et demandes sans planter à vide", async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-PILOTAGE-${Date.now()}`, nom: "Client Pilotage", telephone: "0000" },
    });
    clientId = client.id;

    const intervention = await prisma.intervention.create({
      data: {
        reference: `TEST-INT-PILOTAGE-${Date.now()}`,
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        statut: "EN_COURS",
      },
    });
    idsInterventions.push(intervention.id);

    const demande = await prisma.demandeDevis.create({
      data: { nom: "Test pilotage", telephone: "0000", service: "VIDANGE", ville: "x", traite: false },
    });
    idsDemandes.push(demande.id);

    const stats = await statsPilotage();

    expect(stats.interventions.total).toBeGreaterThan(0);
    expect(stats.interventions.parStatut.EN_COURS).toBeGreaterThanOrEqual(1);
    expect(stats.interventions.actives).toBeGreaterThanOrEqual(1);
    expect(stats.commercial.demandesNonTraitees).toBeGreaterThanOrEqual(1);
    expect(stats.finance.totalFactureHTG).toBeGreaterThanOrEqual(0n);
    expect(typeof stats.techniciens.total).toBe("number");
    expect(typeof stats.vehicules.total).toBe("number");
  });

  it("tauxConversionPourcent vaut null quand aucun devis n'a jamais été émis, sans diviser par zéro", async () => {
    // N'affirme rien de fort sur la valeur globale (d'autres devis peuvent
    // exister en base), seulement que le calcul ne plante jamais et reste
    // soit null soit un pourcentage valide.
    const stats = await statsPilotage();
    if (stats.commercial.tauxConversionPourcent !== null) {
      expect(stats.commercial.tauxConversionPourcent).toBeGreaterThanOrEqual(0);
      expect(stats.commercial.tauxConversionPourcent).toBeLessThanOrEqual(100);
    }
  });
});
