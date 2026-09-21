import { Fragment, useState } from "react";
import { X, ChevronDown, ArrowUpRight, Loader2 } from "lucide-react";

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

// zero shows as a dash so the many type columns stay readable
const fmtCell = (n) => (n ? fmt(n) : <span className="text-neutral-300">–</span>);

const KIND = {
  sent: { head: "bg-emerald-50 text-emerald-700", cell: "text-neutral-800", dot: "bg-emerald-500", label: "Sent" },
  returned: { head: "bg-amber-50 text-amber-700", cell: "text-amber-700", dot: "bg-amber-500", label: "Returned" },
  received: { head: "bg-blue-50 text-blue-700", cell: "text-blue-700", dot: "bg-blue-500", label: "Received" },
  other: { head: "bg-neutral-100 text-neutral-600", cell: "text-neutral-600", dot: "bg-neutral-400", label: "Other" },
};

function Balance({ value }) {
  const over = value < 0;
  return (
    <span className={over ? "text-red-600" : "text-emerald-600"} title={over ? "Over-delivered" : "Pending"}>
      {over ? `+${fmt(Math.abs(value))} over` : fmt(value)}
    </span>
  );
}

function Stat({ label, children }) {
  return (
    <div>
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className="text-[15px] font-semibold tabular-nums text-neutral-900 mt-0.5">{children}</div>
    </div>
  );
}

