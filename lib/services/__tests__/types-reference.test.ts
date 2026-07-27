import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import {
  normaliserCode,
  creerTypeService,
  creerTypeVehicule,
  modifierTypeService,
  listerTypesService,
  verifierTypesService,
  verifierTypeVehicule,
  usagesTypeService,
} from "../types-reference";
import { creerIntervention } from "../interventions";
import { creerVehicule } from "../vehicules";

describe("tables de référence des types (intégration réelle)", () => {
  const codesService: string[] = [];
  const codesVehicule: string[] = [];
  let clientId: string;
  const idsInterventions: string[] = [];
  const idsVehicules: string[] = [];

  afterAll(async () => {
    await prisma.intervention.deleteMany({ where: { id: { in: idsInterventions } } });
    await prisma.vehicule.deleteMany({ where: { id: { in: idsVehicules } } });
    if (clientId) await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.typeService.deleteMany({ where: { code: { in: codesService } } });
    await prisma.typeVehicule.deleteMany({ where: { code: { in: codesVehicule } } });
    await prisma.$disconnect();
  });

  it("dérive un code normalisé depuis un libellé accentué", () => {
    expect(normaliserCode("Curage de canalisation")).toBe("CURAGE_DE_CANALISATION");
    expect(normaliserCode("Dératisation & désinsectisation")).toBe("DERATISATION_DESINSECTISATION");
    expect(normaliserCode("  vidange   ")).toBe("VIDANGE");
  });

  it("crée un type de service et le rend immédiatement utilisable", async () => {
    const libelle = `Curage test ${Date.now()}`;
    const type = await creerTypeService({ libelle });
    codesService.push(type.code);

    expect(type.actif).toBe(true);
    expect(type.libelle).toBe(libelle);

    // Le contrôle applicatif qui remplace l'énumération PostgreSQL doit
    // accepter ce tout nouveau code sans redéploiement.
    await expect(verifierTypesService([type.code])).resolves.toBeUndefined();

    const client = await prisma.client.create({
      data: { code: `TEST-TYPES-${Date.now()}`, nom: "Client types", telephone: "0000" },
    });
    clientId = client.id;

    const intervention = await creerIntervention({
      clientId: client.id,
      type: type.code,
      adresse: "x",
      ville: "x",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      dureeEstimeeMin: 60,
      technicienIds: [],
    });
    idsInterventions.push(intervention.id);
    expect(intervention.type).toBe(type.code);
  });

  it("refuse un code de service inconnu", async () => {
    await expect(verifierTypesService(["TYPE_QUI_NEXISTE_PAS"])).rejects.toThrow(ErreurMetier);
    await expect(verifierTypesService(["TYPE_QUI_NEXISTE_PAS"])).rejects.toThrow(/inconnu/);
  });

  it("refuse une intervention portant un type de service inexistant", async () => {
    const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    await expect(
      creerIntervention({
        clientId: client.id,
        type: "SERVICE_IMAGINAIRE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        technicienIds: [],
      })
    ).rejects.toThrow(/inconnu/);
  });

  it("crée un type de véhicule utilisable par la flotte", async () => {
    const type = await creerTypeVehicule({ libelle: `Tracteur test ${Date.now()}` });
    codesVehicule.push(type.code);

    const vehicule = await creerVehicule({
      immatriculation: `TEST-TYPE-${Date.now()}`,
      marque: "Massey",
      modele: "MF",
      type: type.code,
      kilometrage: 0,
    });
    idsVehicules.push(vehicule.id);
    expect(vehicule.type).toBe(type.code);

    await expect(verifierTypeVehicule("VEHICULE_IMAGINAIRE")).rejects.toThrow(/inconnu/);
  });

  it("refuse deux types avec le même code dérivé", async () => {
    const libelle = `Doublon test ${Date.now()}`;
    const premier = await creerTypeService({ libelle });
    codesService.push(premier.code);

    await expect(creerTypeService({ libelle })).rejects.toThrow(ErreurMetier);
  });

  it("désactiver un type le retire des listes de saisie sans casser l'existant", async () => {
    const type = await creerTypeService({ libelle: `Masqué test ${Date.now()}` });
    codesService.push(type.code);

    await modifierTypeService(type.code, { actif: false });

    const actifs = await listerTypesService(true);
    expect(actifs.some((t) => t.code === type.code)).toBe(false);

    const tous = await listerTypesService();
    expect(tous.some((t) => t.code === type.code)).toBe(true);

    // Un enregistrement qui porte déjà ce code doit rester modifiable : la
    // vérification accepte volontairement les codes inactifs.
    await expect(verifierTypesService([type.code])).resolves.toBeUndefined();
  });

  it("compte les usages d'un type pour prévenir avant désactivation", async () => {
    const usages = await usagesTypeService("VIDANGE");
    expect(typeof usages.total).toBe("number");
    expect(usages.total).toBeGreaterThanOrEqual(0);
  });
});
