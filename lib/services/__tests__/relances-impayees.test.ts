import "dotenv/config";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import * as emailLib from "@/lib/email";
import { creerFacture } from "@/lib/services/factures";
import { envoyerRelancesImpayees, ACTION_RELANCE } from "../relances-impayees";

// Même garde-fou que auth-client.test.ts : RESEND_ENVOI_ACTIF est désactivé
// dans cet environnement, on intercepte donc l'envoi réel pour tester la
// logique de paliers indépendamment de Resend.
vi.spyOn(emailLib, "envoyerEmailSimple").mockResolvedValue(undefined);

describe("envoyerRelancesImpayees (intégration réelle)", () => {
  const idsClients: string[] = [];
  const idsFactures: string[] = [];

  beforeEach(() => {
    vi.mocked(emailLib.envoyerEmailSimple).mockClear();
  });

  afterAll(async () => {
    await prisma.paiement.deleteMany({ where: { factureId: { in: idsFactures } } });
    await prisma.ligneFacture.deleteMany({ where: { factureId: { in: idsFactures } } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: idsFactures } } });
    await prisma.facture.deleteMany({ where: { id: { in: idsFactures } } });
    await prisma.client.deleteMany({ where: { id: { in: idsClients } } });
    await prisma.$disconnect();
  });

  async function creerFactureEnRetard(joursRetard: number, email: string | null = `relance-${Date.now()}-${Math.random()}@example.com`) {
    const client = await prisma.client.create({
      data: { code: `TEST-RELANCE-${Date.now()}-${Math.random()}`, nom: "Client relance", telephone: "0000", email },
    });
    idsClients.push(client.id);

    const facture = await creerFacture({
      clientId: client.id,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    const dateEcheance = new Date(Date.now() - joursRetard * 86_400_000);
    await prisma.facture.update({ where: { id: facture.id }, data: { statut: "EN_RETARD", dateEcheance } });

    return { client, facture: { ...facture, dateEcheance } };
  }

  it("n'envoie rien avant le premier palier (7 jours)", async () => {
    await creerFactureEnRetard(3);
    const resultat = await envoyerRelancesImpayees();
    expect(resultat.envoyees).toBe(0);
  });

  it("envoie la relance à 7 jours puis ne la renvoie pas le lendemain", async () => {
    const { facture } = await creerFactureEnRetard(7);

    const premier = await envoyerRelancesImpayees();
    expect(premier.envoyees).toBeGreaterThanOrEqual(1);
    expect(vi.mocked(emailLib.envoyerEmailSimple)).toHaveBeenCalled();

    const trace = await prisma.auditLog.findFirst({ where: { action: ACTION_RELANCE, entityId: facture.id } });
    expect((trace?.metadata as { palier?: number } | null)?.palier).toBe(7);

    vi.mocked(emailLib.envoyerEmailSimple).mockClear();
    const second = await envoyerRelancesImpayees();
    const appelsPourCetteFacture = vi
      .mocked(emailLib.envoyerEmailSimple)
      .mock.calls.filter((c) => c[0].sujet.includes(facture.reference));
    expect(appelsPourCetteFacture).toHaveLength(0);
    expect(second.examinees).toBeGreaterThanOrEqual(1);
  });

  it("saute directement au palier le plus élevé atteint sans renvoyer les paliers intermédiaires", async () => {
    // Simule un lot qui n'a pas tourné depuis longtemps : la facture est déjà
    // à 20 jours de retard la première fois qu'on l'examine.
    const { facture } = await creerFactureEnRetard(20);

    await envoyerRelancesImpayees();
    const trace = await prisma.auditLog.findFirst({ where: { action: ACTION_RELANCE, entityId: facture.id } });
    // Palier 15 atteint (20 >= 15), palier 30 non atteint : un seul e-mail,
    // jamais deux le même jour pour rattraper le palier 7 manqué.
    expect((trace?.metadata as { palier?: number } | null)?.palier).toBe(15);

    const nombreTraces = await prisma.auditLog.count({ where: { action: ACTION_RELANCE, entityId: facture.id } });
    expect(nombreTraces).toBe(1);
  });

  it("compte les factures sans e-mail client sans tenter de leur envoyer quoi que ce soit", async () => {
    const { facture } = await creerFactureEnRetard(10, null);
    const resultat = await envoyerRelancesImpayees();
    expect(resultat.sansEmail).toBeGreaterThanOrEqual(1);

    const trace = await prisma.auditLog.findFirst({ where: { action: ACTION_RELANCE, entityId: facture.id } });
    expect(trace).toBeNull();
  });

  it("isole les échecs d'envoi : une facture en échec n'empêche pas les autres d'être relancées", async () => {
    const { facture: enEchec } = await creerFactureEnRetard(7);
    const { facture: enOrdre } = await creerFactureEnRetard(7);

    vi.mocked(emailLib.envoyerEmailSimple).mockImplementationOnce(async () => {
      throw new Error("échec réseau simulé");
    });

    const resultat = await envoyerRelancesImpayees();
    expect(resultat.echecs).toBeGreaterThanOrEqual(1);
    expect(resultat.envoyees).toBeGreaterThanOrEqual(1);

    const traceOrdre = await prisma.auditLog.findFirst({ where: { action: ACTION_RELANCE, entityId: enOrdre.id } });
    const traceEchec = await prisma.auditLog.findFirst({ where: { action: ACTION_RELANCE, entityId: enEchec.id } });
    // L'une des deux a bien été journalisée, l'autre non — laquelle dépend de
    // l'ordre de la requête, non déterministe ; ce qui compte est qu'au moins
    // une réussite et un échec coexistent sans que l'un bloque l'autre.
    expect([traceOrdre, traceEchec].filter(Boolean)).toHaveLength(1);
  });
});
