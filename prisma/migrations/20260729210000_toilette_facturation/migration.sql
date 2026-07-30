-- AlterTable
ALTER TABLE "ToiletteMobile" ADD COLUMN "tarifMensuelHTG" BIGINT;

-- AlterTable
ALTER TABLE "Facture" ADD COLUMN "toiletteMobileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Facture_toiletteMobileId_periode_key" ON "Facture"("toiletteMobileId", "periode");

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_toiletteMobileId_fkey" FOREIGN KEY ("toiletteMobileId") REFERENCES "ToiletteMobile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