function SummaryCard({ summary }) {
  const {
    workOrderQty = 0,
    deliveredQty = 0,
    pendingQty = 0,
    returnedQty = 0,
    receivedQty = 0,
    yetToReceive = 0,
    toFactory = [],
  } = summary || {};
  if (workOrderQty <= 0) return null;

  const isOver = pendingQty < 0;
  const rawPct = (deliveredQty / workOrderQty) * 100;
  const barWidth = Math.min(100, Math.max(0, rawPct));

  return (
    <div className="mx-5 mt-4 mb-1 rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 py-3.5">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <Stat label="Work Order Qty">{fmt(workOrderQty)}</Stat>
        <Stat label="Delivered (net)">{fmt(deliveredQty)}</Stat>
        <Stat label={isOver ? "Over-delivered" : "Pending"}>
          <span className={isOver ? "text-red-600" : "text-emerald-600"}>
            {isOver ? `+${fmt(Math.abs(pendingQty))}` : fmt(pendingQty)}
          </span>
        </Stat>
        <Stat label="Returned">
          <span className="text-amber-600">{fmt(returnedQty)}</span>
        </Stat>
        <Stat label="Received">
          <span className="text-blue-600">{fmt(receivedQty)}</span>
        </Stat>
        <Stat label="Yet to receive">{fmt(yetToReceive)}</Stat>
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isOver ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <div className="mt-1 text-[11px] text-neutral-500 tabular-nums">{rawPct.toFixed(1)}% delivered</div>
      </div>

      {toFactory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-200 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
          <ArrowUpRight size={13} className="text-blue-500" />
          Delivered to:
          {toFactory.map((t) => (
            <span key={t.factory} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 tabular-nums">
              {t.factory === "Unknown" ? "Not specified" : t.factory}: {fmt(t.qty)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryTable({ columns, rows, summary }) {
  const [open, setOpen] = useState(null);
  if (!rows?.length) return null;

  const colCount = columns.length + 4; // factory, WO qty, delivered, balance

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-2 text-[11px] text-neutral-500">
        <span className="font-medium tracking-wide">Factory wise work orders</span>
        {["sent", "returned", "received"].map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${KIND[k].dot}`} />
            {KIND[k].label}
          </span>
        ))}
      </div>

      <div className="border border-neutral-200 rounded-md overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-[11px] text-neutral-500 border-b border-neutral-200">
              <th className="sticky left-0 z-10 bg-neutral-50 text-left font-medium px-3 py-2 min-w-[190px]">
                Factory
              </th>
              <th className="bg-neutral-50 text-right font-medium px-3 py-2 whitespace-nowrap">WO Qty</th>
              {columns.map((c) => (
                <th
                  key={c.deliveryType}
                  className={`text-right font-medium px-3 py-2 whitespace-nowrap ${KIND[c.kind].head}`}
                >
                  {c.deliveryType}
                </th>
              ))}
              <th className="bg-neutral-50 text-right font-medium px-3 py-2 whitespace-nowrap">Delivered (net)</th>
              <th className="bg-neutral-50 text-right font-medium px-3 py-2 whitespace-nowrap">Balance</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const isOpen = open === r.factory;
              return (
                <Fragment key={r.factory}>
                  <tr
                    onClick={() => setOpen(isOpen ? null : r.factory)}
                    className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50"
                  >
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 text-neutral-800">
                      <span className="flex items-center gap-1.5">
                        <ChevronDown
                          size={14}
                          className={`shrink-0 text-neutral-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                        />
                        <span>{r.factory}</span>
                        <span className="text-[11px] text-neutral-400">({r.workOrders.length})</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.workOrderQty)}</td>
                    {columns.map((c) => (
                      <td key={c.deliveryType} className={`px-3 py-2 text-right tabular-nums ${KIND[c.kind].cell}`}>
                        {fmtCell(r.types?.[c.deliveryType])}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(r.deliveredQty)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium whitespace-nowrap">
                      <Balance value={r.pendingQty} />
                    </td>
                  </tr>

                  {isOpen &&
                    r.workOrders.map((wo, idx) => (
                      <Fragment key={`${wo.workOrderNo}-${idx}`}>
                        <tr className="text-[13px] text-neutral-600 bg-neutral-50/50 border-b border-neutral-100">
                          <td className="sticky left-0 z-10 bg-neutral-50 pl-10 pr-3 py-1.5">
                            WO #{wo.workOrderNo}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmt(wo.workOrderQty)}</td>
                          {columns.map((c) => (
                            <td
                              key={c.deliveryType}
                              className={`px-3 py-1.5 text-right tabular-nums ${KIND[c.kind].cell}`}
                            >
                              {fmtCell(wo.types?.[c.deliveryType])}
                            </td>
                          ))}
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmt(wo.deliveredQty)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                            <Balance value={wo.pendingQty} />
                          </td>
                        </tr>

                        {wo.toFactory?.length > 0 && (
                          <tr className="bg-neutral-50/50 border-b border-neutral-100">
                            <td colSpan={colCount} className="pl-10 pr-3 pb-2 pt-0.5">
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                                <ArrowUpRight size={12} className="text-blue-500" />
                                Delivered to:
                                {wo.toFactory.map((t) => (
                                  <span
                                    key={t.factory}
                                    className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 tabular-nums"
                                  >
                                    {t.factory === "Unknown" ? "Not specified" : t.factory}: {fmt(t.qty)}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                </Fragment>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-900">
              <td className="sticky left-0 z-10 bg-neutral-50 px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(summary?.workOrderQty)}</td>
              {columns.map((c) => (
                <td key={c.deliveryType} className="px-3 py-2 text-right tabular-nums">
                  {fmtCell(summary?.types?.[c.deliveryType])}
                </td>
              ))}
              <td className="px-3 py-2 text-right tabular-nums">{fmt(summary?.deliveredQty)}</td>
              <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                <Balance value={summary?.pendingQty || 0} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// jobDetails = response.data.data
// { jobNo, orderType, columns, summary, factoryWise }
const JobModal = ({ isOpen, jobDetails, loading, onClose }) => {
  if (!isOpen) return null;

  const isEmpty = !jobDetails || !jobDetails.factoryWise?.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-6xl max-h-[88vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-neutral-200">
          <div className="flex gap-8">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-neutral-400 font-medium">Job No</div>
              <div className="text-lg font-semibold text-neutral-900 mt-0.5">{jobDetails?.jobNo || "—"}</div>
            </div>
            {jobDetails?.orderType && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-neutral-400 font-medium">Order Type</div>
                <div className="text-lg font-semibold text-neutral-900 mt-0.5">{jobDetails.orderType}</div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary card */}
        {!loading && !isEmpty && <SummaryCard summary={jobDetails.summary} />}

        {/* Body */}
        <div className="overflow-y-auto px-5 py-3 flex-1 min-h-[160px]">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-neutral-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading details...
            </div>
          )}

          {!loading && isEmpty && <div className="py-16 text-center text-sm text-neutral-400">No details found.</div>}

          {!loading && !isEmpty && (
            <DeliveryTable
              columns={jobDetails.columns || []}
              rows={jobDetails.factoryWise}
              summary={jobDetails.summary}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default JobModal;