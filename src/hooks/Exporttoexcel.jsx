import * as XLSX from "xlsx";

export function exportToExcel(columns, rows, filename = "export") {
    const worksheet = XLSX.utils.aoa_to_sheet([columns, ...rows]);

    worksheet["!cols"] = columns.map((col, i) => ({
        wch: Math.max(col.length, ...rows.map((row) => String(row[i] ?? "").length)) + 2,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}