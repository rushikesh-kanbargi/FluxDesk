-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ToolUsage_userId_createdAt_idx" ON "ToolUsage"("userId", "createdAt" DESC);
