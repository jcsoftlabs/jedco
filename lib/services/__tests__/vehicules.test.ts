import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import {
  creerVehicule,
  obtenirVehicule,
  modifierVehicule,
  listerVehicules,
  enregistrerEntretien,
  supprimerVehicule,
  statsFlotte,
} from "../vehicules";
import { creerIntervention } from "../interventions";

describe("module Flotte (intégration réelle)", () => {
  const idsVehicules: string[] = [];
  const idsInterventions: string[] = [];
  let clientId: string;

  afterAll(async () => {
    await prisma.intervention.deleteMany({ where: { id: { in: idsInterventions } } });
    await prisma.entretienVehicule.deleteMany({ where: { vehiculeId: { in: idsVehicules } } });
    await prisma.vehicule.deleteMany({ where: { id: { in: idsVehicules } } });
    if (clientId) await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  async function nouveauVehicule(suffixe: string) {
    const v = await creerVehicule({
      immatriculation: `TEST-${suffixe}-${Date.now()}`,
      marque: "Isuzu",
      modele: "NPR",
      type: "CAMION_ASPIRATEUR",
      kilometrage: 10_000,
    });
    idsVehicules.push(v.id);
    return v;
  }

  it("normalise l'immatriculation en majuscules et refuse un doublon", async () => {
    const immat = `test-dup-${Date.now()}`;
    const v = await creerVehicule({
      immatriculation: immat,
      marque: "Isuzu",
      modele: "NPR",
      type: "UTILITAIRE",
      kilometrage: 0,
    });
    idsVehicules.push(v.id);

    expect(v.immatriculation).toBe(immat.toUpperCase());

    // Saisie en minuscules : la normalisation doit la ramener sur la même
    // valeur et donc déclencher le refus de doublon.
    await expect(
      creerVehicule({
        immatriculation: immat,
        marque: "Autre",
        modele: "Autre",
        type: "UTILITAIRE",
        kilometrage: 0,
      })
    ).rejects.toThrow(ErreurMetier);
  });

  it("refuse un kilométrage qui diminue", async () => {
    const v = await nouveauVehicule("KM");

    await expect(modifierVehicule(v.id, { kilometrage: 9_000 })).rejects.toThrow(/ne peut pas diminuer/);

    const augmente = await modifierVehicule(v.id, { kilometrage: 12_500 });
    expect(augmente?.kilometrage).toBe(12_500);
  });

  it("enregistre un entretien et met à jour la fiche véhicule dans la même transaction", async () => {
    const v = await nouveauVehicule("ENT");
    const prochain = new Date("2027-06-01");

    const entretien = await enregistrerEntretien(v.id, {
      type: "VIDANGE_MOTEUR",
      description: "Vidange + filtres",
      coutHTG: 4_500,
      kilometrage: 15_000,
      prochainEntretien: prochain,
      remettreEnService: false,
    });

    expect(entretien!.coutHTG).toBe(450_000n); // converti en centimes

    const relu = await obtenirVehicule(v.id);
    expect(relu!.kilometrage).toBe(15_000);
    expect(relu!.dernierEntretien).not.toBeNull();
    expect(relu!.prochainEntretien?.toISOString()).toBe(prochain.toISOString());
    expect(relu!.entretiens).toHaveLength(1);
  });

  it("remet le véhicule disponible quand l'entretien le demande", async () => {
    const v = await nouveauVehicule("DISPO");
    await modifierVehicule(v.id, { statut: "EN_MAINTENANCE" });

    await enregistrerEntretien(v.id, {
      type: "REPARATION",
      coutHTG: 0,
      remettreEnService: true,
    });

    const relu = await obtenirVehicule(v.id);
    expect(relu!.statut).toBe("DISPONIBLE");
  });

  it("refuse de passer en maintenance un véhicule encore affecté à une intervention active", async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-FLOTTE-${Date.now()}`, nom: "Client flotte", telephone: "0000" },
    });
    clientId = client.id;

    const v = await nouveauVehicule("ACTIF");
    const intervention = await creerIntervention({
      clientId: client.id,
      type: "VIDANGE",
      adresse: "x",
      ville: "x",
      priorite: "NORMALE",
      canal: "TELEPHONE",
      dureeEstimeeMin: 60,
      vehiculeId: v.id,
      technicienIds: [],
    });
    idsInterventions.push(intervention.id);

    // Sans ce garde-fou, l'intervention resterait planifiée sur un camion à
    // l'atelier sans que personne ne s'en aperçoive avant le jour J.
    await expect(modifierVehicule(v.id, { statut: "EN_MAINTENANCE" })).rejects.toThrow(
      /intervention\(s\) active\(s\)/
    );

    // Une fois l'intervention annulée, le passage en maintenance redevient
    // possible.
    await prisma.intervention.update({ where: { id: intervention.id }, data: { statut: "ANNULE" } });
    const enMaintenance = await modifierVehicule(v.id, { statut: "EN_MAINTENANCE" });
    expect(enMaintenance?.statut).toBe("EN_MAINTENANCE");
  });

  it("refuse d'affecter un véhicule en maintenance à une nouvelle intervention", async () => {
    const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    const v = await nouveauVehicule("INDISPO");
    await modifierVehicule(v.id, { statut: "EN_MAINTENANCE" });

    // La contrainte d'exclusion Postgres ne regarde que les chevauchements de
    // créneau, jamais le statut — d'où ce contrôle applicatif.
    await expect(
      creerIntervention({
        clientId: client.id,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        priorite: "NORMALE",
        canal: "TELEPHONE",
        dureeEstimeeMin: 60,
        vehiculeId: v.id,
        technicienIds: [],
      })
    ).rejects.toThrow(/en maintenance/);
  });

  it("le soft delete conserve le véhicule mais le retire des listes", async () => {
    const v = await nouveauVehicule("SUPPR");

    await supprimerVehicule(v.id);

    expect(await obtenirVehicule(v.id)).toBeNull();
    const liste = await listerVehicules();
    expect(liste.some((x) => x.id === v.id)).toBe(false);

    const enBase = await prisma.vehicule.findUnique({ where: { id: v.id } });
    expect(enBase).not.toBeNull();
    expect(enBase!.deletedAt).not.toBeNull();
  });

  it("statsFlotte remonte les compteurs et les entretiens à échéance", async () => {
    const v = await nouveauVehicule("STATS");
    // Échéance déjà dépassée : doit apparaître dans les entretiens dus.
    await modifierVehicule(v.id, { prochainEntretien: new Date("2020-01-01") });

    const stats = await statsFlotte();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.entretiensDus.some((e) => e.id === v.id)).toBe(true);
    expect(stats.coutEntretienTotalHTG).toBeGreaterThanOrEqual(0n);
  });
});
