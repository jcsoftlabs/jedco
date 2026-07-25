import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    // La plupart des tests sont des tests d'intégration contre la vraie base
    // Railway (pas de mocks — voir la convention établie en Phase 0). Le
    // délai par défaut de Vitest (5s) est trop court pour plusieurs
    // allers-retours réseau enchaînés ; la latence Railway est ponctuellement
    // variable, vérifié empiriquement sur ce projet.
    testTimeout: 40_000,
  },
});
