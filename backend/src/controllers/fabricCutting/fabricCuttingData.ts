import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const cuttingDataUpdate = async (req: Request, res: Response) => {
    const { rows, styleInfos } = req.body;
    console.log(rows, styleInfos, "cutting data update");

    try {
        await prisma.$transaction(async (tx) => {
            const findStyleId = await tx.styleRequirement.findUnique(
                {
                    where: { styleNo: styleInfos.styleNo as string }
                }
            )

            if (!findStyleId) {
                throw new Error("Style not found");
            }

            await tx.sizes.createMany(
                {
                    data: rows.map((row: any) => ({
                        sizeName: row.size,
                        styleId: Number(findStyleId.id),
                        cuttingStyleId: Number(findStyleId.id),
                        styleRequirementId: Number(findStyleId.id),
                        createdAt: new Date(),
                    }), {
                        timeout: 15000
                    })
                }
            )


        }, {
            timeout: 15000
        })
        res.status(200).send({ message: "Cutting data updated successfully", type: "success" })
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Error updating cutting data", type: "error" })
    }

}