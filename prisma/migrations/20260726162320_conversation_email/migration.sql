-- Faux positifs récurrents de `prisma migrate dev --create-only` sur les
-- colonnes Intervention/InterventionTechnicien (mapping non détecté) : ne
-- jamais les DROP, voir les migrations précédentes pour le même avertissement.

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "email" TEXT;
