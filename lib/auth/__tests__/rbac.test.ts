import { describe, expect, it } from "vitest";
import { requireRole, scopeInterventions, ErreurAcces } from "../rbac";

describe("requireRole", () => {
  it("laisse passer un rôle autorisé", () => {
    expect(() => requireRole({ role: "ADMIN" }, ["ADMIN", "SUPERVISEUR"])).not.toThrow();
  });

  it("rejette un rôle non autorisé", () => {
    expect(() => requireRole({ role: "TECHNICIEN" }, ["ADMIN"])).toThrow(ErreurAcces);
  });

  it("rejette un utilisateur absent", () => {
    expect(() => requireRole(null, ["ADMIN"])).toThrow(ErreurAcces);
  });
});

describe("scopeInterventions — §1.6", () => {
  it("ADMIN voit tout (where vide)", () => {
    expect(scopeInterventions({ id: "u1", role: "ADMIN" })).toEqual({});
  });

  it("SUPERVISEUR voit tout (where vide)", () => {
    expect(scopeInterventions({ id: "u1", role: "SUPERVISEUR" })).toEqual({});
  });

  it("TECHNICIEN est filtré sur ses seules interventions assignées", () => {
    const scope = scopeInterventions({ id: "u1", role: "TECHNICIEN", technicien: { id: "tech1" } });
    expect(scope).toEqual({ techniciens: { some: { technicienId: "tech1" } } });
  });

  it("un TECHNICIEN sans fiche liée ne voit jamais rien (pas de where vide)", () => {
    const scope = scopeInterventions({ id: "u1", role: "TECHNICIEN", technicien: null });
    expect(scope).not.toEqual({});
  });
});
