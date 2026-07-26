-- Faux positifs retirés du diff généré : voir la migration devis_module pour
-- l'explication (colonnes ajoutées hors schema.prisma par la migration
-- d'exclusion anti double-booking).

-- CreateTable
CREATE TABLE "ArticleCatalogue" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "type" "TypeService",
    "prixSuggereHTG" BIGINT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleCatalogue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCatalogue_nom_key" ON "ArticleCatalogue"("nom");
