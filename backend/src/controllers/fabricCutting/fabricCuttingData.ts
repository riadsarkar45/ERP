import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const cuttingDataUpdate = async (req: Request, res: Response) => {
    const { rows, styleInfos } = req.body;
    console.log(rows, styleInfos, "cutting data update");

    try {
        await prisma.$transaction(async (tx) => {
            let styleId = null;
            const findStyleId = await tx.styleRequirement.findUnique(
                {
                    where: { styleNo: styleInfos.styleNo as string }
                }
            )
            styleId = findStyleId ? findStyleId?.id : null;
            const cuttingStyleData = await tx.cuttingStyle.create(
                {
                    data: {
                        styleName: styleInfos.styleNo as string,
                        buyerName: styleInfos.buyerName as string,
                        item: styleInfos.item as string,
                        fabricRequired: styleInfos.fabricRequired as string,
                        fabricReceived: styleInfos.fabricReceived as string,
                        color: styleInfos.color as string,
                        styleId: Number(styleId) as number,
                        createdAt: new Date(),
                    },
                    select: {
                        id: true,
                    }
                },

            )

            await tx.sizes.createMany(
                {
                    data: rows.map((row: any) => ({ 
                        sizeName: row.size,
                        styleId: Number(cuttingStyleData.id),
                        cuttingStyleId: Number(cuttingStyleData.id),
                        createdAt: new Date(),
                    }))
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