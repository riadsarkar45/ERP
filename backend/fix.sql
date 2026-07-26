ALTER TABLE "Composition" ALTER COLUMN "workOrderId" DROP NOT NULL;

ALTER TABLE "Composition" DROP CONSTRAINT "Composition_workOrderId_fkey";
ALTER TABLE "Composition" ADD CONSTRAINT "Composition_workOrderId_fkey"
  FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL;