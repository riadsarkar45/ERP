import type { Request, Response } from "express";

export const insertYarnPiData = async (req: Request, res: Response) => {
    if (!req.body || !Array.isArray(req.body)) {
        return res.status(400).json({ error: "Invalid request body" });
    }

    

}