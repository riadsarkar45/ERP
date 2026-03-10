import type { Request, Response } from "express";
import XLSX from "xlsx";
import prisma from "../../database/prismaClient/prisma";

// Convert Excel serial date to JS Date
const excelDateToJSDate = (serial: number): Date => {
    return new Date(Math.round((serial - 25569) * 86400 * 1000));
};

export const fileUpload = async (req: Request, res: Response) => {
    console.log("hit counted");
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const workBook = XLSX.readFile(req.file.path);
        const sheet = workBook.Sheets["Manual Entry (YARN DYEING)"];

        if (!sheet) {
            res.status(400).json({ message: "Sheet not found" });
            return;
        }

        const rawData: any[] = XLSX.utils.sheet_to_json(sheet, {
            range: 6,
            defval: null,
        });

        // Filter out empty rows
        const cleanData = rawData.filter((row) =>
            Object.values(row).some((val) => val !== null && val !== "")
        );

        // ── STEP 1: createMany Factories ──────────────────────────
        const uniqueFactoryNames = [
            ...new Set(
                cleanData
                    .map((row) => row["YARN DYED FACTORY NAME"])
                    .filter(Boolean)
            ),
        ].map((name) => ({ factoryName: name, type: "Y/D" }));

        await prisma.factory.createMany({
            data: uniqueFactoryNames,
            skipDuplicates: true,
        });

        // Fetch all factories and build a map name → id
        const allFactories = await prisma.factory.findMany();
        const factoryMap = new Map(allFactories.map((f) => [f.factoryName, f.id]));

        // ── STEP 2: createMany Jobs ───────────────────────────────
        const uniqueJobs = [
            ...new Map(
                cleanData
                    .filter((row) => row["JOB NO."])
                    .map((row) => [
                        row["JOB NO."]?.toString(),
                        {
                            jobNo: row["JOB NO."]?.toString(),
                            buyer: row["BUYER"] ?? null,
                            poNo: row["PO NO."]?.toString() ?? null,
                            style: row["STYLE"]?.toString() ?? null,
                            month: row["MONTH"] ?? null,
                        },
                    ])
            ).values(),
        ];

        await prisma.job.createMany({
            data: uniqueJobs,
            skipDuplicates: true,
        });

        // Fetch all jobs and build a map jobNo → id
        const allJobs = await prisma.job.findMany();
        const jobMap = new Map(allJobs.map((j) => [j.jobNo, j.id]));

        // ── STEP 3: createMany WorkOrders ─────────────────────────
        const workOrders = cleanData
            .filter((row) => row["JOB NO."] && row["YARN DYED FACTORY NAME"])
            .map((row) => ({
                jobId: jobMap.get(row["JOB NO."]?.toString())!,
                factoryId: factoryMap.get(row["YARN DYED FACTORY NAME"])!,
                workOrderPlaceDate: row["WORK ORDER PLACE DATE"]
                    ? excelDateToJSDate(row["WORK ORDER PLACE DATE"])
                    : null,
                workOrderNo: row["WORK ORDER NO."]?.toString() ?? null,
                salesContractNo: row["SALES CONTRACT NO."]?.toString() ?? null,
                bookingColor: row["BOOKING COLOR"]?.toString() ?? null,
                composition: row["COMPOSITION"]?.toString() ?? null,
                dia: row["DIA"]?.toString() ?? null,
                yarnCount: row["YARN COUNT"]?.toString() ?? null,
                brandLot: row["BRAND / LOT"]?.toString() ?? null,
                yarnDyeingColor: row["YARN DYEING COLOR"]?.toString() ?? null,
                yarnDyedWorkOrderQty: row[" YARN DYED WORK ORDER (QTY) "]?.toString() ?? null,
                yarnDeliveryForYD: row[" YARN DELIVERY FOR Y/D "]?.toString() ?? null,
                delShortExcess: row["DEL. SHORT & EXCESS"]?.toString() ?? null,
                yarnReturnReceived: row["YARN RETURN RECEIVED"]?.toString() ?? null,
                greyReceivedFromYD: row["GREY RECEIVED FROM Y/D"] ?? null,
                finishYarnReceived: row["FINISH YARN RECEIVED"]?.toString() ?? null,
                yarnStock: row["YARN STOCK"]?.toString() ?? null,
                ydProcessLoss: row["Y/D PROCESS LOSS AS PER BOOKING"]?.toString() ?? null,
                processLossAfterYD: row["PROCESS LOSS AFTER Y/D"]?.toString() ?? null,
                ydPricePerKg: row["Y/D PRICE PER KG"]?.toString() ?? null,
                totalBillingAmount: row[" TOTAL BILLING AMOUNT "]?.toString() ?? null,
                deductionForDebitNote: row[" DEDUCTION FOR DEBIT NOTE "]?.toString() ?? null,
                payableAmount: row[" PAYABLE AMOUNT "]?.toString() ?? null,
                billNo: row[" BILL NO. "]?.toString() ?? null,
                paidBillingAmount: row[" PAID BILLING AMOUNT "]?.toString() ?? null,
                pendingBillingAmount: row[" PENDING BILLING AMOUNT "]?.toString() ?? null,
                remarks: row["REMARKS"]?.toString() ?? null,
            }));

        await prisma.workOrder.createMany({
            data: workOrders,
            skipDuplicates: true,
        });

        res.status(200).json({
            message: "File uploaded successfully",
            factories: uniqueFactoryNames.length,
            jobs: uniqueJobs.length,
            workOrders: workOrders.length,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
};