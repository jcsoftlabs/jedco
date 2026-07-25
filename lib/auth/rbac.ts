import type { Prisma } from "@/app/generated/prisma/client";
import type { Role } from "@/app/generated/prisma/enums";

export class ErreurAcces extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.name = "ErreurAcces";
  }
}

export function requireRole(user: { role: Role } | null | undefined, roles: Role[]): void {
  if (!user || !roles.includes(user.role)) {
    throw new ErreurAcces();
  }
}

type UtilisateurAvecTechnicien = {
  id: string;
  role: Role;
  technicien?: { id: string } | null;
};

// Portée par ligne pour le rôle TECHNICIEN (§1.6) : un contrôle au seul
// niveau route ("[JWT]") laisse un technicien lire les interventions — donc
// les coordonnées — de tous les clients. ADMIN et SUPERVISEUR voient tout ;
// TECHNICIEN ne voit que ce qui lui est assigné. À composer avec le filtre
// `deletedAt: null` du soft delete (§1.12) dans le service appelant.
//
// Écrit en Phase 0 et prêt à être branché tel quel dans le module
// Interventions de la Phase 1 — la faille doit être fermée avant que la
// première route qui l'exposerait n'existe.
export function scopeInterventions(user: UtilisateurAvecTechnicien): Prisma.InterventionWhereInput {
  if (user.role === "ADMIN" || user.role === "SUPERVISEUR") {
    return {};
  }
  if (!user.technicien) {
    // Un compte TECHNICIEN sans fiche Technicien liée ne doit rien voir,
    // plutôt que de se rabattre sur un where vide qui renverrait tout.
    return { id: "__aucun__" };
  }
  return {
    techniciens: { some: { technicienId: user.technicien.id } },
  };
}
