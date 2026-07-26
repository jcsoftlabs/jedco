import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import { verifierMotDePasse } from "@/lib/auth/password";
import { creerTechnicien, modifierTechnicien, listerTechniciens } from "../techniciens";

describe("module Techniciens (intégration réelle)", () => {
  const idsTechniciens: string[] = [];
  const idsUsers: string[] = [];

  afterAll(async () => {
    await prisma.technicien.deleteMany({ where: { id: { in: idsTechniciens } } });
    await prisma.user.deleteMany({ where: { id: { in: idsUsers } } });
    await prisma.$disconnect();
  });

  it("crée le compte de connexion et la fiche technicien avec un matricule TECH-XXX", async () => {
    const technicien = await creerTechnicien({
      email: `tech-${Date.now()}@jedco.ht`,
      motDePasse: "MotDePasseSolide123",
      prenom: "Jean",
      nom: "Baptiste",
      specialites: ["VIDANGE", "COLLECTE"],
      zonesAssignees: ["Delmas"],
    });
    idsTechniciens.push(technicien.id);
    idsUsers.push(technicien.userId);

    expect(technicien.matricule).toMatch(/^TECH-\d{3,}$/);
    expect(technicien.disponible).toBe(true);
    expect(technicien.user.role).toBe("TECHNICIEN");
    expect(technicien.specialites).toEqual(["VIDANGE", "COLLECTE"]);

    // Le mot de passe fourni doit vérifier contre le hash stocké — pas de
    // sens à créer un compte dont le technicien ne pourrait pas se servir.
    const valide = await verifierMotDePasse(technicien.user.passwordHash, "MotDePasseSolide123");
    expect(valide).toBe(true);
  });

  it("refuse de créer un compte avec un e-mail déjà utilisé", async () => {
    const email = `tech-dup-${Date.now()}@jedco.ht`;
    const premier = await creerTechnicien({
      email,
      motDePasse: "MotDePasseSolide123",
      prenom: "A",
      nom: "B",
      specialites: [],
      zonesAssignees: [],
    });
    idsTechniciens.push(premier.id);
    idsUsers.push(premier.userId);

    await expect(
      creerTechnicien({
        email,
        motDePasse: "AutreMotDePasse123",
        prenom: "C",
        nom: "D",
        specialites: [],
        zonesAssignees: [],
      })
    ).rejects.toThrow(ErreurMetier);
  });

  it("modifie la disponibilité d'un technicien", async () => {
    const technicien = await creerTechnicien({
      email: `tech-dispo-${Date.now()}@jedco.ht`,
      motDePasse: "MotDePasseSolide123",
      prenom: "E",
      nom: "F",
      specialites: [],
      zonesAssignees: [],
    });
    idsTechniciens.push(technicien.id);
    idsUsers.push(technicien.userId);

    const modifie = await modifierTechnicien(technicien.id, { disponible: false });
    expect(modifie?.disponible).toBe(false);
  });

  it("modifierTechnicien renvoie null pour un id inexistant", async () => {
    expect(await modifierTechnicien("id-inexistant", { disponible: false })).toBeNull();
  });

  it("liste les techniciens avec leur compte utilisateur inclus", async () => {
    const technicien = await creerTechnicien({
      email: `tech-liste-${Date.now()}@jedco.ht`,
      motDePasse: "MotDePasseSolide123",
      prenom: "G",
      nom: "H",
      specialites: [],
      zonesAssignees: [],
    });
    idsTechniciens.push(technicien.id);
    idsUsers.push(technicien.userId);

    const tous = await listerTechniciens();
    const trouve = tous.find((t) => t.id === technicien.id);
    expect(trouve?.user.email).toBe(technicien.user.email);
  });
});
