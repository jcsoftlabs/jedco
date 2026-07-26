import { describe, expect, it } from "vitest";
import { modifierClientSchema } from "../clients";

describe("modifierClientSchema — effacement des champs facultatifs", () => {
  it("omet un champ absent de la requête (ne pas toucher la valeur existante)", () => {
    const parsed = modifierClientSchema.parse({ nom: "X" });
    expect("email" in parsed).toBe(false);
    expect("adresse" in parsed).toBe(false);
  });

  it("convertit une chaîne vide en null (effacer la valeur existante)", () => {
    const parsed = modifierClientSchema.parse({ email: "", adresse: "" });
    expect(parsed.email).toBeNull();
    expect(parsed.adresse).toBeNull();
  });

  it("accepte toujours une valeur non vide normalement", () => {
    const parsed = modifierClientSchema.parse({ email: "a@b.com", adresse: "12 Rue X" });
    expect(parsed.email).toBe("a@b.com");
    expect(parsed.adresse).toBe("12 Rue X");
  });

  it("rejette toujours un e-mail malformé non vide", () => {
    expect(() => modifierClientSchema.parse({ email: "pas-un-email" })).toThrow();
  });
});
