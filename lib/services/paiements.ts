import { prisma } from "@/lib/db";
import { htgToCentimes, formatHTG } from "@/lib/money";
import { ErreurMetier } from "@/lib/errors";
import type { EnregistrerPaiementInput } from "@/lib/schemas/paiements";

export async function listerPaiementsFacture(factureId: string) {
  return prisma.paiement.findMany({ where: { factureId }, orderBy: { datePaiement: "asc" } });
}

export async function enregistrerPaiement(input: EnregistrerPaiementInput, createdBy: string) {
  // Idempotence (§1.5) : un retry réseau ou un double-clic renvoie la même
  // clé — on renvoie le paiement déjà enregistré au lieu de recréer une
  // seconde ligne ou de renvoyer une erreur qui laisserait le client dans le
  // doute sur si le premier paiement est passé.
  const existant = await prisma.paiement.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existant) return { paiement: existant, dejaTraite: true };

  return prisma.$transaction(async (tx) => {
    // Verrou de ligne explicite : sans lui, deux paiements concurrents sur la
    // même facture peuvent chacun lire un solde suffisant et, ensemble,
    // dépasser le total dû (check-then-act classique). Le SELECT FOR UPDATE
    // sérialise les transactions concurrentes sur cette facture ; la lecture
    // des valeurs elles-mêmes passe ensuite par l'API Prisma normale (typée
    // BigInt de façon fiable, contrairement à un $queryRaw brut).
    await tx.$executeRaw`SELECT id FROM "Facture" WHERE id = ${input.factureId} FOR UPDATE`;

    const facture = await tx.facture.findFirst({ where: { id: input.factureId, deletedAt: null } });
    if (!facture) throw new ErreurMetier("Facture introuvable", 404);
    if (facture.statut === "ANNULEE") throw new ErreurMetier("Cette facture est annulée", 400);
    if (facture.statut === "PAYEE") throw new ErreurMetier("Cette facture est déjà payée intégralement", 400);

    const agrege = await tx.paiement.aggregate({
      where: { factureId: input.factureId },
      _sum: { montantHTG: true },
    });
    const dejaPayeHTG = agrege._sum.montantHTG ?? 0n;
    const resteDuHTG = facture.totalHTG - dejaPayeHTG;
    const montantHTG = htgToCentimes(input.montantHTG);

    if (montantHTG > resteDuHTG) {
      throw new ErreurMetier(`Le montant dépasse le solde dû (${formatHTG(resteDuHTG)})`, 400);
    }

    const paiement = await tx.paiement.create({
      data: {
        factureId: input.factureId,
        montantHTG,
        mode: input.mode,
        reference: input.reference,
        idempotencyKey: input.idempotencyKey,
        createdBy,
      },
    });

    const nouveauTotalPayeHTG = dejaPayeHTG + montantHTG;
    const statut = nouveauTotalPayeHTG >= facture.totalHTG ? "PAYEE" : "PARTIELLEMENT_PAYEE";

    await tx.facture.update({
      where: { id: input.factureId },
      data: {
        statut,
        modePaiement: input.mode,
        ...(statut === "PAYEE" ? { datePaiement: new Date() } : {}),
      },
    });

    return { paiement, dejaTraite: false };
  });
}
