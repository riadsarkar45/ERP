import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const updateJobStatus = async (req: Request, res: Response) => {
    const { status, jobId } = req.params as { status: string, jobId: string };
    console.log("req.params");
    if (!status || !jobId) {
        return res.send({ message: "Something went wrong", type: "error" })
    }

   


    

    res.status(201).send({ message: "Update successful", type: "success" })
}