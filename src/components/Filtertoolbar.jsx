import { FileDown } from "lucide-react";

export default function FilterToolbar({ globalSearch, onSearch, onClear, onExport, isActive, total, filtered }) {
    return (
        <div className="flex items-center gap-3 mb-3 flex-wrap">
            <input
                type="text"
                placeholder="Search all columns..."
                value={globalSearch}
                onChange={(e) => onSearch(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 w-56"
            />

            {isActive && (
                <button
                    onClick={onClear}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                >
                    Clear all filters
                </button>
            )}

            <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ml-auto"
            >
                <FileDown size={14} />
                Export Excel
            </button>

            <span className="text-xs text-gray-400">
                {filtered} of {total} rows
            </span>
        </div>
    );
}