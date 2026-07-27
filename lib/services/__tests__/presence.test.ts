import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { creerTechnicien } from "../techniciens";
import { pointerPresence, presenceDuJour, listerPresences, statsPresenceJour } from "../presence";

describe("module Presence (intégration réelle)", () => {
  const idsTechniciens: string[] = [];
  const idsUsers: string[] = [];

  afterAll(async () => {
    await prisma.presence.deleteMany({ where: { technicienId: { in: idsTechniciens } } });
    await prisma.technicien.deleteMany({ where: { id: { in: idsTechniciens } } });
    await prisma.user.deleteMany({ where: { id: { in: idsUsers } } });
    await prisma.$disconnect();
  });

  async function creerTechnicienTest() {
    const technicien = await creerTechnicien({
      email: `presence-${Date.now()}-${Math.random()}@jedco.ht`,
      motDePasse: "MotDePasseSolide123",
      prenom: "Test",
      nom: "Présence",
      specialites: [],
      zonesAssignees: [],
    });
    idsTechniciens.push(technicien.id);
    idsUsers.push(technicien.userId);
    return technicien;
  }

  it("pointe une présence pour une date donnée", async () => {
    const technicien = await creerTechnicienTest();
    const presence = await pointerPresence(technicien.id, { present: true }, "2026-01-15");

    expect(presence.present).toBe(true);
    expect(presence.date.toISOString().slice(0, 10)).toBe("2026-01-15");
  });

  it("pointer deux fois le même jour corrige le pointage au lieu d'en créer un second", async () => {
    const technicien = await creerTechnicienTest();
    await pointerPresence(technicien.id, { present: false, notes: "malade" }, "2026-01-16");
    const corrige = await pointerPresence(technicien.id, { present: true }, "2026-01-16");

    expect(corrige.present).toBe(true);

    const total = await prisma.presence.count({ where: { technicienId: technicien.id, date: new Date("2026-01-16T00:00:00.000Z") } });
    expect(total).toBe(1);
  });

  it("presenceDuJour renvoie null tant qu'aucun pointage n'existe", async () => {
    const technicien = await creerTechnicienTest();
    expect(await presenceDuJour(technicien.id, "2026-01-17")).toBeNull();
  });

  it("listerPresences filtre par date et par technicien", async () => {
    const technicien = await creerTechnicienTest();
    await pointerPresence(technicien.id, { present: true }, "2026-01-18");

    const { data } = await listerPresences({ page: 1, limit: 100, date: "2026-01-18", technicienId: technicien.id });
    expect(data).toHaveLength(1);
    expect(data[0].technicienId).toBe(technicien.id);
  });

  it("statsPresenceJour distingue présents, absents et non pointés", async () => {
    const present = await creerTechnicienTest();
    const absent = await creerTechnicienTest();
    const nonPointe = await creerTechnicienTest();

    const jour = "2026-01-19";
    await pointerPresence(present.id, { present: true }, jour);
    await pointerPresence(absent.id, { present: false }, jour);

    const stats = await statsPresenceJour(jour);

    const ligneNonPointe = stats.lignes.find((l) => l.technicienId === nonPointe.id);
    const lignePresente = stats.lignes.find((l) => l.technicienId === present.id);
    const ligneAbsente = stats.lignes.find((l) => l.technicienId === absent.id);

    expect(ligneNonPointe?.presence).toBeNull();
    expect(lignePresente?.presence?.present).toBe(true);
    expect(ligneAbsente?.presence?.present).toBe(false);
  });
});
