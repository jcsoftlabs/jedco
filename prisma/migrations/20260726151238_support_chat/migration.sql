-- Faux positifs récurrents de `prisma migrate dev --create-only` sur les
-- colonnes Intervention/InterventionTechnicien (mapping non détecté) : ne
-- jamais les DROP, voir les migrations précédentes pour le même avertissement.

-- CreateEnum
CREATE TYPE "StatutConversation" AS ENUM ('IA', 'EN_ATTENTE_AGENT', 'PRISE_EN_CHARGE', 'FERMEE');

-- CreateEnum
CREATE TYPE "RoleMessage" AS ENUM ('VISITEUR', 'IA', 'AGENT');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPPORT';

-- AlterTable
-- La table Conversation n'était encore utilisée nulle part (colonnes
-- `messages`/`userId` mortes) : suppression réelle, pas un faux positif.
ALTER TABLE "Conversation" DROP COLUMN "messages",
DROP COLUMN "userId",
ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "nom" TEXT,
ADD COLUMN     "statut" "StatutConversation" NOT NULL DEFAULT 'IA',
ADD COLUMN     "telephone" TEXT;

-- CreateTable
CREATE TABLE "MessageConversation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "RoleMessage" NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageConversation_conversationId_createdAt_idx" ON "MessageConversation"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_statut_updatedAt_idx" ON "Conversation"("statut", "updatedAt");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageConversation" ADD CONSTRAINT "MessageConversation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
