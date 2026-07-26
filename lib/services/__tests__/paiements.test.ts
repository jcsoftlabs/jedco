import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import { creerFacture } from "@/lib/services/factures";
import { enregistrerPaiement, listerPaiementsFacture } from "../paiements";

describe("module Paiements (intégration réelle)", () => {
  let clientId: string;
  const idsFactures: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-PAY-${Date.now()}`, nom: "Client paiements", telephone: "0000" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.paiement.deleteMany({ where: { factureId: { in: idsFactures } } });
    await prisma.ligneFacture.deleteMany({ where: { factureId: { in: idsFactures } } });
    await prisma.facture.deleteMany({ where: { id: { in: idsFactures } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  async function nouvelleFacture(montantHTG: number) {
    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: montantHTG }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);
    return facture;
  }

  it("enregistre un paiement et passe la facture en PARTIELLEMENT_PAYEE si le montant ne couvre pas tout", async () => {
    const facture = await nouvelleFacture(10_000);

    const { paiement, dejaTraite } = await enregistrerPaiement(
      { factureId: facture.id, montantHTG: 4_000, mode: "CASH", idempotencyKey: randomUUID() },
      "test-user"
    );

    expect(dejaTraite).toBe(false);
    expect(paiement.montantHTG).toBe(400_000n);

    const enBase = await prisma.facture.findUnique({ where: { id: facture.id } });
    expect(enBase?.statut).toBe("PARTIELLEMENT_PAYEE");
    expect(enBase?.datePaiement).toBeNull();
  });

  it("passe la facture en PAYEE quand le total des paiements couvre le montant dû", async () => {
    const facture = await nouvelleFacture(10_000);

    await enregistrerPaiement(
      { factureId: facture.id, montantHTG: 6_000, mode: "CASH", idempotencyKey: randomUUID() },
      "test-user"
    );
    await enregistrerPaiement(
      { factureId: facture.id, montantHTG: 4_000, mode: "VIREMENT", idempotencyKey: randomUUID() },
      "test-user"
    );

    const enBase = await prisma.facture.findUnique({ where: { id: facture.id } });
    expect(enBase?.statut).toBe("PAYEE");
    expect(enBase?.datePaiement).not.toBeNull();
    expect(enBase?.modePaiement).toBe("VIREMENT");
  });

  it("refuse un paiement qui dépasse le solde dû", async () => {
    const facture = await nouvelleFacture(5_000);

    await expect(
      enregistrerPaiement(
        { factureId: facture.id, montantHTG: 6_000, mode: "CASH", idempotencyKey: randomUUID() },
        "test-user"
      )
    ).rejects.toThrow(ErreurMetier);
  });

  it("refuse un paiement sur une facture déjà payée intégralement", async () => {
    const facture = await nouvelleFacture(5_000);
    await enregistrerPaiement(
      { factureId: facture.id, montantHTG: 5_000, mode: "CASH", idempotencyKey: randomUUID() },
      "test-user"
    );

    await expect(
      enregistrerPaiement(
        { factureId: facture.id, montantHTG: 1, mode: "CASH", idempotencyKey: randomUUID() },
        "test-user"
      )
    ).rejects.toThrow(ErreurMetier);
  });

  it("l'idempotence renvoie le paiement existant plutôt que d'en créer un second — corrige le bug §1.5", async () => {
    const facture = await nouvelleFacture(10_000);
    const cle = randomUUID();

    const premier = await enregistrerPaiement(
      { factureId: facture.id, montantHTG: 3_000, mode: "CASH", idempotencyKey: cle },
      "test-user"
    );
    expect(premier.dejaTraite).toBe(false);

    // Même clé, même appelant — simule un retry réseau après timeout.
    const deuxieme = await enregistrerPaiement(
      { factureId: facture.id, montantHTG: 3_000, mode: "CASH", idempotencyKey: cle },
      "test-user"
    );
    expect(deuxieme.dejaTraite).toBe(true);
    expect(deuxieme.paiement.id).toBe(premier.paiement.id);

    // Un seul paiement en base, pas deux.
    const paiements = await listerPaiementsFacture(facture.id);
    expect(paiements).toHaveLength(1);
  });

  it("refuse deux paiements concurrents dont la somme dépasse le solde dû — protégé par verrou de ligne", async () => {
    const facture = await nouvelleFacture(10_000);

    // Deux paiements de 7000 HTG chacun sur une facture de 10000 HTG : pris
    // isolément chacun semble valide (7000 < 10000), mais ensemble ils
    // dépassent. Sans le SELECT FOR UPDATE, les deux pourraient lire le même
    // solde "10000 disponible" avant qu'aucun n'ait committé, et les deux
    // passeraient — exactement le même type de course que le double-booking.
    const resultats = await Promise.allSettled([
      enregistrerPaiement(
        { factureId: facture.id, montantHTG: 7_000, mode: "CASH", idempotencyKey: randomUUID() },
        "test-user"
      ),
      enregistrerPaiement(
        { factureId: facture.id, montantHTG: 7_000, mode: "CASH", idempotencyKey: randomUUID() },
        "test-user"
      ),
    ]);

    const reussis = resultats.filter((r) => r.status === "fulfilled");
    const echoues = resultats.filter((r) => r.status === "rejected");

    expect(reussis).toHaveLength(1);
    expect(echoues).toHaveLength(1);

    const paiements = await listerPaiementsFacture(facture.id);
    const total = paiements.reduce((s, p) => s + p.montantHTG, 0n);
    expect(total).toBeLessThanOrEqual(1_000_000n); // 10 000 HTG en centimes
  });
});
