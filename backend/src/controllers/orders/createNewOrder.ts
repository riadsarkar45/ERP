import type { Request, Response } from "express";
export const createNewOrder = (req: Request, res: Response) => {
    res.send({ message: "request received" })
}