-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISEUR', 'TECHNICIEN');

-- CreateEnum
CREATE TYPE "TypeClient" AS ENUM ('PARTICULIER', 'ENTREPRISE', 'INSTITUTION', 'ONG');

-- CreateEnum
CREATE TYPE "TypeContrat" AS ENUM ('MENSUEL', 'TRIMESTRIEL', 'ANNUEL', 'PONCTUEL');

-- CreateEnum
CREATE TYPE "StatutContrat" AS ENUM ('ACTIF', 'EXPIRE', 'SUSPENDU', 'RESILIE');

-- CreateEnum
CREATE TYPE "TypeService" AS ENUM ('VIDANGE', 'COLLECTE', 'TOILETTE_MOBILE', 'PEST_CONTROL', 'NETTOYAGE', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutIntervention" AS ENUM ('EN_ATTENTE', 'PLANIFIE', 'EN_COURS', 'COMPLETE', 'ANNULE');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('NORMALE', 'URGENTE');

-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('CAMION_ASPIRATEUR', 'CAMION_COLLECTE', 'UTILITAIRE');

-- CreateEnum
CREATE TYPE "StatutVehicule" AS ENUM ('DISPONIBLE', 'EN_SERVICE', 'EN_MAINTENANCE', 'HORS_SERVICE');

-- CreateEnum
CREATE TYPE "StatutToilette" AS ENUM ('DISPONIBLE', 'LOUEE', 'EN_MAINTENANCE');

-- CreateEnum
CREATE TYPE "StatutFacture" AS ENUM ('EN_ATTENTE', 'PAYEE', 'PARTIELLEMENT_PAYEE', 'EN_RETARD', 'ANNULEE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('CASH', 'VIREMENT', 'CHEQUE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIEN',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeClient" NOT NULL DEFAULT 'PARTICULIER',
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "adresse" TEXT,
    "ville" TEXT NOT NULL DEFAULT 'Port-au-Prince',
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrat" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "TypeContrat" NOT NULL,
    "services" "TypeService"[],
    "montantHTG" BIGINT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutContrat" NOT NULL DEFAULT 'ACTIF',
    "renouvellementAuto" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contratId" TEXT,
    "type" "TypeService" NOT NULL,
    "description" TEXT,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "statut" "StatutIntervention" NOT NULL DEFAULT 'EN_ATTENTE',
    "priorite" "Priorite" NOT NULL DEFAULT 'NORMALE',
    "datePlanifiee" TIMESTAMP(3),
    "dureeEstimeeMin" INTEGER NOT NULL DEFAULT 60,
    "dateExecution" TIMESTAMP(3),
    "vehiculeId" TEXT,
    "rapportExecution" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionTechnicien" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "technicienId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionTechnicien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technicien" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "specialites" "TypeService"[],
    "zonesAssignees" TEXT[],
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technicien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "technicienId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicule" (
    "id" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "type" "TypeVehicule" NOT NULL,
    "statut" "StatutVehicule" NOT NULL DEFAULT 'DISPONIBLE',
    "kilometrage" INTEGER NOT NULL DEFAULT 0,
    "dernierEntretien" TIMESTAMP(3),
    "prochainEntretien" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToiletteMobile" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "statut" "StatutToilette" NOT NULL DEFAULT 'DISPONIBLE',
    "localisationActuelle" TEXT,
    "clientId" TEXT,
    "dateDebutLocation" TIMESTAMP(3),
    "dateFinLocation" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToiletteMobile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "TypeService",
    "interventionId" TEXT,
    "legende" TEXT,
    "publieGalerie" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "interventionId" TEXT,
    "contratId" TEXT,
    "periode" TEXT,
    "montantHTG" BIGINT NOT NULL,
    "taxeHTG" BIGINT NOT NULL DEFAULT 0,
    "totalHTG" BIGINT NOT NULL,
    "tauxUsdApplique" INTEGER,
    "statut" "StatutFacture" NOT NULL DEFAULT 'EN_ATTENTE',
    "modePaiement" "ModePaiement",
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "datePaiement" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneFacture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "service" "TypeService",
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaireHTG" BIGINT NOT NULL,
    "totalHTG" BIGINT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LigneFacture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "montantHTG" BIGINT NOT NULL,
    "mode" "ModePaiement" NOT NULL,
    "reference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeDevis" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "service" "TypeService" NOT NULL,
    "ville" TEXT NOT NULL,
    "message" TEXT,
    "traite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeDevis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RendezVous" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "service" "TypeService" NOT NULL,
    "ville" TEXT NOT NULL,
    "adresse" TEXT,
    "dateVoulue" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RendezVous_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Temoignage" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Temoignage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "messages" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_code_key" ON "Client"("code");

-- CreateIndex
CREATE INDEX "Client_ville_actif_idx" ON "Client"("ville", "actif");

-- CreateIndex
CREATE UNIQUE INDEX "Contrat_reference_key" ON "Contrat"("reference");

-- CreateIndex
CREATE INDEX "Contrat_clientId_statut_dateFin_idx" ON "Contrat"("clientId", "statut", "dateFin");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_reference_key" ON "Intervention"("reference");

-- CreateIndex
CREATE INDEX "Intervention_clientId_statut_datePlanifiee_idx" ON "Intervention"("clientId", "statut", "datePlanifiee");

-- CreateIndex
CREATE INDEX "Intervention_vehiculeId_datePlanifiee_idx" ON "Intervention"("vehiculeId", "datePlanifiee");

-- CreateIndex
CREATE INDEX "InterventionTechnicien_technicienId_idx" ON "InterventionTechnicien"("technicienId");

-- CreateIndex
CREATE UNIQUE INDEX "InterventionTechnicien_interventionId_technicienId_key" ON "InterventionTechnicien"("interventionId", "technicienId");

-- CreateIndex
CREATE UNIQUE INDEX "Technicien_userId_key" ON "Technicien"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Technicien_matricule_key" ON "Technicien"("matricule");

-- CreateIndex
CREATE INDEX "Presence_technicienId_date_idx" ON "Presence"("technicienId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_technicienId_date_key" ON "Presence"("technicienId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicule_immatriculation_key" ON "Vehicule"("immatriculation");

-- CreateIndex
CREATE UNIQUE INDEX "ToiletteMobile_code_key" ON "ToiletteMobile"("code");

-- CreateIndex
CREATE INDEX "Media_publieGalerie_type_idx" ON "Media"("publieGalerie", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_reference_key" ON "Facture"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_interventionId_key" ON "Facture"("interventionId");

-- CreateIndex
CREATE INDEX "Facture_clientId_statut_dateEcheance_idx" ON "Facture"("clientId", "statut", "dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_contratId_periode_key" ON "Facture"("contratId", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_idempotencyKey_key" ON "Paiement"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_sessionId_key" ON "Conversation"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Config_cle_key" ON "Config"("cle");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "Contrat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionTechnicien" ADD CONSTRAINT "InterventionTechnicien_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterventionTechnicien" ADD CONSTRAINT "InterventionTechnicien_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technicien" ADD CONSTRAINT "Technicien_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_technicienId_fkey" FOREIGN KEY ("technicienId") REFERENCES "Technicien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletteMobile" ADD CONSTRAINT "ToiletteMobile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "Contrat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneFacture" ADD CONSTRAINT "LigneFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
