import type { Request, Response } from "express";
import { buildJobWhere, buildWorkOrderWhere } from "./workOrderFilter";
import prisma from "../../database/prismaClient/prisma";

export const getFilterOptions = async (req: Request, res: Response) => {
    try {
        const { orderType, column } = req.params as { orderType: string; column: string };
        let otherFilters: Record<string, string[]> = {};
        if (typeof req.query.filters === "string") {
            try { otherFilters = JSON.parse(req.query.filters); } catch {}
        }
        delete otherFilters[column]; // exclude the column we're computing options for, same as your old getDropdownOptions

        const level = FIELD_MAP[column];
        const workOrderWhere = buildWorkOrderWhere(orderType, otherFilters);
        const jobWhere = buildJobWhere(otherFilters);

        const jobs = await prisma.jobs.findMany({
            where: { ...jobWhere, workOrders: { some: workOrderWhere } },
            select: {
                jobNo: level === "job" ? true : undefined,
                workOrders: {
                    where: workOrderWhere,
                    select: {
                        [column]: level === "workOrder" ? true : undefined,
                        styleRequirement: level === "styleRequirement" ? { select: { [column]: true } } : undefined,
                        compositions: level === "composition" ? { select: { [column]: true } } : undefined,
                        yarnDyeingJobs: level === "yarnDyeingJob" ? { select: { [column]: true } } : undefined,
                    } as any,
                },
            },
        });

        const values = new Set<string>();
        for (const job of jobs) {
            if (level === "job" && (job as any).jobNo) values.add(String((job as any).jobNo));
            for (const wo of (job as any).workOrders ?? []) {
                if (level === "workOrder" && wo[column] != null) values.add(String(wo[column]));
                if (level === "styleRequirement" && wo.styleRequirement?.[column] != null) values.add(String(wo.styleRequirement[column]));
                if (level === "composition") wo.compositions?.forEach((c: any) => c[column] != null && values.add(String(c[column])));
                if (level === "yarnDyeingJob") wo.yarnDyeingJobs?.forEach((y: any) => y[column] != null && values.add(String(y[column])));
            }
        }

        const sorted = Array.from(values).sort((a, b) => {
            const na = Number(a), nb = Number(b);
            return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
        });

        return res.status(200).json({ type: "success", data: sorted });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};