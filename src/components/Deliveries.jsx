import React, { useState } from "react";
import Input from "./Input";
import { Check, Loader2, X } from "lucide-react";

const formatKg = (num) => {
  if (!num && num !== 0) return "—";
  return `${Number(num).toLocaleString()} kg`;
};

// Delivery types that mean "we are receiving into this factory" — for these,
// the factory name defaults into the FROM field instead of the TO field.
const RECEIVE_DELIVERY_TYPES = ["Received from AOP", "Grey Received", "Aop Grey Received"];

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
        workOrderQty: comp.workOrderQty || 0,
        deliveries: comp.deliveries || [],
        buyerName: styleReq.buyerName,
        jobNo: styleReq.jobNo,
        processLoss: styleReq.processLoss,
      };
    })
  );
};

const Deliveries = ({ deliveries, deliveryIssue, challanIssue, orderType, changedField, handleEditOnChange, handleSubmit, isLoading }) => {
  const [openYarnIds, setOpenYarnIds] = useState(new Set());

  // Flatten work orders -> compositions into rows
  const baseRows = flattenDeliveries(deliveries);

  // Info strip pulls from the first row that actually has style requirement data
  const styleReq = baseRows.find((r) => r.buyerName || r.processLoss) || {};
  const totalWorkOrderQty = baseRows.reduce((sum, r) => sum + (r.workOrderQty || 0), 0);

  const [removedIds, setRemovedIds] = useState(new Set());
  const visibleRows = baseRows.filter((r) => !removedIds.has(r.id));

  // Group visible rows by their parent work order / factory for display
  const groupedRows = visibleRows.reduce((groups, row) => {
    const key = row.workOrderId;
    if (!groups[key]) {
      groups[key] = { workOrderId: row.workOrderId, factoryName: row.factoryName, rows: [] };
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
  if (orderType === "dyeingOrder") deliveryTypes.push("Grey Delivery", "Grey Return", "Grey Received", "Sent For Compacting", "Received From Compacting");
  if (orderType === "aopOrder") deliveryTypes.push("Sent For Aop", "Received From Aop", "AOP Finish Fabric Rcvd", "Return From Aop");
  if (orderType === "yarnDyeingOrder") deliveryTypes.push("Yarn Delivery For Yarn Dye", "Yarn Return From Yarn Dye", "Yarn Received From Yarn Dye", "Finish Received", "Finish Return");

  // Aggregate deliveries by type for a composition
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
      if (next.has(yarnId)) {
        next.delete(yarnId);
      } else {
        next.add(yarnId);
      }
      return next;
    });
  };



  const handleGlobalSubmit = async () => {
    const rowsToSubmit = visibleRows.filter((r) => openYarnIds.has(r.yarnId));

    for (const row of rowsToSubmit) {
      const rowChangedField = changedField?.[row.yarnId] || {};
      const isReceiveType = RECEIVE_DELIVERY_TYPES.includes(rowChangedField.deliveryType);

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

      // 📦 3. SANITIZE THE DELIVERIES ARRAY
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

      // Construct full payload with fallbacks to default values
      const fullPayload = {
        ...rowChangedField,
        toFactory: rowChangedField.toFactory !== undefined ? rowChangedField.toFactory : (!isReceiveType ? row.factoryName : ""),
        fromFactory: rowChangedField.fromFactory !== undefined ? rowChangedField.fromFactory : (isReceiveType ? row.factoryName : ""),
        date: rowChangedField.date || new Date().toISOString().split("T")[0],
        challanNo: rowChangedField.challanNo || "",
        deliveryType: rowChangedField.deliveryType,
        deliveryQty: parsedQty,
        finishReceivedQty: parsedFinishQty,
        deliveries: finalDeliveries
      };

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

      {/* ✅ SUCCESS MESSAGES (Stored in challanIssue) */}
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

      {/* ✅ ERROR MESSAGES (Stored in deliveryIssue) */}
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

      {/* Rows, grouped by the work order / factory they came from */}
      <div className="overflow-y-auto max-h-[32rem] divide-y divide-gray-100">
        {groupList.length === 0 ? (
          <div className="py-10 text-center text-[11px] tracking-widest uppercase text-gray-300">No compositions found</div>
        ) : (
          groupList.map((group) => (
            <div key={group.workOrderId}>
              {/* Factory / work order header */}
              {groupList.length > 1 && (
                <div className="px-5 pt-3 pb-1 flex items-center gap-2 bg-gray-50">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                    {group.factoryName || `Work Order #${group.workOrderId}`}
                  </span>
                </div>
              )}

              {group.rows.map((row) => {
                const aggregated = aggregateDeliveries(row.deliveries);

                // 🧮 CALCULATE REMAINING DELIVERY (workOrderQty + return - delivery qty)
                let totalDelivery = 0;
                let totalReturn = 0;
                Object.entries(aggregated).forEach(([type, qty]) => {
                  const lowerType = type.toLowerCase();
                  if (lowerType.includes("return")) {
                    totalReturn += Number(qty);
                  } else if (lowerType.includes("delivery") || lowerType.includes("sent")) {
                    totalDelivery += Number(qty);
                  }
                });
                const remainingDelivery = (Number(row.workOrderQty) || 0) + totalReturn - totalDelivery;

                const isOpen = openYarnIds.has(row.yarnId);
                const rowChangedField = changedField?.[row.yarnId] || {};
                const isReceiveType = RECEIVE_DELIVERY_TYPES.includes(rowChangedField.deliveryType);

                return (
                  <div key={row.id} className={`${isOpen && "bg-green-300 bg-opacity-30 p-2"} flex flex-col px-5 py-4 gap-3`}>

                    {/* Composition label + work order qty + remaining badge */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        onClick={() => handleShowDeliveryInputs(row.yarnId)}
                        className="inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 cursor-pointer"
                      >
                        {row.composition}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatKg(row.workOrderQty)} work order qty</span>

                      {/* ✅ REMAINING DELIVERY BADGE */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${remainingDelivery > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          remainingDelivery < 0 ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-green-50 text-green-600 border-green-200'
                        }`}>
                        {formatKg(Math.abs(remainingDelivery))} {remainingDelivery > 0 ? 'remaining' : remainingDelivery < 0 ? 'excess' : 'fulfilled'}
                      </span>


                    </div>

                    {/* Aggregated delivery summary */}
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

                    {/* Single input row per composition */}
                    {isOpen && (
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider text-gray-400">Qty</span>
                          <input
                            onChange={(e) => handleEditOnChange(row.yarnId, e)}
                            name="deliveryQty"
                            className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
                            type="text"
                            placeholder="Qty"
                          />
                        </div>

                        {(
                          (
                            ["Grey Received", "Grey Fabric Received"].includes(rowChangedField.deliveryType) &&
                            ["dyeingOrder", "aopOrder"].includes(orderType)
                          ) ||
                          rowChangedField.deliveryType === "Aop Grey Received"
                        ) && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] uppercase tracking-wider text-gray-400">
                                Finish Qty
                              </span>
                              <input
                                onChange={(e) => handleEditOnChange(row.yarnId, e)}
                                name="finishReceivedQty"
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
                            className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
                            type="date"
                            defaultValue={new Date().toISOString().split("T")[0]}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider text-gray-400">
                            {orderType === "aopOrder" && "Aop Factory"}
                            {orderType === "dyeingOrder" && "Dyeing Factory"}
                            {orderType === "knittingOrder" && "Knitting Factory"}
                          </span>
                          <input
                            key={`to-${row.yarnId}-${isReceiveType}`}
                            onChange={(e) => handleEditOnChange(row.yarnId, e)}
                            name="toFactory"
                            className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
                            type="text"
                            defaultValue={!isReceiveType ? group.factoryName : ""}
                            placeholder="To Factory"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider text-gray-400">From</span>
                          <input
                            key={`from-${row.yarnId}-${isReceiveType}`}
                            onChange={(e) => handleEditOnChange(row.yarnId, e)}
                            name="fromFactory"
                            className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs"
                            type="text"
                            defaultValue={isReceiveType ? group.factoryName : ""}
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
                    )}

                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Single global submit button */}
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