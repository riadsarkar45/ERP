import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const ALL_FACTORIES = "ALL FOUR FACTORIES";

export const getContractualJobs = async (req: Request, res: Response) => {
    try {
        const userStation = req.user?.workingStation?.trim();

        if (!userStation) {
            return res
                .status(403)
                .send({ message: "No working station assigned to this user", type: "error" });
        }

        // Factory requested in the URL (optional)
        const requestedRaw = req.params.workingStation;
        const requestedValue = Array.isArray(requestedRaw) ? requestedRaw[0] : requestedRaw;
        const requested = requestedValue ? decodeURIComponent(requestedValue).trim() : "";

        const isAllAccess = userStation === ALL_FACTORIES;

        let factoryFilter: string | null; // null = no factory filter

        if (isAllAccess) {
            // All-factory users: URL factory is optional; empty, "ALL" or "ALL FOUR FACTORIES" means everything
            factoryFilter =
                requested && requested !== ALL_FACTORIES && requested !== "ALL"
                    ? requested
                    : null;
        } else {
            // Single-factory users can only ever see their own factory
            if (requested && requested !== userStation) {
                return res
                    .status(403)
                    .send({ message: "You do not have access to this factory", type: "error" });
            }
            factoryFilter = userStation;
        }

        const where = factoryFilter ? { manufacturingUnit: factoryFilter } : {};

        const jobs = await prisma.contractualJobs.findMany({
            where,
            orderBy: [{ date: "desc" }, { id: "desc" }],
            select: {
                id: true,
                date: true,
                input: true,
                output: true,
                processType: true,
                lineNo: true,
                processRate: true,
                manufacturingUnit: true,
                partyName: true,
                productionType: true,
                pricePerPcs: true,
                jobs: {
                    select: { jobNo: true },
                },
                styleReqRows: {
                    select: {
                        id: true,
                        orderQty: true,
                        styleRequirement: {
                            select: { styleNo: true },
                        },
                    },
                },
            },
        });

        return res.status(200).send(jobs);
    } catch (e) {
        console.error("getContractualJobs error:", e);
        return res
            .status(500)
            .send({ message: "Something went wrong. Please try again later.", type: "error" });
    }
};