import { AlertCircle, Package, Plus, Save, Trash2, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFetchData } from "../../../hooks/fetch";

/* ----------------------------------------------------------------------------
 * Config
 * ------------------------------------------------------------------------- */
const DELIVERY_TYPES = [
    { value: "Received From Spinning", label: "Received From Spinning" },
    { value: "Return To Spinning", label: "Return To Spinning" },
];

// Fields a user can edit on a challan row. Only these are ever diffed / sent.
const EDITABLE_FIELDS = ["challanNo", "quantity", "date", "deliveryType"];

const inputCls =
    "w-full h-9 px-2.5 rounded-md border bg-white text-sm text-slate-900 placeholder:text-slate-400 " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors";

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */
const itemKeyOf = (pi, pIdx, item, iIdx) =>
    `${pi?.id ?? pi?.piNo ?? pIdx}::${item?.id ?? item?.itemId ?? iIdx}`;

// Normalise a server challan into the editable row shape.
const toRow = (c, idx) => ({
    rid: String(c.id ?? c._id ?? `srv-${idx}`),
    isNew: false,
    deleted: false,
    challanNo: c.challanNo ?? c.challan ?? "",
    quantity: c.quantity ?? "",
    date: c.date ? String(c.date).slice(0, 10) : "",
    deliveryType: c.deliveryType ?? "",
});

const emptyRow = (rid) => ({
    rid,
    isNew: true,
    deleted: false,
    challanNo: "",
    quantity: "",
    date: "",
    deliveryType: "",
});

// Build { itemKey: Row[] } and the pristine baseline { rid: originalFields }.
function buildState(data) {
    const rows = {};
    const baseline = {};
    data.forEach((pi, pIdx) => {
        (pi?.items ?? []).forEach((item, iIdx) => {
            const key = itemKeyOf(pi, pIdx, item, iIdx);
            const existing = (item?.challans ?? []).map(toRow);
            existing.forEach((r) => {
                baseline[r.rid] = Object.fromEntries(EDITABLE_FIELDS.map((f) => [f, r[f]]));
            });
            rows[key] = existing;
        });
    });
    return { rows, baseline };
}

const isRowValid = (r) =>
    String(r.challanNo).trim() &&
    Number(r.quantity) > 0 &&
    r.date &&
    r.deliveryType;

/* ----------------------------------------------------------------------------
 * Small presentational pieces
 * ------------------------------------------------------------------------- */
function InfoCell({ label, value }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900 truncate" title={value || ""}>
                {value || "—"}
            </dd>
        </div>
    );
}

function ChallanRow({ row, showErrors, onChange, onRemove, onRestore }) {
    const bad = (cond) => (showErrors && !row.deleted && cond ? "border-red-400" : "border-slate-300");

    return (
        <div
            className={`grid grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr_1.6fr_auto] gap-2 items-start p-2.5 rounded-md border
                ${row.deleted ? "bg-slate-50 border-slate-200 opacity-60" : "bg-white border-slate-200"}
                ${row.isNew && !row.deleted ? "border-l-4 border-l-indigo-500" : ""}`}
        >
            <input
                type="text"
                aria-label="Challan number"
                placeholder="Challan no."
                disabled={row.deleted}
                value={row.challanNo}
                onChange={(e) => onChange("challanNo", e.target.value)}
                className={`${inputCls} ${bad(!String(row.challanNo).trim())} ${row.deleted ? "line-through" : ""}`}
            />
            <input
                type="number"
                min="0"
                step="any"
                aria-label="Quantity"
                placeholder="Quantity"
                disabled={row.deleted}
                value={row.quantity}
                onChange={(e) => onChange("quantity", e.target.value)}
                className={`${inputCls} ${bad(!(Number(row.quantity) > 0))}`}
            />
            <input
                type="date"
                aria-label="Delivery date"
                disabled={row.deleted}
                value={row.date}
                onChange={(e) => onChange("date", e.target.value)}
                className={`${inputCls} ${bad(!row.date)}`}
            />
            <select
                aria-label="Delivery type"
                disabled={row.deleted}
                value={row.deliveryType}
                onChange={(e) => onChange("deliveryType", e.target.value)}
                className={`${inputCls} ${bad(!row.deliveryType)}`}
            >
                <option value="">Select delivery type</option>
                {DELIVERY_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                ))}
            </select>

            {row.deleted ? (
                <button
                    type="button"
                    onClick={onRestore}
                    className="h-9 px-2.5 inline-flex items-center gap-1 rounded-md text-sm text-slate-700 hover:bg-slate-200"
                >
                    <Undo2 size={15} /> Undo
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onRemove}
                    title="Remove challan"
                    aria-label="Remove challan"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    );
}

