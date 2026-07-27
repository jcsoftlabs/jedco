import "dotenv/config";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import * as emailLib from "@/lib/email";
import { creerContrat } from "@/lib/services/contrats";
import { envoyerAlertesRenouvellementContrats, ACTION_ALERTE_RENOUVELLEMENT } from "../alertes-contrats";

// Même garde-fou que relances-impayees.test.ts : RESEND_ENVOI_ACTIF est
// désactivé dans cet environnement, on intercepte donc l'envoi réel pour
// tester la logique de paliers indépendamment de Resend.
vi.spyOn(emailLib, "envoyerEmailSimple").mockResolvedValue(undefined);

// NOTIFICATIONS_EMAIL n'est pas configurée dans cet environnement (facultative
// — voir lib/env.ts). Sans ce mock, le test « l'équipe interne est alertée »
// ne pourrait jamais réussir ici. lib/db.ts lit DATABASE_URL directement
// depuis process.env (pas depuis ce module), donc ce mock n'affecte pas la
// connexion réelle à la base utilisée par le reste du test.
vi.mock("@/lib/env", () => ({ env: { NOTIFICATIONS_EMAIL: "equipe-alerte-test@jedco.test" } }));

describe("envoyerAlertesRenouvellementContrats (intégration réelle)", () => {
  const idsClients: string[] = [];
  const idsContrats: string[] = [];

  beforeEach(() => {
    vi.mocked(emailLib.envoyerEmailSimple).mockClear();
  });

  afterAll(async () => {
    // Ces contrats sont de vrais contrats ACTIF de type MENSUEL, éligibles à
    // genererFacturesRecurrentes — si ce fichier s'exécute en parallèle de
    // taches-planifiees.test.ts (comportement par défaut de Vitest, contre
    // la même base partagée), l'autre fichier peut leur générer une facture
    // à tout moment. On les sort d'abord de l'univers ACTIF/non supprimé en
    // une seule requête, pour fermer la fenêtre de course avant de nettoyer
    // ce qui a déjà pu être créé.
    await prisma.contrat.updateMany({
      where: { id: { in: idsContrats } },
      data: { statut: "RESILIE", deletedAt: new Date() },
    });
    // Toute facture référençant l'un de ces clients, pas seulement celles
    // liées par contratId — la cause exacte de ces factures parasites
    // (probablement une exécution CI concurrente contre la même base
    // partagée, aucune table de test isolée n'existant encore, cf. §1.20)
    // reste incertaine, mais la suppression du client doit être robuste à
    // leur présence quelle qu'en soit l'origine.
    const facturesParasites = await prisma.facture.findMany({
      where: { clientId: { in: idsClients } },
      select: { id: true },
    });
    const idsFacturesParasites = facturesParasites.map((f) => f.id);
    await prisma.paiement.deleteMany({ where: { factureId: { in: idsFacturesParasites } } });
    await prisma.ligneFacture.deleteMany({ where: { factureId: { in: idsFacturesParasites } } });
    await prisma.facture.deleteMany({ where: { id: { in: idsFacturesParasites } } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: idsContrats } } });
    await prisma.contrat.deleteMany({ where: { id: { in: idsContrats } } });
    await prisma.client.deleteMany({ where: { id: { in: idsClients } } });
    await prisma.$disconnect();
  });

  async function creerContratExpirantDans(
    jours: number,
    email: string | null = `alerte-${Date.now()}-${Math.random()}@example.com`
  ) {
    const client = await prisma.client.create({
      data: { code: `TEST-ALERTE-${Date.now()}-${Math.random()}`, nom: "Client alerte contrat", telephone: "0000", email },
    });
    idsClients.push(client.id);

    const dateDebut = new Date(Date.now() - 30 * 86_400_000);
    const dateFinInitiale = new Date(Date.now() + 365 * 86_400_000);
    const contrat = await creerContrat({
      clientId: client.id,
      type: "MENSUEL",
      services: ["VIDANGE"],
      montantHTG: 1000,
      dateDebut,
      dateFin: dateFinInitiale,
      renouvellementAuto: false,
    });
    idsContrats.push(contrat.id);

    const dateFin = new Date(Date.now() + jours * 86_400_000);
    await prisma.contrat.update({ where: { id: contrat.id }, data: { dateFin } });

    return { client, contrat: { ...contrat, dateFin } };
  }

  it("n'envoie rien avant le premier palier (30 jours restants)", async () => {
    await creerContratExpirantDans(45);
    const resultat = await envoyerAlertesRenouvellementContrats();
    expect(resultat.envoyees).toBe(0);
  });

  it("envoie l'alerte à 30 jours puis ne la renvoie pas le lendemain", async () => {
    const { contrat } = await creerContratExpirantDans(29);

    const premier = await envoyerAlertesRenouvellementContrats();
    expect(premier.envoyees).toBeGreaterThanOrEqual(1);
    expect(vi.mocked(emailLib.envoyerEmailSimple)).toHaveBeenCalled();

    const trace = await prisma.auditLog.findFirst({
      where: { action: ACTION_ALERTE_RENOUVELLEMENT, entityId: contrat.id },
    });
    expect((trace?.metadata as { palier?: number } | null)?.palier).toBe(30);

    vi.mocked(emailLib.envoyerEmailSimple).mockClear();
    await envoyerAlertesRenouvellementContrats();
    const appelsPourCeContrat = vi
      .mocked(emailLib.envoyerEmailSimple)
      .mock.calls.filter((c) => c[0].sujet.includes(contrat.reference));
    expect(appelsPourCeContrat).toHaveLength(0);
  });

  it("saute directement au palier le plus urgent atteint sans renvoyer les paliers moins urgents", async () => {
    // Simule un lot qui n'a pas tourné depuis longtemps : le contrat est déjà
    // à 5 jours de l'échéance la première fois qu'on l'examine.
    const { contrat } = await creerContratExpirantDans(5);

    await envoyerAlertesRenouvellementContrats();
    const trace = await prisma.auditLog.findFirst({
      where: { action: ACTION_ALERTE_RENOUVELLEMENT, entityId: contrat.id },
    });
    // Paliers 30 et 15 atteints (5 <= 30 et 5 <= 15), mais on envoie le plus
    // urgent (7) directement — jamais trois e-mails le même jour pour
    // rattraper les paliers manqués.
    expect((trace?.metadata as { palier?: number } | null)?.palier).toBe(7);

    const nombreTraces = await prisma.auditLog.count({
      where: { action: ACTION_ALERTE_RENOUVELLEMENT, entityId: contrat.id },
    });
    expect(nombreTraces).toBe(1);
  });

  it("alerte l'équipe interne même si le client n'a pas d'e-mail", async () => {
    const { contrat } = await creerContratExpirantDans(20, null);
    const resultat = await envoyerAlertesRenouvellementContrats();
    expect(resultat.envoyees).toBeGreaterThanOrEqual(1);

    const trace = await prisma.auditLog.findFirst({
      where: { action: ACTION_ALERTE_RENOUVELLEMENT, entityId: contrat.id },
    });
    expect(trace).not.toBeNull();
  });

  it("ignore les contrats PONCTUEL, qui ne sont pas renouvelables", async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-ALERTE-PONCTUEL-${Date.now()}`, nom: "Client ponctuel", telephone: "0000" },
    });
    idsClients.push(client.id);

    const contrat = await creerContrat({
      clientId: client.id,
      type: "PONCTUEL",
      services: ["VIDANGE"],
      montantHTG: 1000,
      dateDebut: new Date(Date.now() - 30 * 86_400_000),
      dateFin: new Date(Date.now() + 365 * 86_400_000),
      renouvellementAuto: false,
    });
    idsContrats.push(contrat.id);
    await prisma.contrat.update({ where: { id: contrat.id }, data: { dateFin: new Date(Date.now() + 5 * 86_400_000) } });

    await envoyerAlertesRenouvellementContrats();
    const trace = await prisma.auditLog.findFirst({
      where: { action: ACTION_ALERTE_RENOUVELLEMENT, entityId: contrat.id },
    });
    expect(trace).toBeNull();
  });
});
