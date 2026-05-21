-- AlterTable
ALTER TABLE "User" ADD COLUMN     "demoRunsUsed" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
