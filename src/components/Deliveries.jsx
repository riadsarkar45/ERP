import React, { useState } from "react";
import Input from "./Input";
import { Check, Loader2, X } from "lucide-react";

const formatKg = (num) => {
  if (!num && num !== 0) return "—";
  return `${Number(num).toLocaleString()} kg`;
};

// Delivery types where THIS work order's factory is the SOURCE of the
// movement (fromFactory) — i.e. it's receiving something back or returning
// something, so the goods are coming FROM elsewhere INTO this factory, or
// FROM this factory back OUT. Match is on the words "Received"/"Return"
// appearing in the type name, per business rule: receive/return types ->
// this factory goes in "From". All other (sending) types -> this factory
// goes in "To".
const isReceiveOrReturnType = (deliveryType) => {
  if (!deliveryType) return false;
  const t = deliveryType.toLowerCase();
  return t.includes("received") || t.includes("return");
};

// These delivery types are internal processing steps (compacting,
// reprocess, heat set) rather than movements to/from another factory —
// toFactory and fromFactory are not required for them.
const FACTORY_OPTIONAL_DELIVERY_TYPES = new Set([
  "Received From Compacting",
  "Received From Reprocess",
  "Received From HEAT Set",
]);

const isFactoryOptional = (deliveryType) =>
  FACTORY_OPTIONAL_DELIVERY_TYPES.has(deliveryType);

// Single source of truth for what the To/From factory fields should
// default to, given the current delivery type direction and the work
// order's factory name. Used identically for what's DISPLAYED in the
// inputs and what's SUBMITTED — so there's no way for the two to drift
// apart, and no effect/timing dance needed to keep them in sync.
const getDefaultFactories = (isReturnOrReceive, factoryName) => ({
  toFactory: !isReturnOrReceive ? (factoryName || "") : "",
  fromFactory: isReturnOrReceive ? (factoryName || "") : "",
});

const flattenDeliveries = (workOrders) => {
  return (workOrders || []).flatMap((wo) =>
    (wo.compositions || []).map((comp) => {
      const styleReq = comp.styleRequirementRow?.styleRequirement || {};
      return {
        id: `${wo.id}-${comp.id}`,
        yarnId: comp.id,
        workOrderId: wo.id,
        orderType: wo.orderType,
        factoryName: wo.factoryName,
        composition: comp.composition || "—",
        color: comp.color || "—",
        workOrderQty: comp.workOrderQty || 0,
        deliveries: comp.deliveries || [],
        // buyerName/processLoss follow the same fallback pattern Modal.jsx
        // already uses successfully for jobNo: try the deeply nested path
        // first (styleRequirementRow -> styleRequirement), then fall back
        // to a flatter field directly on the composition or its row, in
        // case that's actually where the API puts it for this record.
        buyerName: styleReq.buyerName || comp.buyerName || comp.styleRequirementRow?.buyerName,
        jobNo: styleReq.jobNo || comp.jobNo,
        processLoss: styleReq.processLoss ?? comp.processLoss ?? comp.styleRequirementRow?.processLoss,
      };
    })
  );
};

