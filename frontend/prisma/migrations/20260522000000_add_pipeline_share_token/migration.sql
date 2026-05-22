-- AlterTable
ALTER TABLE "Pipeline" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pipeline_shareToken_key" ON "Pipeline"("shareToken");
