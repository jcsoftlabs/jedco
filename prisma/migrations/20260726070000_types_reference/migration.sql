-- Remplace les énumérations figées TypeService et TypeVehicule par des tables
-- de référence administrables depuis le backoffice.
--
-- Motivation : ajouter une prestation ("Curage de canalisation") ou un type de
-- véhicule ("Tracteur") imposait jusqu'ici une migration de base, donc une
-- intervention de développement. Ces valeurs sont du paramétrage métier, pas
-- de la structure.
--
-- Une clé étrangère n'est pas applicable uniformément : Contrat.services et
-- Technicien.specialites sont des TABLEAUX (TypeService[]), et PostgreSQL ne
-- sait pas poser de FK sur un élément de tableau. Les colonnes deviennent donc
-- du texte, et l'intégrité est assurée côté service (verifierTypesService /
-- verifierTypeVehicule dans lib/services/types-reference.ts) plutôt que par
-- l'énumération. Compromis assumé et documenté.
--
-- ORDRE IMPORTANT : dans PostgreSQL, un type et une table partagent le même
-- espace de noms. Il faut donc convertir les colonnes puis SUPPRIMER les
-- énumérations AVANT de créer les tables qui reprennent leurs noms.

-- ─── 1. Colonnes : enum → texte (les valeurs existantes sont conservées) ────
ALTER TABLE "ArticleCatalogue" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;
ALTER TABLE "DemandeDevis"     ALTER COLUMN "service" TYPE TEXT USING "service"::TEXT;
ALTER TABLE "Intervention"     ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;
ALTER TABLE "LigneDevis"       ALTER COLUMN "service" TYPE TEXT USING "service"::TEXT;
ALTER TABLE "LigneFacture"     ALTER COLUMN "service" TYPE TEXT USING "service"::TEXT;
ALTER TABLE "Media"            ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;
ALTER TABLE "RendezVous"       ALTER COLUMN "service" TYPE TEXT USING "service"::TEXT;
ALTER TABLE "Contrat"          ALTER COLUMN "services" TYPE TEXT[] USING "services"::TEXT[];
ALTER TABLE "Technicien"       ALTER COLUMN "specialites" TYPE TEXT[] USING "specialites"::TEXT[];
ALTER TABLE "Vehicule"         ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- ─── 2. Suppression des énumérations, désormais sans dépendance ────────────
DROP TYPE "TypeService";
DROP TYPE "TypeVehicule";

-- ─── 3. Tables de référence ────────────────────────────────────────────────
CREATE TABLE "TypeService" (
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TypeService_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "TypeVehicule" (
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TypeVehicule_pkey" PRIMARY KEY ("code")
);

-- ─── 4. Reprise des valeurs de l'énumération ───────────────────────────────
-- Les codes sont identiques à ceux déjà stockés dans les colonnes converties :
-- aucune donnée existante ne devient orpheline.
INSERT INTO "TypeService" ("code", "libelle", "ordre") VALUES
  ('VIDANGE',         'Vidange de fosses septiques', 1),
  ('COLLECTE',        'Collecte d''ordures',         2),
  ('TOILETTE_MOBILE', 'Toilettes mobiles',           3),
  ('PEST_CONTROL',    'Pest Control',                4),
  ('NETTOYAGE',       'Nettoyage industriel',        5),
  ('AUTRE',           'Autre',                       99);

INSERT INTO "TypeVehicule" ("code", "libelle", "ordre") VALUES
  ('CAMION_ASPIRATEUR', 'Camion aspirateur',  1),
  ('CAMION_COLLECTE',   'Camion de collecte', 2),
  ('UTILITAIRE',        'Utilitaire',         3);
