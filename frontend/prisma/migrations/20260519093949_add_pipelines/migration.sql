-- CreateEnum
CREATE TYPE "PipelineRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStep" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "inputMapping" JSONB NOT NULL,

    CONSTRAINT "PipelineStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PipelineRunStatus" NOT NULL DEFAULT 'RUNNING',
    "stepOutputs" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pipeline_userId_createdAt_idx" ON "Pipeline"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PipelineStep_pipelineId_order_idx" ON "PipelineStep"("pipelineId", "order");

-- CreateIndex
CREATE INDEX "PipelineRun_pipelineId_startedAt_idx" ON "PipelineRun"("pipelineId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "PipelineRun_userId_startedAt_idx" ON "PipelineRun"("userId", "startedAt" DESC);

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStep" ADD CONSTRAINT "PipelineStep_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
