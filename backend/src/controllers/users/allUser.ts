import prisma from "../../database/prismaClient/prisma"
import type { Request, Response } from "express";

export const allUsers = async (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string }
    const users = await prisma.user.findMany(

        {
            where: {
                ...(userId && { id: Number(userId) }),
            },
            select: {
                name: true,
                id: true,
                dateOfJoin: true,
                designation: true,
                isActive: true,
                workingStation: true,
                userRole: true,
                ...userId && {
                    permissionSections: {
                        select: {
                            permittedSection: true,
                            isPermitted: {
                                select: {
                                    isPermitted: true
                                }
                            }
                        }
                    }
                }
            }
        }
    )

    if (!users) {
        res.status(404).send({ message: "No user found", type: "error" })
    }

    res.send(users)
}

export const userActiveInActive = async (req: Request, res: Response) => {
    const { userId, status } = req.params as { userId: string, status: string };
    console.log(userId, status);
    if (!userId || !status) {
        res.status(404).send({ message: "Missing required field", type: "error" })
    }

    let userStatus = null

    if (status === "true") {
        userStatus = true
    } else if (status === "false") {
        userStatus = false
    }

    if (typeof userStatus !== "boolean") {
        console.log("problem here");
        return res.status(400).send({ message: "Invalid status", type: "error" })
    }

    try {

        const updateUserActivity = await prisma.user.update(
            {
                where: { id: Number(userId) },
                data: {
                    isActive: userStatus
                }
            }
        )

        if (updateUserActivity) {
            res.status(200).send({ message: "User activity updated", type: "success" })
        }

    } catch (e) {
        console.log(e);
        res.status(400).send({ message: "Update Failed", type: "error" })
    }
}

export const getResponsibleUsers = async (req: Request, res: Response) => {
    const { section, responsibleType } = req.params;

    if (!responsibleType || !section) {
        return res.status(400).send({ message: "Required fields are missing", type: "error" })
    }

    const getResUser = await prisma.permissionSection.findMany(
        {
            where: { 
                permittedSection: String(section),
                isPermitted: {
                    some: {
                        isPermitted: String(responsibleType)
                    }
                }
            
            },
            select: {
                user: {
                    select: {
                        name: true,
                        id: true,
                    }
                }
            }
        }
    )

    if (!getResUser) {
        return res.status(400).send({ message: "No user found", type: "error" })
    }

    return res.status(200).send(getResUser)
}