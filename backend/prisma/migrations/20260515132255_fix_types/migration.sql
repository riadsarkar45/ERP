-- CreateTable
CREATE TABLE "Factory" (
    "id" SERIAL NOT NULL,
    "factoryName" TEXT NOT NULL,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Yarns" (
    "id" SERIAL NOT NULL,
    "yarnType" TEXT NOT NULL,

    CONSTRAINT "Yarns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" SERIAL NOT NULL,
    "workOrderNo" TEXT NOT NULL,
    "workOrderPlaceDate" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "styleNo" TEXT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "styleRequirementId" INTEGER,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Composition" (
    "id" SERIAL NOT NULL,
    "composition" TEXT NOT NULL,
    "unitePrice" DOUBLE PRECISION NOT NULL,
    "color" TEXT NOT NULL,
    "orderQty" INTEGER NOT NULL,
    "workOrderQty" INTEGER NOT NULL,
    "workOrderId" INTEGER NOT NULL,

    CONSTRAINT "Composition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleRequirement" (
    "id" SERIAL NOT NULL,
    "salesContact" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL,
    "poNo" TEXT NOT NULL,
    "styleNo" TEXT NOT NULL,
    "processLoss" TEXT NOT NULL,

    CONSTRAINT "StyleRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleRequirementRow" (
    "id" SERIAL NOT NULL,
    "styleRequirementId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "composition" TEXT NOT NULL,
    "finishDia" DOUBLE PRECISION NOT NULL,
    "orderQty" INTEGER NOT NULL,
    "finishRequiredQty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StyleRequirementRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sizeWiseCutting" (
    "id" SERIAL NOT NULL,
    "cuttingStyleId" INTEGER NOT NULL,
    "sizeId" INTEGER NOT NULL,
    "cutQty" INTEGER NOT NULL,

    CONSTRAINT "sizeWiseCutting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sizes" (
    "id" SERIAL NOT NULL,
    "sizeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "styleRequirementId" INTEGER,

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" SERIAL NOT NULL,
    "challanNo" INTEGER NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "deliveryQty" INTEGER NOT NULL,
    "deliveryType" TEXT NOT NULL,
    "yarnId" INTEGER NOT NULL,
    "toFactory" TEXT NOT NULL,
    "fromFactory" TEXT NOT NULL,
    "yarnCompId" INTEGER,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit" (
    "id" SERIAL NOT NULL,
    "auditTitle" TEXT NOT NULL,
    "auditStartDate" TIMESTAMP(3) NOT NULL,
    "auditEndDate" TIMESTAMP(3) NOT NULL,
    "auditDesc" TEXT NOT NULL,
    "auditType" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Factory_factoryName_key" ON "Factory"("factoryName");

-- CreateIndex
CREATE UNIQUE INDEX "Yarns_id_key" ON "Yarns"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Yarns_yarnType_key" ON "Yarns"("yarnType");

-- CreateIndex
CREATE INDEX "WorkOrder_styleRequirementId_idx" ON "WorkOrder"("styleRequirementId");

-- CreateIndex
CREATE INDEX "WorkOrder_styleNo_idx" ON "WorkOrder"("styleNo");

-- CreateIndex
CREATE INDEX "Composition_workOrderId_idx" ON "Composition"("workOrderId");

-- CreateIndex
CREATE INDEX "Composition_color_idx" ON "Composition"("color");

-- CreateIndex
CREATE UNIQUE INDEX "StyleRequirement_styleNo_key" ON "StyleRequirement"("styleNo");

-- CreateIndex
CREATE INDEX "StyleRequirementRow_styleRequirementId_idx" ON "StyleRequirementRow"("styleRequirementId");

-- CreateIndex
CREATE INDEX "sizeWiseCutting_sizeId_idx" ON "sizeWiseCutting"("sizeId");

-- CreateIndex
CREATE INDEX "sizeWiseCutting_cuttingStyleId_idx" ON "sizeWiseCutting"("cuttingStyleId");

-- CreateIndex
CREATE INDEX "sizes_styleRequirementId_idx" ON "sizes"("styleRequirementId");

-- CreateIndex
CREATE INDEX "deliveries_yarnCompId_idx" ON "deliveries"("yarnCompId");

-- CreateIndex
CREATE INDEX "deliveries_deliveryDate_idx" ON "deliveries"("deliveryDate");

-- CreateIndex
CREATE INDEX "deliveries_challanNo_idx" ON "deliveries"("challanNo");

-- CreateIndex
CREATE INDEX "deliveries_yarnId_idx" ON "deliveries"("yarnId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_styleRequirementId_fkey" FOREIGN KEY ("styleRequirementId") REFERENCES "StyleRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Composition" ADD CONSTRAINT "Composition_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleRequirementRow" ADD CONSTRAINT "StyleRequirementRow_styleRequirementId_fkey" FOREIGN KEY ("styleRequirementId") REFERENCES "StyleRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sizeWiseCutting" ADD CONSTRAINT "sizeWiseCutting_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sizes" ADD CONSTRAINT "sizes_styleRequirementId_fkey" FOREIGN KEY ("styleRequirementId") REFERENCES "StyleRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_yarnCompId_fkey" FOREIGN KEY ("yarnCompId") REFERENCES "Composition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
