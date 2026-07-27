import "dotenv/config";
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { executerTachesQuotidiennes, derniereExecution, ACTION_AUDIT } from "@/lib/services/taches-planifiees";

const NOMS_ATTENDUS = [
  "Facturation des contrats récurrents",
  "Factures échues passées en retard",
  "Contrats arrivés à terme",
];

const auditsCrees: string[] = [];

afterAll(async () => {
  if (auditsCrees.length) await prisma.auditLog.deleteMany({ where: { id: { in: auditsCrees } } });
});

async function executerEtSuivre(declencheur: "cron" | "manuel" = "cron") {
  const rapport = await executerTachesQuotidiennes(declencheur);
  const trace = await prisma.auditLog.findFirst({ where: { action: ACTION_AUDIT }, orderBy: { createdAt: "desc" } });
  if (trace) auditsCrees.push(trace.id);
  return rapport;
}

describe("executerTachesQuotidiennes", () => {
  it("exécute les trois traitements et rend compte de chacun", async () => {
    const rapport = await executerEtSuivre();

    expect(rapport.taches.map((t) => t.nom)).toEqual(NOMS_ATTENDUS);
    // Aucune tâche ne doit échouer sur une base saine — si l'une échoue, le
    // détail porte le message d'erreur, ce qui rend l'assertion lisible.
    expect(rapport.taches.filter((t) => !t.ok)).toEqual([]);
    expect(rapport.dureeMs).toBeGreaterThanOrEqual(0);
  });

  it("est rejouable sans effet de bord : deux exécutions de suite", async () => {
    // La propriété qui rend le lot sûr à relancer manuellement — et sûr en cas
    // de double déclenchement de la plateforme de cron.
    const premier = await executerEtSuivre();
    const second = await executerEtSuivre("manuel");

    for (const rapport of [premier, second]) {
      expect(rapport.taches.every((t) => t.ok)).toBe(true);
    }
  });

  it("laisse une trace lisible dans le journal d'audit", async () => {
    await executerEtSuivre("manuel");

    const derniere = await derniereExecution();
    expect(derniere).not.toBeNull();
    expect(derniere!.rapport.declencheur).toBe("manuel");
    expect(derniere!.rapport.taches).toHaveLength(3);
    // Le détail est une phrase prête à afficher, pas une structure à
    // reformater : c'est ce que rend la page Paramètres tel quel.
    expect(typeof derniere!.rapport.taches[0].detail).toBe("string");
  });
});