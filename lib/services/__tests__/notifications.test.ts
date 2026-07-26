import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import { creerFacture } from "@/lib/services/factures";
import { creerDevis } from "@/lib/services/devis";
import { envoyerFactureParEmail, envoyerDevisParEmail } from "../notifications";

// RESEND_ENVOI_ACTIF n'est pas positionnée dans l'environnement de test — elle
// doit donc valoir false par défaut (voir lib/env.ts), et ces tests le
// vérifient : aucun appel réseau vers Resend ne doit jamais partir tant que
// le domaine d'envoi n'est pas vérifié en production.
describe("envoi de factures/devis par e-mail (intégration réelle, sans appel Resend)", () => {
  let clientAvecEmailId: string;
  let clientSansEmailId: string;
  const idsFactures: string[] = [];
  const idsDevis: string[] = [];

  afterAll(async () => {
    await prisma.ligneFacture.deleteMany({ where: { factureId: { in: idsFactures } } });
    await prisma.facture.deleteMany({ where: { id: { in: idsFactures } } });
    await prisma.ligneDevis.deleteMany({ where: { devisId: { in: idsDevis } } });
    await prisma.devis.deleteMany({ where: { id: { in: idsDevis } } });
    await prisma.client.deleteMany({ where: { id: { in: [clientAvecEmailId, clientSansEmailId] } } });
    await prisma.$disconnect();
  });

  it("refuse d'envoyer une facture si le client n'a pas d'e-mail", async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-MAIL-${Date.now()}`, nom: "Sans email", telephone: "0000" },
    });
    clientSansEmailId = client.id;

    const facture = await creerFacture({
      clientId: client.id,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    await expect(envoyerFactureParEmail(facture.id)).rejects.toThrow(ErreurMetier);
    await expect(envoyerFactureParEmail(facture.id)).rejects.toThrow(/n'a pas d'adresse e-mail/);
  });

  it("refuse d'envoyer tant que RESEND_ENVOI_ACTIF n'est pas activé, sans jamais appeler Resend", async () => {
    const client = await prisma.client.create({
      data: {
        code: `TEST-MAIL-${Date.now()}`,
        nom: "Avec email",
        telephone: "0000",
        email: "client-test@example.com",
      },
    });
    clientAvecEmailId = client.id;

    const facture = await creerFacture({
      clientId: client.id,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    // Si le garde-fou RESEND_ENVOI_ACTIF était contourné, cet appel tenterait
    // une vraie requête réseau vers l'API Resend (et échouerait de toute
    // façon sans clé valide) — l'erreur métier doit arriver avant.
    await expect(envoyerFactureParEmail(facture.id)).rejects.toThrow(/pas encore activé/);

    const devis = await creerDevis({
      clientId: client.id,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateValiditeJours: 30,
    });
    idsDevis.push(devis.id);

    await expect(envoyerDevisParEmail(devis.id)).rejects.toThrow(/pas encore activé/);
  });

  it("renvoie null si la facture ou le devis n'existe pas", async () => {
    expect(await envoyerFactureParEmail("id-inexistant")).toBeNull();
    expect(await envoyerDevisParEmail("id-inexistant")).toBeNull();
  });
});
