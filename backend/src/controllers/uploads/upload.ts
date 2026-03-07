import type { Request, Response } from "express";
import XLSX from "xlsx";

export const fileUpload = (req: Request, res: Response): void => {
    console.log("hit counted");
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const workBook = XLSX.readFile(req.file.path);
        const sheetName = workBook.SheetNames[0];

        if (!sheetName) {
            res.status(400).json({ message: "No sheets found in the Excel file" });
            return;
        }

        const sheet = workBook.Sheets[sheetName];

        if (!sheet) {
            res.status(400).json({ message: "Sheet is empty or not found" });
            return;
        }

        const data = XLSX.utils.sheet_to_json(sheet, {
            range: 6, // Skip the first 6 rows
            defval: null, // Set default value for empty cells to null
        });
        
        console.log(data, "datas");

        res.status(200).json({ message: "File uploaded successfully", rows: data.length, data: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
};