import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { creerDemandeDevis, listerDemandesDevis, marquerDemandeDevisTraitee } from "../demandes-devis";

describe("module DemandesDevis — formulaire public (intégration réelle)", () => {
  const idsDemandes: string[] = [];

  afterAll(async () => {
    await prisma.demandeDevis.deleteMany({ where: { id: { in: idsDemandes } } });
    await prisma.$disconnect();
  });

  it("crée une demande non traitée par défaut", async () => {
    const demande = await creerDemandeDevis({
      nom: `Test Demande ${Date.now()}`,
      telephone: "+509 3000 0000",
      service: "VIDANGE",
      ville: "Port-au-Prince",
      message: "Fosse pleine, besoin urgent",
    });
    idsDemandes.push(demande.id);

    expect(demande.traite).toBe(false);
    expect(demande.service).toBe("VIDANGE");
  });

  it("accepte une demande sans e-mail ni message (tous deux facultatifs)", async () => {
    const demande = await creerDemandeDevis({
      nom: `Test Minimal ${Date.now()}`,
      telephone: "+509 4000 0000",
      service: "COLLECTE",
      ville: "Jacmel",
    });
    idsDemandes.push(demande.id);

    expect(demande.email).toBeNull();
    expect(demande.message).toBeNull();
  });

  it("marque une demande traitée puis la rouvre", async () => {
    const demande = await creerDemandeDevis({
      nom: `Test Traite ${Date.now()}`,
      telephone: "+509 5000 0000",
      service: "NETTOYAGE",
      ville: "Cap-Haïtien",
    });
    idsDemandes.push(demande.id);

    const traitee = await marquerDemandeDevisTraitee(demande.id, true);
    expect(traitee?.traite).toBe(true);

    const rouverte = await marquerDemandeDevisTraitee(demande.id, false);
    expect(rouverte?.traite).toBe(false);
  });

  it("marquerDemandeDevisTraitee renvoie null pour un id inexistant", async () => {
    expect(await marquerDemandeDevisTraitee("id-inexistant", true)).toBeNull();
  });

  it("filtre les demandes par statut traité", async () => {
    const demande = await creerDemandeDevis({
      nom: `Test Filtre ${Date.now()}`,
      telephone: "+509 6000 0000",
      service: "AUTRE",
      ville: "Gonaïves",
    });
    idsDemandes.push(demande.id);

    const { data: nonTraitees } = await listerDemandesDevis({ page: 1, limit: 100, traite: false });
    expect(nonTraitees.some((d) => d.id === demande.id)).toBe(true);

    const { data: traitees } = await listerDemandesDevis({ page: 1, limit: 100, traite: true });
    expect(traitees.some((d) => d.id === demande.id)).toBe(false);
  });
});
