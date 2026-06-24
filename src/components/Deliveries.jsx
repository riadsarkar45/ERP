import React, { useState } from "react";
import Input from "./Input";
import { Check, Loader2, X } from "lucide-react";

const formatKg = (num) => {
  if (!num && num !== 0) return "—";
  return `${Number(num).toLocaleString()} kg`;
};

const Deliveries = ({ deliveries, orderType, changedField, handleEditOnChange, handleSubmit, isLoading }) => {
  const list = deliveries?.data || [];
  const styleReq = deliveries?.data?.[0]?.styleRequirement;
  const allCompositions = list.flatMap(item => item.compositions || []);
  const totalOrderQty = deliveries?.data?.[0]?.styleRequirement?.rows?.reduce((sum, r) => sum + (r.orderQty || 0), 0) || 0;
  console.log(changedField, "changedField");
  const baseRows = list.flatMap((item, i) =>
    (item.compositions || []).map((comp, j) => ({
      id: `${item.jobNo}-${i}-${j}`,
      yarnId: comp.id,
      jobNo: item.jobNo || "—",
      composition: comp.composition || "—",
      color: comp.color || "—",
      type: comp.deliveryType,
      qty: Number(comp.workOrderQty || 0),
    }))
  );

  const [removedIds, setRemovedIds] = useState(new Set());

  const visibleRows = baseRows.filter(r => !removedIds.has(r.id));

  const handleRemove = (id) => {
    setRemovedIds(prev => new Set([...prev, id]));
  };

  const totalWorkOrderQty = list.reduce((sum, job) => {
    return sum + job.compositions.reduce((s, c) => s + (c.workOrderQty || 0), 0);
  }, 0);

  const deliveryTypes = [];

  if (orderType === "knittingOrder") {
    deliveryTypes.push("Yarn Delivery", "Yarn Return", "Yarn Received");
  }
  if (orderType === "dyeingOrder") {
    deliveryTypes.push("Grey Received", "Grey Delivery", "Grey Return Received", "Grey Received From Dyeing", "Finish Fabric Received", "Sent For Compacting", "Received From Compacting");
  }
  if (orderType === "aopOrder") {
    deliveryTypes.push("Sent for AOP", "Received from AOP", "Sent for Compacting", "Received From Compacting");
  }
  if (orderType === "yarnDyeingOrder") {
    deliveryTypes.push("Yarn Delivery For Yarn Dye", "Yarn Return From Yarn Dye", "Yarn Received From Yarn Dye", "Finish Recived", "Finish Return");
  }

  return (
    <div className="flex flex-col border border-gray-200 rounded-xl bg-white text-sm">

      {/* ── Info Strip ── */}
      <div className="grid grid-cols-5 border-b border-gray-100">
        {[
          { label: "Buyer", value: styleReq?.buyerName || "—", accent: true },
          { label: "Compositions", value: allCompositions?.length || "—", small: true },
          { label: "Order Qty", value: formatKg(totalOrderQty) },
          { label: "Work Order Qty", value: formatKg(totalWorkOrderQty) },
          { label: "Process Loss", pill: `${styleReq?.processLoss || 0}%` },
        ].map((c, i) => (
          <div key={i} className={`px-4 py-3 ${i < 4 ? "border-r border-gray-100" : ""}`}>
            <span className="block mb-1 text-[9px] font-semibold tracking-wider uppercase text-gray-400">
              {c.label}
            </span>
            {c.pill ? (
              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                ⚠ {c.pill}
              </span>
            ) : (
              <span className={`font-semibold ${c.small ? "text-xs" : "text-sm"} ${c.accent ? "text-indigo-500" : "text-slate-800"}`}>
                {c.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Section Header ── */}
      <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
        <span className="text-[9px] font-semibold tracking-wider uppercase text-gray-400">Delivery History</span>
        <span className="text-[9px] font-semibold tracking-wider uppercase text-gray-400">{visibleRows.length} entries</span>
      </div>

      {/* ── Column Headers ── */}
      <div className="grid grid-cols-9 px-5 py-2 bg-gray-50 border-b border-gray-100">
        {["Composition", "Color", "Work Order Qty (kg)", "Delivery Qty", "Challan", "Date", "To", "From", "Status"].map((h) => (
          <span key={h} className="text-[9px] font-semibold tracking-wider uppercase text-gray-400">{h}</span>
        ))}
      </div>

      {/* ── Scrollable Rows ── */}
      <div className="overflow-y-auto max-h-64 divide-y divide-gray-50">
        {visibleRows.length === 0 ? (
          <div className="py-10 text-center text-[11px] tracking-widest uppercase text-gray-300">
            No deliveries recorded
          </div>
        ) : (
          visibleRows.map((row) => (
            <div key={row.id} className="grid grid-cols-9 px-5 py-3 hover:bg-slate-50 transition-colors items-center">

              <span className="inline-flex w-fit items-center text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800">
                {row.composition}
              </span>

              <span className="inline-flex w-fit items-center text-[10px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800">
                {row.color}
              </span>

              <span className="text-xs font-semibold text-slate-700">{formatKg(row.qty)}</span>

              <span>
                <input
                  onChange={handleEditOnChange}
                  name={changedField.deliveryType === "Grey Received" ? "greyReceivedQty" : "yarnDelivery"}
                  className="outline-none border p-2 rounded-md w-[6rem]"
                  type="text"
                  placeholder={changedField.deliveryType === "Grey Received" ? "Grey Received Qty" : "Yarn Delivery Qty"}
                />
              </span>
              {
                changedField.deliveryType === "Grey Received" && (
                  <span>
                    <input
                      onChange={handleEditOnChange}
                      name="finishReceivedQty"
                      className="outline-none border p-2 rounded-md w-[6rem]"
                      type="text"
                      placeholder={changedField.deliveryType === "Grey Received" ? "greyReceivedQty" : "yarnDelivery"}
                    />
                  </span>
                )
              }
              <span><input onChange={handleEditOnChange} name="challanNo" className="outline-none border p-2 rounded-md w-[6rem]" type="text" placeholder="Challan No" /></span>
              <span><input onChange={handleEditOnChange} name="date" className="outline-none border p-2 rounded-md w-[6rem]" type="date" defaultValue={new Date().toISOString().split("T")[0]} required /></span>
              <span><input onChange={handleEditOnChange} name="toFactory" className="outline-none border p-2 rounded-md w-[6rem]" type="text" placeholder="To Factory" /></span>
              <span><input onChange={handleEditOnChange} name="fromFactory" className="outline-none border p-2 rounded-md w-[6rem]" type="text" placeholder="From Factory" /></span>
              <div className="flex gap-2 items-end">
                <Input onChange={handleEditOnChange} name="deliveryType" type="select" options={deliveryTypes} required />
                <div onClick={() => handleSubmit(row.yarnId)} className="cursor-pointer bg-green-500 bg-opacity-15 border-green-500 text-green-600 p-2 rounded-lg">
                  {isLoading ? <span className="animate-spin">< Loader2 /> </span> : <Check />}
                </div>
                <span onClick={() => handleRemove(row.id)} className="cursor-pointer bg-red-500 bg-opacity-15 border-red-500 text-red-600 p-2 rounded-lg"><X /></span>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default Deliveries;