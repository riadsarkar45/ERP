import prisma from "../../database/prismaClient/prisma"
import type { Request, Response } from "express";

export const allUsers = async (req: Request, res: Response) => {
    const users = await prisma.user.findMany(
        {
            select: {
                name: true,
                id: true,
            }
        }
    )

    if (!users) {
        res.status(404).send({ message: "No user found", type: "error" })
    }

    res.send(users)
}