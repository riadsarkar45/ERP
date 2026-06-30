/*
  Warnings:

  - Added the required column `jobNo` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Composition" ADD COLUMN     "additional" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "orderType" TEXT NOT NULL DEFAULT 'null',
ADD COLUMN     "styleRequirementRowId" INTEGER;

-- AlterTable
ALTER TABLE "StyleRequirementRow" ADD COLUMN     "additional" TEXT NOT NULL DEFAULT '0',
ALTER COLUMN "finishDia" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "factoryName" TEXT NOT NULL DEFAULT 'NULL',
ADD COLUMN     "jobId" INTEGER,
ADD COLUMN     "jobNo" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "yarnDyeingJobs" (
    "id" SERIAL NOT NULL,
    "color" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "composition" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" INTEGER,

    CONSTRAINT "yarnDyeingJobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" SERIAL NOT NULL,
    "jobNo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_jobNo_key" ON "jobs"("jobNo");

-- CreateIndex
CREATE INDEX "Composition_styleRequirementRowId_idx" ON "Composition"("styleRequirementRowId");

-- CreateIndex
CREATE INDEX "WorkOrder_jobId_idx" ON "WorkOrder"("jobId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yarnDyeingJobs" ADD CONSTRAINT "yarnDyeingJobs_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Composition" ADD CONSTRAINT "Composition_styleRequirementRowId_fkey" FOREIGN KEY ("styleRequirementRowId") REFERENCES "StyleRequirementRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
