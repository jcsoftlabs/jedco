-- Faux positifs récurrents de `prisma migrate dev --create-only` sur ces
-- colonnes (mapping @map non détecté) : ne jamais les DROP, voir migrations
-- précédentes pour le même avertissement.

-- AlterTable
ALTER TABLE "TypeService" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TypeVehicule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CodeConnexionClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "utiliseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeConnexionClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeConnexionClient_clientId_createdAt_idx" ON "CodeConnexionClient"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionClient_tokenHash_key" ON "SessionClient"("tokenHash");

-- CreateIndex
CREATE INDEX "SessionClient_clientId_idx" ON "SessionClient"("clientId");

-- AddForeignKey
ALTER TABLE "CodeConnexionClient" ADD CONSTRAINT "CodeConnexionClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionClient" ADD CONSTRAINT "SessionClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
