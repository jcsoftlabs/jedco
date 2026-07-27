-- CreateEnum
CREATE TYPE "CanalDemande" AS ENUM ('WEB', 'TELEPHONE', 'TERRAIN');

-- AlterTable
ALTER TABLE "Intervention" ADD COLUMN     "canal" "CanalDemande" NOT NULL DEFAULT 'TELEPHONE';
