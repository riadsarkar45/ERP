import { useState } from "react";

export function useTableFilter(rows, columnCount) {
    const [globalSearch, setGlobalSearch] = useState("");
    const [colFilters, setColFilters] = useState(() => Array.from({ length: columnCount }, () => new Set()));
    const [sortCol, setSortCol] = useState(-1);
    const [sortDir, setSortDir] = useState(1);

    const setColFilter = (colIdx, filter) =>
        setColFilters((prev) => prev.map((f, i) => (i === colIdx ? filter : f)));

    const handleSort = (colIdx) => {
        if (sortCol === colIdx) setSortDir((d) => d * -1);
        else { setSortCol(colIdx); setSortDir(1); }
    };

    const clearAll = () => {
        setColFilters(Array.from({ length: columnCount }, () => new Set()));
        setGlobalSearch("");
        setSortCol(-1);
        setSortDir(1);
    };

    const filtered = rows
        .filter((row) => {
            const passGlobal = !globalSearch || row.some((cell) =>
                String(cell).toLowerCase().includes(globalSearch.toLowerCase())
            );
            const passCol = colFilters.every((filter, i) =>
                filter.size === 0 || filter.has(String(row[i] ?? ""))
            );
            return passGlobal && passCol;
        })
        .sort((a, b) => {
            if (sortCol < 0) return 0;
            const av = a[sortCol], bv = b[sortCol];
            const an = parseFloat(av), bn = parseFloat(bv);
            if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir;
            return String(av).localeCompare(String(bv)) * sortDir;
        });

    const isActive = colFilters.some((f) => f.size > 0) || !!globalSearch;

    return {
        filtered,
        globalSearch,
        setGlobalSearch,
        colFilters,
        setColFilter,
        sortCol,
        sortDir,
        handleSort,
        clearAll,
        isActive,
    };
}