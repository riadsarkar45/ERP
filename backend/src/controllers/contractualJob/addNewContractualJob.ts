import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const isFilled = (v: unknown) =>
    v !== undefined && v !== null && String(v).trim() !== "";

export const addNewContractualJob = async (req: Request, res: Response) => {
    const {
        jobNo,
        compositionId,
        date,
        lineNo,
        manufacturingUnit,
        entryType,
        processType,
        pricePerPcs,
        input,
        output,
    } = req.body ?? {};

    const workingStation = req.user?.workingStation

    console.log(workingStation);

    // ---- Validation ----
    if (!isFilled(jobNo) || !isFilled(compositionId) || !isFilled(date) || !isFilled(processType)) {
        return res.status(400).send({ message: "Missing required fields." });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        return res.status(400).send({ message: "Invalid date." });
    }

    const type = entryType === "COMPLETE_GMTS" ? "COMPLETE_GMTS" : "PROCESS";

    // Only rows with a real edited value are inserted
    if (type === "PROCESS" && !isFilled(input) && !isFilled(output)) {
        return res.status(400).send({ message: "Enter an input or output value." });
    }
    if (type === "COMPLETE_GMTS") {
        if (!isFilled(input) && !isFilled(output)) {
            return res.status(400).send({ message: "Enter the production quantity." });
        }
        if (!isFilled(pricePerPcs) || isNaN(Number(pricePerPcs))) {
            return res.status(400).send({ message: "Enter a valid price per piece." });
        }
    }

    try {
        const [composition, job] = await Promise.all([
            prisma.styleRequirementRow.findUnique({
                where: { id: Number(compositionId) },
                select: { id: true },
            }),
            prisma.jobs.findUnique({
                where: { jobNo: String(jobNo) },
                select: { id: true },
            }),
        ]);

        if (!composition) {
            return res.status(404).send({ message: "Composition not found." });
        }
        if (!job) {
            return res.status(404).send({ message: "Job not found." });
        }

        // Rate: complete garments use the entered price, processes use the saved rate
        let processRate: any;
        if (type === "COMPLETE_GMTS") {
            processRate = Number(pricePerPcs);
        } else {
            const processTypeRow = await prisma.processTypes.findUnique({
                where: { processType: String(processType) },
                select: { processRate: true },
            });
            if (!processTypeRow) {
                return res.status(404).send({ message: `Process type "${processType}" not found.` });
            }
            processRate = processTypeRow.processRate;
        }

        // Build data with only the values that were actually filled in
        const data: Record<string, any> = {
            jobId: job.id,
            styleRequirementRowId: composition.id,
            date: parsedDate,
            processType: String(processType),
            processRate:String(processRate),
            workingStation: workingStation,
            entryType: type,
        };
        if (isFilled(lineNo)) data.lineNo = lineNo;
        if (isFilled(manufacturingUnit)) data.manufacturingUnit = String(manufacturingUnit);
        if (isFilled(input)) data.input = String(input);
        if (isFilled(output)) data.output = String(output);
        if (type === "COMPLETE_GMTS") data.pricePerPcs = Number(pricePerPcs);

        const created = await prisma.contractualJobs.create({ data: data as any });

        return res.status(201).send({ message: "Contractual job created", id: created.id });
    } catch (e) {
        console.error("addNewContractualJob error:", e);
        return res.status(500).send({ message: "Something went wrong. Please try again later." });
    }
};