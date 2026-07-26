-- Faux positifs retirés du diff généré : les colonnes periode /
-- datePlanifiee / dureeEstimeeMin d'Intervention et InterventionTechnicien
-- sont créées par la migration 20260725023340_exclusion_double_booking et
-- n'existent pas dans schema.prisma (Prisma n'exprime pas EXCLUDE USING gist).
-- `migrate dev` propose donc systématiquement de les supprimer — les laisser
-- casserait la contrainte anti double-booking. Voir devis_module et
-- catalogue_articles, même traitement.

-- CreateEnum
CREATE TYPE "TypeEntretien" AS ENUM ('VIDANGE_MOTEUR', 'REVISION', 'REPARATION', 'PNEUS', 'CARROSSERIE', 'AUTRE');

-- CreateTable
CREATE TABLE "EntretienVehicule" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "type" "TypeEntretien" NOT NULL,
    "description" TEXT,
    "coutHTG" BIGINT NOT NULL DEFAULT 0,
    "kilometrage" INTEGER,
    "dateEntretien" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prochainEntretien" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntretienVehicule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntretienVehicule_vehiculeId_dateEntretien_idx" ON "EntretienVehicule"("vehiculeId", "dateEntretien");

-- CreateIndex
CREATE INDEX "Vehicule_statut_deletedAt_idx" ON "Vehicule"("statut", "deletedAt");

-- AddForeignKey
ALTER TABLE "EntretienVehicule" ADD CONSTRAINT "EntretienVehicule_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
