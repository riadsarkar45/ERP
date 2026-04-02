import { useEffect, useRef, useState } from "react";
import ColumnFilter from "./ColumnFilter";

export default function ColumnHeader({ label, values, activeFilter, onFilterApply, isSorted, sortDir, onSort }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const isActive = activeFilter.size > 0;

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <th className="px-0 py-0 border border-gray-200 bg-gray-50 whitespace-nowrap" style={{ minWidth: 140 }}>
            <div className="flex flex-col px-2 pt-2 pb-1 gap-1">
                <button
                    onClick={onSort}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900 text-left"
                >
                    {label}
                    <span className="text-gray-400 text-[10px]">
                        {isSorted ? (sortDir === 1 ? "↑" : "↓") : "↕"}
                    </span>
                </button>

                <div className="relative" ref={ref}>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className={`w-full flex items-center justify-between px-2 py-0.5 text-xs rounded border transition-colors ${
                            isActive
                                ? "border-blue-400 bg-blue-50 text-blue-700"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                    >
                        <span className="truncate">{isActive ? `${activeFilter.size} selected` : "All"}</span>
                        <span className="text-[10px] ml-1">▼</span>
                    </button>

                    {open && (
                        <ColumnFilter
                            values={values}
                            activeFilter={activeFilter}
                            onApply={(filter) => { onFilterApply(filter); setOpen(false); }}
                            onClose={() => setOpen(false)}
                        />
                    )}
                </div>
            </div>
        </th>
    );
}