/* ----------------------------------------------------------------------------
 * Modal
 * ------------------------------------------------------------------------- */
export function ChallanRecordModal({ mode, initial, onSave, onClose, piNo }) {
    const { fetchData, loading, error: fetchError } = useFetchData();

    const [piData, setPiData] = useState([]);
    const [rows, setRows] = useState({}); // { itemKey: Row[] }
    const baselineRef = useRef({});       // { rid: original editable fields }
    const tmpCounter = useRef(0);
    const [showErrors, setShowErrors] = useState(false);

    // Keep a ref to fetchData so an unstable hook identity can't retrigger the request.
    const fetchRef = useRef(fetchData);
    fetchRef.current = fetchData;

    /* ---- load PI data ---- */
    useEffect(() => {
        let cancelled = false;
        fetchRef.current(`/api/yarn-purchase-data/${piNo}`)
            .then((res) => {
                if (cancelled) return;
                const data = Array.isArray(res.data) ? res.data : [];
                const { rows: r, baseline } = buildState(data);
                baselineRef.current = baseline;
                setPiData(data);
                setRows(r);
            })
            .catch((e) => console.error(e));
        return () => { cancelled = true; };
    }, [piNo]);

    /* ---- row actions ---- */
    const updateRow = (key, rid, field, value) => {
        setRows((prev) => ({
            ...prev,
            [key]: prev[key].map((r) => (r.rid === rid ? { ...r, [field]: value } : r)),
        }));
    };

    const addRow = (key) => {
        const rid = `new-${++tmpCounter.current}`;
        setRows((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), emptyRow(rid)] }));
    };

    const removeRow = (key, rid) => {
        setRows((prev) => ({
            ...prev,
            [key]: prev[key]
                .map((r) => (r.rid === rid ? { ...r, deleted: true } : r))
                // rows that never reached the server just disappear
                .filter((r) => !(r.isNew && r.deleted)),
        }));
    };

    const restoreRow = (key, rid) => {
        setRows((prev) => ({
            ...prev,
            [key]: prev[key].map((r) => (r.rid === rid ? { ...r, deleted: false } : r)),
        }));
    };

    /* ---- diff: build a payload containing ONLY what changed ---- */
    const { payload, changeCount, invalidCount } = useMemo(() => {
        const items = [];
        let count = 0;
        let invalid = 0;

        piData.forEach((pi, pIdx) => {
            (pi?.items ?? []).forEach((item, iIdx) => {
                const key = itemKeyOf(pi, pIdx, item, iIdx);
                const list = rows[key] ?? [];
                const added = [];
                const updated = [];
                const removed = [];

                list.forEach((r) => {
                    if (r.isNew) {
                        if (r.deleted) return;
                        added.push({
                            challanNo: String(r.challanNo).trim(),
                            quantity: Number(r.quantity),
                            date: r.date,
                            deliveryType: r.deliveryType,
                        });
                        if (!isRowValid(r)) invalid++;
                        return;
                    }
                    if (r.deleted) {
                        removed.push(r.rid);
                        return;
                    }
                    const base = baselineRef.current[r.rid] ?? {};
                    const changes = {};
                    EDITABLE_FIELDS.forEach((f) => {
                        if (String(r[f]) !== String(base[f])) {
                            changes[f] = f === "quantity" ? Number(r[f]) : f === "challanNo" ? String(r[f]).trim() : r[f];
                        }
                    });
                    if (Object.keys(changes).length) {
                        updated.push({ id: r.rid, changes });
                        if (!isRowValid(r)) invalid++;
                    }
                });

                if (added.length || updated.length || removed.length) {
                    count += added.length + updated.length + removed.length;
                    items.push({
                        itemId: item?.id ?? item?.itemId ?? iIdx,
                        piId: pi?.id ?? pi?.piNo ?? pIdx,
                        composition: item?.composition,
                        ...(added.length && { added }),
                        ...(updated.length && { updated }),
                        ...(removed.length && { removed }),
                    });
                }
            });
        });

        return { payload: { piNo, items }, changeCount: count, invalidCount: invalid };
    }, [piData, rows, piNo]);

    const isDirty = changeCount > 0;

    /* ---- close / save ---- */
    const requestClose = useCallback(() => {
        if (isDirty && !window.confirm("You have unsaved changes. Discard them and close?")) return;
        onClose?.();
    }, [isDirty, onClose]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                requestClose();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [requestClose]);

    const handleSave = () => {
        if (!isDirty) return;
        if (invalidCount > 0) {
            setShowErrors(true);
            return;
        }
        console.log("Challan payload (changed fields only):", JSON.stringify(payload, null, 2));
        onSave?.(payload);
    };

    /* ---- render ---- */
    const totalChallans = Object.values(rows).reduce((n, list) => n + list.filter((r) => !r.deleted).length, 0);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="challan-modal-title"
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
                    <div>
                        <h3 id="challan-modal-title" className="text-lg font-semibold text-slate-900">
                            {mode === "add" ? "Add challans" : "Modify challans"}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {mode === "add"
                                ? `Record yarn deliveries against PI ${piNo}.`
                                : `Editing challans for PI ${piNo}. Only changed fields are saved.`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        title="Close (Esc)"
                        aria-label="Close"
                        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-slate-50/60">
                    {loading && <p className="text-sm text-slate-500">Loading PI data…</p>}

                    {!loading && fetchError && (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            <AlertCircle size={16} /> Couldn't load PI data. Close the dialog and try again.
                        </div>
                    )}

                    {!loading && !fetchError && piData.length === 0 && (
                        <p className="text-sm text-slate-500">No purchase data found for PI {piNo}.</p>
                    )}

                    {piData.map((pi, pIdx) => (
                        <section key={pi?.id ?? pi?.piNo ?? pIdx} className="bg-white rounded-lg border border-slate-200">
                            {/* PI summary (read-only) */}
                            <dl className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-3 p-4 border-b border-slate-200">
                                <InfoCell label="PI no." value={pi?.piNo} />
                                <InfoCell label="PI date" value={pi?.piDate ? String(pi.piDate).slice(0, 10) : ""} />
                                <InfoCell label="PO no." value={pi?.poNo} />
                                <InfoCell label="LC no." value={pi?.lcNo} />
                                <InfoCell label="Supplier" value={pi?.supplierName} />
                            </dl>

                            {/* Items */}
                            <div className="p-4 space-y-5">
                                {(pi?.items ?? []).map((item, iIdx) => {
                                    const key = itemKeyOf(pi, pIdx, item, iIdx);
                                    const list = rows[key] ?? [];
                                    const live = list.filter((r) => !r.deleted).length;

                                    return (
                                        <div key={key}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Package size={16} className="text-slate-400 shrink-0" />
                                                    <span className="text-sm font-medium text-slate-900 truncate">
                                                        {item?.composition || "Item"}
                                                    </span>
                                                    <span className="text-xs text-slate-500 shrink-0">
                                                        {live} {live === 1 ? "challan" : "challans"}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => addRow(key)}
                                                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    <Plus size={15} /> Add challan
                                                </button>
                                            </div>

                                            {list.length === 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => addRow(key)}
                                                    className="w-full py-4 rounded-md border border-dashed border-slate-300 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-700"
                                                >
                                                    No challans yet. Add the first one.
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    {list.map((row) => (
                                                        <ChallanRow
                                                            key={row.rid}
                                                            row={row}
                                                            showErrors={showErrors}
                                                            onChange={(f, v) => updateRow(key, row.rid, f, v)}
                                                            onRemove={() => removeRow(key, row.rid)}
                                                            onRestore={() => restoreRow(key, row.rid)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}

                    {showErrors && invalidCount > 0 && (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            <AlertCircle size={16} />
                            {invalidCount} {invalidCount === 1 ? "challan is" : "challans are"} incomplete. Fill in challan no.,
                            quantity, date and delivery type.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-200 bg-white rounded-b-xl">
                    <span className="text-xs text-slate-500">
                        {isDirty
                            ? `${changeCount} unsaved ${changeCount === 1 ? "change" : "changes"}`
                            : totalChallans
                                ? "No changes yet"
                                : "Esc to close"}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={requestClose}
                            className="h-9 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            {isDirty ? "Discard" : "Close"}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!isDirty}
                            className="h-9 px-4 inline-flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            <Save size={15} /> Save changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}