const DeliveryRowInputs = ({
  row,
  group,
  rowChangedField,
  isReturnOrReceive,
  orderType,
  deliveryTypes,
  handleEditOnChange,
  handleRemove,
}) => {
  const defaults = getDefaultFactories(isReturnOrReceive, group.factoryName);

  // Displayed value: whatever the user has typed (rowChangedField), or the
  // computed default if they haven't touched the field yet. No state
  // writes happen just from rendering — only real user input calls
  // handleEditOnChange.
  const toFactoryValue = rowChangedField.toFactory ?? defaults.toFactory;
  const fromFactoryValue = rowChangedField.fromFactory ?? defaults.fromFactory;

  const factoryOptional = isFactoryOptional(rowChangedField.deliveryType);

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-wider text-gray-400">Qty</span>
        <input
          onChange={(e) => handleEditOnChange(row.yarnId, e)}
          name="deliveryQty"
          value={rowChangedField.deliveryQty ?? ""}
          className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
          type="text"
          placeholder="Qty"
        />
      </div>

      {((rowChangedField.deliveryType === "Grey Received" && (orderType === "dyeingOrder" || orderType === "aopOrder")) || rowChangedField.deliveryType === "Received From Aop") && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-wider text-gray-400">Finish Qty</span>
          <input
            onChange={(e) => handleEditOnChange(row.yarnId, e)}
            name="finishReceivedQty"
            value={rowChangedField.finishReceivedQty ?? ""}
            className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
            type="text"
            placeholder="Finish Qty"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-wider text-gray-400">Challan</span>
        <input
          onChange={(e) => handleEditOnChange(row.yarnId, e)}
          name="challanNo"
          value={rowChangedField.challanNo ?? ""}
          className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
          type="text"
          placeholder="Challan No"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-wider text-gray-400">Date</span>
        <input
          onChange={(e) => handleEditOnChange(row.yarnId, e)}
          name="date"
          value={rowChangedField.date ?? new Date().toISOString().split("T")[0]}
          className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
          type="date"
        />
      </div>

      {/* Receive/return types -> this factory is the SOURCE, so it belongs
          in "From". Sending types -> it's the DESTINATION, so it belongs
          in "To". Value is user input if present, else the computed
          default — same computation used at submit time in
          handleGlobalSubmit, so display and payload can never disagree.
          When the delivery type is one of the factory-optional internal
          process types, the labels are dimmed and marked "(optional)" so
          the UI doesn't imply these are required — matching the relaxed
          validation in handleGlobalSubmit. */}
      <div className="flex flex-col gap-1">
        <span className={`text-[9px] uppercase tracking-wider ${factoryOptional ? "text-gray-300" : "text-gray-400"}`}>
          {orderType === "aopOrder" && "Aop Factory"}
          {orderType === "dyeingOrder" && "Dyeing Factory"}
          {orderType === "knittingOrder" && "Knitting Factory"}
          {factoryOptional && " (optional)"}
        </span>
        <input
          onChange={(e) => handleEditOnChange(row.yarnId, e)}
          name="toFactory"
          value={toFactoryValue}
          className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
          type="text"
          placeholder="To Factory"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className={`text-[9px] uppercase tracking-wider ${factoryOptional ? "text-gray-300" : "text-gray-400"}`}>
          From{factoryOptional && " (optional)"}
        </span>
        <input
          onChange={(e) => handleEditOnChange(row.yarnId, e)}
          name="fromFactory"
          value={fromFactoryValue}
          className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
          type="text"
          placeholder="From Factory"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[9px] uppercase tracking-wider text-gray-400">Type</span>
        <Input
          className="w-full"
          onChange={(e) => handleEditOnChange(row.yarnId, e)}
          name="deliveryType"
          type="select"
          value={rowChangedField.deliveryType ?? ""}
          options={deliveryTypes}
          required
        />
      </div>

      <div className="flex gap-2 items-center pb-0.5">
        <span onClick={() => handleRemove(row.id, row.yarnId)} className="cursor-pointer bg-red-500 bg-opacity-15 text-red-600 p-2 rounded-lg">
          <X className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
};

const Deliveries = ({ deliveries, deliveryIssue, challanIssue, orderType, changedField, handleEditOnChange, handleSubmit, isLoading }) => {
  const [openYarnIds, setOpenYarnIds] = useState(new Set());

  const baseRows = flattenDeliveries(deliveries);
  const styleReq = baseRows.find((r) => r.buyerName || r.processLoss) || {};
  const totalWorkOrderQty = baseRows.reduce((sum, r) => sum + (r.workOrderQty || 0), 0);

  const [removedIds, setRemovedIds] = useState(new Set());
  const visibleRows = baseRows.filter((r) => !removedIds.has(r.id));

  const groupedRows = visibleRows.reduce((groups, row) => {
    const key = row.workOrderId;
    if (!groups[key]) {
      groups[key] = { workOrderId: row.workOrderId, factoryName: row.factoryName, jobNo: row.jobNo, rows: [] };
    }
    groups[key].rows.push(row);
    return groups;
  }, {});
  const groupList = Object.values(groupedRows);

  const handleRemove = (id, yarnId) => {
    setRemovedIds((prev) => new Set([...prev, id]));
    setOpenYarnIds((prev) => {
      const next = new Set(prev);
      next.delete(yarnId);
      return next;
    });
  };

  const deliveryTypes = [];
  if (orderType === "knittingOrder") deliveryTypes.push("Yarn Delivery", "Yarn Return", "Grey Fabric Received");
  if (orderType === "dyeingOrder") deliveryTypes.push("Grey Delivery", "Grey Received", "Grey Return", "Received From Compacting", "Received From Reprocess", "Received From HEAT Set", "Received From Trumble");
  if (orderType === "aopOrder") deliveryTypes.push("Sent For Aop", "Return From Aop", "Received From Aop");
  if (orderType === "yarnDyeingOrder") deliveryTypes.push("Yarn Delivery For Yarn Dye", "Yarn Return From Yarn Dye", "Yarn Received From Yarn Dye", "Finish Received", "Finish Return");

  const aggregateDeliveries = (deliveriesArr) => {
    const map = {};
    for (const d of deliveriesArr) {
      if (!map[d.deliveryType]) map[d.deliveryType] = 0;
      map[d.deliveryType] += Number(d.deliveryQty || 0);
    }
    return map;
  };

  const handleShowDeliveryInputs = (yarnId) => {
    setOpenYarnIds((prev) => {
      const next = new Set(prev);
      if (next.has(yarnId)) next.delete(yarnId);
      else next.add(yarnId);
      return next;
    });
  };

  const handleGlobalSubmit = async () => {
    const rowsToSubmit = visibleRows.filter((r) => openYarnIds.has(r.yarnId));

    for (const row of rowsToSubmit) {
      const rowChangedField = changedField?.[row.yarnId] || {};
      const group = groupedRows[row.workOrderId];

      if (!rowChangedField.deliveryType) {
        alert(`Please select a Delivery Type for ${row.composition}`);
        return;
      }
      if (!rowChangedField.deliveryQty || Number(rowChangedField.deliveryQty) <= 0) {
        alert(`Please enter a valid Quantity for ${row.composition}`);
        return;
      }

      const parsedQty = Number(rowChangedField.deliveryQty);
      const parsedFinishQty = rowChangedField.finishReceivedQty ? Number(rowChangedField.finishReceivedQty) : 0;

      let finalDeliveries = [];
      if (rowChangedField.deliveries && rowChangedField.deliveries.length > 0) {
        finalDeliveries = rowChangedField.deliveries.map(d => ({
          deliveryType: d.deliveryType,
          qty: d.qty ? Number(d.qty) : 0
        }));
      } else {
        finalDeliveries = [
          { deliveryType: rowChangedField.deliveryType, qty: parsedQty },
          ...(parsedFinishQty > 0 ? [{
            deliveryType: rowChangedField.deliveryType === "Aop Grey Received" ? "Finish Received From Aop" : "Finish Received",
            qty: parsedFinishQty
          }] : [])
        ];
      }

      // Same computation as getDefaultFactories/DeliveryRowInputs — kept as
      // one function so display and submit can never disagree.
      const isReturnOrReceive = isReceiveOrReturnType(rowChangedField.deliveryType);
      const groupFactoryName = group?.factoryName || row.factoryName || "";
      const defaults = getDefaultFactories(isReturnOrReceive, groupFactoryName);

      const fullPayload = {
        ...rowChangedField,
        toFactory: rowChangedField.toFactory ?? defaults.toFactory,
        fromFactory: rowChangedField.fromFactory ?? defaults.fromFactory,
        date: rowChangedField.date || new Date().toISOString().split("T")[0],
        challanNo: rowChangedField.challanNo || "",
        deliveryType: rowChangedField.deliveryType,
        deliveryQty: parsedQty,
        finishReceivedQty: parsedFinishQty,
        deliveries: finalDeliveries
      };

      // Compacting/Reprocess/HEAT Set are internal process steps, not
      // factory-to-factory movements — skip the required-field checks
      // below for these types. The fields are still sent (possibly as
      // empty strings from `defaults`), just no longer block submit.
      const factoryOptional = isFactoryOptional(rowChangedField.deliveryType);

      if (!factoryOptional && !fullPayload.toFactory) {
        alert(
          !groupFactoryName
            ? `This work order has no factory name on record, so "To Factory" couldn't be auto-filled for ${row.composition}. Please type it in manually, or fix the factory name on the work order.`
            : `Please enter a To Factory for ${row.composition}`
        );
        return;
      }
      if (!factoryOptional && !fullPayload.fromFactory) {
        alert(
          !groupFactoryName
            ? `This work order has no factory name on record, so "From Factory" couldn't be auto-filled for ${row.composition}. Please type it in manually, or fix the factory name on the work order.`
            : `Please enter a From Factory for ${row.composition}`
        );
        return;
      }

      await handleSubmit(row.yarnId, row.workOrderId, fullPayload);
    }
  };

  return (
    <div className="flex flex-col border border-gray-200 rounded-xl bg-white text-sm">

      {/* Info Strip */}
      <div className="grid grid-cols-3 border-b border-gray-100">
        {[
          { label: "Buyer", value: styleReq?.buyerName || "—", accent: true },
          { label: "Work Order Qty", value: formatKg(totalWorkOrderQty) },
          { label: "Process Loss", pill: `${styleReq?.processLoss || 0}%` },
        ].map((c, i) => (
          <div key={i} className={`px-4 py-3 ${i < 3 ? "border-r border-gray-100" : ""}`}>
            <span className="block mb-1 text-[9px] font-semibold tracking-wider uppercase text-gray-400">{c.label}</span>
            {c.pill ? (
              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                ⚠ {c.pill}
              </span>
            ) : (
              <span className={`font-semibold text-sm ${c.accent ? "text-indigo-500" : "text-slate-800"}`}>{c.value}</span>
            )}
          </div>
        ))}
      </div>

      {challanIssue?.length > 0 && (
        challanIssue.map((issue, index) => (
          <div key={index} className="bg-green-100 border border-green-500 text-green-700 p-4 rounded-md mb-3 mt-2 flex items-center gap-3">
            <Check className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">{issue.title || "Success"}</h2>
              <p>{issue.message}</p>
            </div>
          </div>
        ))
      )}

      {(deliveryIssue?.deliveries?.length > 0 || (Array.isArray(deliveryIssue) && deliveryIssue.length > 0)) && (
        (deliveryIssue.deliveries || deliveryIssue).map((issue, index) => (
          <div key={index} className={`${issue.type === "error" ? "bg-red-100 border border-red-500 text-red-700" : "bg-amber-100 border border-amber-500 text-amber-700"} p-4 rounded-md mb-3 mt-2 flex items-center gap-3`}>
            <X className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">{issue.title || "Error"}</h2>
              <p>{issue.message}</p>
            </div>
          </div>
        ))
      )}

      <div className="overflow-y-auto max-h-[32rem] divide-y divide-gray-100">
        {groupList.length === 0 ? (
          <div className="py-10 text-center text-[11px] tracking-widest uppercase text-gray-300">No compositions found</div>
        ) : (
          groupList.map((group) => (
            <div key={group.workOrderId}>
              {groupList.length > 1 && (
                <div className="px-5 pt-3 pb-1 flex items-center gap-2 bg-gray-50">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                    {group.factoryName || `Job No #${group.jobNo}`}
                  </span>
                </div>
              )}

              {group.rows.map((row) => {
                const aggregated = aggregateDeliveries(row.deliveries);

                let totalDelivery = 0;
                let totalReturn = 0;
                Object.entries(aggregated).forEach(([type, qty]) => {
                  const lowerType = type.toLowerCase();
                  if (lowerType.includes("return")) totalReturn += Number(qty);
                  else if (lowerType.includes("delivery") || lowerType.includes("sent")) totalDelivery += Number(qty);
                });
                const remainingDelivery = (Number(row.workOrderQty) || 0) + totalReturn - totalDelivery;

                const isOpen = openYarnIds.has(row.yarnId);
                const rowChangedField = changedField?.[row.yarnId] || {};
                const isReturnOrReceive = isReceiveOrReturnType(rowChangedField.deliveryType);

                return (
                  <div key={row.id} className={`${isOpen && "bg-green-300 bg-opacity-30 p-2"} flex flex-col px-5 py-4 gap-3`}>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        onClick={() => handleShowDeliveryInputs(row.yarnId)}
                        className="inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 cursor-pointer"
                      >
                        {row.composition}
                      </span>
                      <span
                        className="inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 cursor-pointer"
                      >
                        {row.color}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {row.workOrderQty > 0 ? formatKg(row.workOrderQty) : "No Qty"} work order qty
                      </span>

                      {row.workOrderQty > 0 && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${remainingDelivery > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          remainingDelivery < 0 ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-green-50 text-green-600 border-green-200'
                          }`}>
                          {formatKg(Math.abs(remainingDelivery))} {remainingDelivery > 0 ? 'remaining' : remainingDelivery < 0 ? 'excess' : 'fulfilled'}
                        </span>
                      )}



                      {!group.factoryName && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">
                          ⚠ No factory set on this work order
                        </span>
                      )}
                    </div>

                    {Object.keys(aggregated).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(aggregated).map(([type, qty]) => (
                          <div key={type} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{type}</span>
                            <span className="text-[11px] font-bold text-slate-700">{formatKg(qty)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {isOpen && (
                      <DeliveryRowInputs
                        row={row}
                        group={group}
                        rowChangedField={rowChangedField}
                        isReturnOrReceive={isReturnOrReceive}
                        orderType={orderType}
                        deliveryTypes={deliveryTypes}
                        handleEditOnChange={handleEditOnChange}
                        handleRemove={handleRemove}
                      />
                    )}

                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {openYarnIds.size > 0 && (
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <span className="text-[11px] text-gray-400">
            {openYarnIds.size} composition{openYarnIds.size > 1 ? "s" : ""} ready to submit
          </span>
          <button
            onClick={handleGlobalSubmit}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isLoading
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-green-500 bg-opacity-15 text-green-600 hover:bg-opacity-25 cursor-pointer"
              }`}
          >
            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
            Submit All
          </button>
        </div>
      )}
    </div>
  );
};

export default Deliveries;