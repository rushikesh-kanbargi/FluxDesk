-- CreateEnum
CREATE TYPE "ToolSource" AS ENUM ('WEB', 'VSCODE', 'GMAIL', 'CHATBOT', 'FLOW');

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "sharedWithTeam" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ToolUsage" ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "source" "ToolSource" NOT NULL DEFAULT 'WEB';

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#F5A623',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Prompt_projectId_idx" ON "Prompt"("projectId");

-- CreateIndex
CREATE INDEX "ToolUsage_source_idx" ON "ToolUsage"("source");

-- CreateIndex
CREATE INDEX "ToolUsage_projectId_idx" ON "ToolUsage"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolUsage" ADD CONSTRAINT "ToolUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
