import { useState } from "react";
import { X, ChevronDown, ArrowUpRight, Factory, Loader2 } from "lucide-react";

function toLabel(key) {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function sumValues(obj) {
  return Object.entries(obj || {})
    .filter(([name]) => name !== "Unknown")
    .reduce((s, [, v]) => s + Number(v || 0), 0);
}

function FactoryTable({ title, icon, rows, tint }) {
  const entries = Object.entries(rows || {})
    .filter(([name]) => name !== "Unknown")
    .sort((a, b) => b[1] - a[1]);

  // No real (non-"Unknown") entries for this side — don't render it at all.
  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="flex-1 min-w-[240px]">
      <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-neutral-500 mb-1.5">
        {icon}
        {title}
      </div>
      <div className="border border-neutral-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {entries.map(([name, qty], i) => (
              <tr key={name} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                <td className="px-3 py-1.5 text-neutral-700">{name}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-neutral-800 whitespace-nowrap">
                  {fmt(qty)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={`border-t ${tint}`}>
              <td className="px-3 py-1.5 text-xs font-medium text-neutral-600">Total</td>
              <td className="px-3 py-1.5 text-right text-xs font-semibold tabular-nums text-neutral-900">
                {fmt(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DeliveryTypeRow({ type, qty, toRows, fromRows, isOpen, onToggle }) {
  return (
    <div className="border-b border-neutral-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-neutral-50 transition-colors rounded"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            size={15}
            className={`text-neutral-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          />
          <span className="text-[15px] text-neutral-800">{toLabel(type)}</span>
        </div>
        <span className="text-[15px] font-semibold tabular-nums text-neutral-900">{fmt(qty)}</span>
      </button>

      {isOpen && (
        <div className="pb-4 pl-6 pr-1 flex flex-wrap gap-4">
          <FactoryTable
            title="To Factory"
            icon={<ArrowUpRight size={13} className="text-blue-500" />}
            rows={toRows}
            tint="border-blue-100 bg-blue-50/50"
          />
          <FactoryTable
            title="From Factory"
            icon={<ArrowUpRight size={13} className="text-amber-500 rotate-180" />}
            rows={fromRows}
            tint="border-amber-100 bg-amber-50/50"
          />
        </div>
      )}
    </div>
  );
}

// Work Order Qty vs Delivered — the balance formula lives here.
// balance = workOrderTotal - deliveredTotal
// Red only when delivered > work order qty (over-delivered). Green otherwise
// (still remaining, or exactly complete).
function BalanceSummary({ workOrderTotal, deliveredTotal }) {
  if (workOrderTotal <= 0) return null;

  const balance = workOrderTotal - deliveredTotal;
  const overAmount = Math.max(0, deliveredTotal - workOrderTotal);
  const isOverDelivered = deliveredTotal > workOrderTotal;

  const rawPct = (deliveredTotal / workOrderTotal) * 100;
  const barWidth = Math.min(100, Math.max(0, rawPct));
  const statusColor = isOverDelivered ? "text-red-600" : "text-emerald-600";
  const barColor = isOverDelivered ? "bg-red-500" : "bg-emerald-500";

  return (
    <div className="mx-5 mt-4 mb-1 rounded-lg border border-neutral-200 bg-neutral-50/60 px-4 py-3.5">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[11px] text-neutral-500">Work Order Qty</div>
          <div className="text-[15px] font-semibold tabular-nums text-neutral-900 mt-0.5">
            {fmt(workOrderTotal)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-500">Delivered</div>
          <div className="text-[15px] font-semibold tabular-nums text-neutral-900 mt-0.5">
            {fmt(deliveredTotal)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-500">
            {isOverDelivered ? "Over-delivered" : "Balance"}
          </div>
          <div className={`text-[15px] font-semibold tabular-nums mt-0.5 ${statusColor}`}>
            {isOverDelivered ? `+${fmt(overAmount)}` : fmt(balance)}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <div className="mt-1 text-[11px] text-neutral-500 tabular-nums">
          {rawPct.toFixed(1)}% delivered
        </div>
      </div>
    </div>
  );
}

// jobDetails shape expected:
// {
//   jobNo: "SM-26-5060-SEP",
//   workOrderQtyByFactory: { "SHISHIRDYEING": 2710, "SMSOURCINGKNIT": 2710, "URMEEAOP": 1190, ... },
//   deliveryTotals: { "SentForAop": 1189, ... },
//   toFactoryTotals: { "SentForAop": { "URMEE AOP": 1189 }, ... },
//   fromFactoryTotals: { "SentForAop": { "SHISHIR DYEING": 1189 }, ... },
// }
const JobModal = ({ isOpen, jobDetails, loading, onClose }) => {
  const types = Object.keys(jobDetails?.deliveryTotals || {});
  const [openType, setOpenType] = useState(null);
  const grandTotal = Object.values(jobDetails?.deliveryTotals || {}).reduce((s, v) => s + v, 0);

  const hasWorkOrderQty = Object.keys(jobDetails?.workOrderQtyByFactory || {}).length > 0;
  const workOrderTotal = sumValues(jobDetails?.workOrderQtyByFactory);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-neutral-200">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-neutral-400 font-medium">Job No</div>
            <div className="text-lg font-semibold text-neutral-900 mt-0.5">
              {jobDetails?.jobNo || "—"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Balance formula: Work Order Qty vs Delivered — stays visible above the scroll area */}
        {!loading && (
          <BalanceSummary workOrderTotal={workOrderTotal} deliveredTotal={grandTotal} />
        )}

        {/* Body */}
        <div className="overflow-y-auto px-5 py-2 flex-1 min-h-[160px]">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-neutral-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading details...
            </div>
          )}

          {!loading && !hasWorkOrderQty && types.length === 0 && (
            <div className="py-16 text-center text-sm text-neutral-400">No details found.</div>
          )}

          {/* Work Order Qty by Factory — always visible, not collapsible */}
          {!loading && hasWorkOrderQty && (
            <div className="py-3 border-b border-neutral-200">
              <FactoryTable
                title="Work Order Qty by Factory"
                icon={<Factory size={13} className="text-neutral-500" />}
                rows={jobDetails.workOrderQtyByFactory}
                tint="border-neutral-200 bg-neutral-50"
              />
            </div>
          )}

          {!loading &&
            types.map((type) => (
              <DeliveryTypeRow
                key={type}
                type={type}
                qty={jobDetails.deliveryTotals[type]}
                toRows={jobDetails.toFactoryTotals?.[type]}
                fromRows={jobDetails.fromFactoryTotals?.[type]}
                isOpen={openType === type}
                onToggle={() => setOpenType(openType === type ? null : type)}
              />
            ))}
        </div>

        {/* Footer */}
        {!loading && types.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 bg-neutral-50">
            <span className="text-xs text-neutral-500">
              {types.length} delivery {types.length === 1 ? "type" : "types"}
            </span>
            <span className="text-sm font-semibold text-neutral-900 tabular-nums">
              Grand Total: {fmt(grandTotal)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobModal;