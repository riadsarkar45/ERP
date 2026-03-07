import type { Request, Response } from "express";
import type { MulterFile } from "../../types/multerTypes.js";
import XLSX from "xlsx";

export const fileUpload = (req: Request & { file?: MulterFile }, res: Response): void => {
    try {
        if (!req.file || !req.file.path) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        // Read the Excel file
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

        // Convert sheet to JSON
        const data = XLSX.utils.sheet_to_json(sheet);

        // For now just log the data (you can later insert into DB)
        console.log(data);

        res.status(200).json({ message: "File uploaded successfully", rows: data.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong" });
    }
};