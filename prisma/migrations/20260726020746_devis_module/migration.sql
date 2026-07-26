-- Les colonnes/triggers "periode", "datePlanifiee", "dureeEstimeeMin" ajoutés
-- par la migration 20260725023340_exclusion_double_booking (anti double-
-- booking, §1.3) ne sont pas déclarés dans schema.prisma par construction —
-- `prisma migrate dev` les propose donc en DROP COLUMN ici. Ce sont de faux
-- positifs : supprimés du diff généré, seul l'ajout du module Devis reste.

-- CreateEnum
CREATE TYPE "StatutDevis" AS ENUM ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'EXPIRE', 'CONVERTI');

-- Séquence PostgreSQL pour les références DEV-YYYY-XXXX (§1.4, même principe
-- que les autres compteurs de lib/codes.ts — nextval() atomique côté base).
CREATE SEQUENCE IF NOT EXISTS jed_devis_seq START 1;

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "montantHTG" BIGINT NOT NULL,
    "taxeHTG" BIGINT NOT NULL DEFAULT 0,
    "totalHTG" BIGINT NOT NULL,
    "tauxUsdApplique" INTEGER,
    "statut" "StatutDevis" NOT NULL DEFAULT 'BROUILLON',
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidite" TIMESTAMP(3) NOT NULL,
    "factureId" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneDevis" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "service" "TypeService",
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaireHTG" BIGINT NOT NULL,
    "totalHTG" BIGINT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LigneDevis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Devis_reference_key" ON "Devis"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_factureId_key" ON "Devis"("factureId");

-- CreateIndex
CREATE INDEX "Devis_clientId_statut_idx" ON "Devis"("clientId", "statut");

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDevis" ADD CONSTRAINT "LigneDevis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
