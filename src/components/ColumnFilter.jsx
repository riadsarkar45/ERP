import { useState } from "react";

export default function ColumnFilter({ values, activeFilter, onApply, onClose }) {
    const unique = [...new Set(values.map((v) => String(v ?? "")))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
    );

    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(() =>
        activeFilter.size === 0 ? new Set(unique) : new Set(activeFilter)
    );

    const visible = unique.filter((v) => v.toLowerCase().includes(search.toLowerCase()));

    const toggle = (val) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(val) ? next.delete(val) : next.add(val);
            return next;
        });

    const handleApply = () =>
        onApply(selected.size === unique.length ? new Set() : selected);

    return (
        <div
            className="absolute top-full left-0 z-50 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-2 border-b border-gray-100">
                <input
                    autoFocus
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:border-blue-400"
                />
            </div>

            <div className="flex gap-3 px-3 py-1.5 border-b border-gray-100">
                <button onClick={() => setSelected(new Set(unique))} className="text-xs text-blue-600 hover:underline">
                    Select all
                </button>
                <button onClick={() => setSelected(new Set())} className="text-xs text-blue-600 hover:underline">
                    Clear
                </button>
            </div>

            <div className="overflow-y-auto max-h-48 py-1">
                {visible.length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-400">No results</p>
                )}
                {visible.map((val) => (
                    <label key={val} className="flex items-center gap-2 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selected.has(val)}
                            onChange={() => toggle(val)}
                        />
                        <span className="truncate">{val || "(blank)"}</span>
                    </label>
                ))}
            </div>

            <div className="flex justify-end gap-2 p-2 border-t border-gray-100">
                <button onClick={onClose} className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50">
                    Cancel
                </button>
                <button onClick={handleApply} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                    Apply
                </button>
            </div>
        </div>
    );
}