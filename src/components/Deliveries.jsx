import React, { useState } from "react";
import Input from "./Input";
import { Check, Loader2, X } from "lucide-react";
import useAxiosPublic from "../hooks/Axios";

const formatKg = (num) => {
  if (!num && num !== 0) return "—";
  return `${Number(num).toLocaleString()} kg`;
};

const Deliveries = ({ deliveries, orderType, duplicateChallan, changedField, handleEditOnChange, handleSubmit, isLoading }) => {
  const [yarnId, setYarnId] = useState()
  const [seeDetail, setSeeDetail] = useState(false)
  const [isDeleted, setIsDeleted] = useState({ isDeleted: false, deletedData: {}, isDeleting: false, isDeletingId: "" })
  const list = deliveries || [];
  const styleReq = list[0]?.workOrder?.styleRequirement;
  const totalOrderQty = list.reduce((sum, c) => sum + (c.orderQty || 0), 0);
  const totalWorkOrderQty = list.reduce((sum, c) => sum + (c.workOrderQty || 0), 0);
  const axiosPublic = useAxiosPublic();
  const baseRows = list.map((comp, i) => ({
    id: `${i}`,
    yarnId: comp.id,
    composition: comp.composition || "—",
    workOrderQty: comp.workOrderQty || 0,
    workOrderId: comp.workOrderId || 0,
    deliveries: comp.deliveries || [],
  }));

  const [removedIds, setRemovedIds] = useState(new Set());
  const visibleRows = baseRows.filter(r => !removedIds.has(r.id));
  const handleRemove = (id) => setRemovedIds(prev => new Set([...prev, id]));

  const deliveryTypes = [];
  if (orderType === "knittingOrder") deliveryTypes.push("Yarn Delivery", "Yarn Return", "Yarn Received");
  if (orderType === "dyeingOrder") deliveryTypes.push("Grey Received", "Grey Delivery", "Grey Return Received", "Grey Received From Dyeing", "Finish Fabric Received", "Sent For Compacting", "Received From Compacting");
  if (orderType === "aopOrder") deliveryTypes.push("Sent for AOP", "Received from AOP", "Sent for Compacting", "Received From Compacting");
  if (orderType === "yarnDyeingOrder") deliveryTypes.push("Yarn Delivery For Yarn Dye", "Yarn Return From Yarn Dye", "Yarn Received From Yarn Dye", "Finish Recived", "Finish Return");

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
    setYarnId(yarnId)
  }

  const handleSeeDetails = () => {
    setSeeDetail(prev => !prev)
  }

  const handleDeleteDeliveryChallan = async (deliveryId) => {
    console.log(deliveryId, "deliveryId");
    setIsDeleted({ isDeleting: true, isDeletingId: deliveryId })
    const deleteDeliveryChallan = await axiosPublic.delete(`/api/delete-delivery/${deliveryId}`)
    setSeeDetail(false)
    console.log(deleteDeliveryChallan.data.deletedRecord, "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    if (deleteDeliveryChallan.data.type === "success") {
      setIsDeleted({ isDeleted: true, isDeleting:false, deletedData: deleteDeliveryChallan.data.deletedRecord })
      // setIsDeleted({ isDeleting: false })

    }
  }

  return (
    <div className="flex flex-col border border-gray-200 rounded-xl bg-white text-sm">

      {/* Info Strip */}
      <div className="grid grid-cols-4 border-b border-gray-100">
        {[
          { label: "Buyer", value: styleReq?.buyerName || "—", accent: true },
          { label: "Order Qty", value: formatKg(totalOrderQty) },
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

      {duplicateChallan?.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 overflow-hidden">
          <button
            onClick={() => handleSeeDetails()}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"

          >

            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {duplicateChallan.length} Duplicate Challan{duplicateChallan.length > 1 ? "s" : ""} Found
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${seeDetail ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {seeDetail && (
            <div className="border-t border-amber-200 divide-y divide-amber-200">
              {duplicateChallan.map((devs, i) => (
                <div
                  key={i}
                  className="px-4 py-2 flex items-center justify-between text-sm bg-white"
                >
                  <span className="font-semibold text-gray-800">
                    #{devs.challanNo}
                  </span>
                  <span className="text-blue-500 w-[10rem] bg-blue-500 bg-opacity-20 rounded-md flex justify-center p-2 ">{devs.deliveryType}</span>
                  <span className="text-blue-500 w-[25rem] bg-blue-500 bg-opacity-20 rounded-md flex justify-center p-2 ">{devs.composition?.composition}</span>
                  <span className="font-medium text-gray-900">
                    Qty: <span className="text-blue-600">{devs.deliveryQty}</span>
                  </span>
                  <span className="font-medium text-gray-900">
                    <span onClick={() => handleDeleteDeliveryChallan(devs.id)} className="bg-red-500 bg-opacity-15 border-red-500 p-2 rounded-md text-red-600">
                      {
                        isDeleted.isDeleting && devs.id === isDeleted.isDeletingId ?
                          <span className="animate-spin"><Loader2 /></span>
                          : <span>Delete</span>
                      }
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {
        isDeleted.isDeleted && (
          <div className="bg-red-500 bg-opacity-25 border-red-600 text-red-600 p-3 mt-5 rounded-lg">
            <h2>Deleted Data</h2>
            <div className="flex gap-7 text-lg">
              <span>
                {
                  isDeleted.deletedData.challanNo
                }
              </span>
              <span>
                {
                  isDeleted.deletedData.deliveryQty
                }
              </span>
              <span>
                {
                  isDeleted.deletedData.deliveryType
                }
              </span>
            </div>
          </div>
        )
      }

      {/* Rows */}
      <div className="overflow-y-auto max-h-[32rem] divide-y divide-gray-100">
        {visibleRows.length === 0 ? (
          <div className="py-10 text-center text-[11px] tracking-widest uppercase text-gray-300">No compositions found</div>
        ) : (
          visibleRows.map((row) => {
            const aggregated = aggregateDeliveries(row.deliveries);
            return (
              // "flex flex-col px-5 py-4 gap-3"
              <div key={row.id} className={`${yarnId === row.yarnId && "bg-green-300 bg-opacity-30 p-2"} flex flex-col px-5 py-4 gap-3`}>

                {/* Composition label + work order qty */}
                <div className="flex items-center gap-3">
                  <span onClick={() => handleShowDeliveryInputs(row.yarnId)} className="inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800">
                    {row.composition}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatKg(row.workOrderQty)} work order qty</span>
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
                {
                  yarnId === row.yarnId && (
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400">Qty</span>
                        <input onChange={handleEditOnChange} name="deliveryQty" className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs" type="text" placeholder="Qty" />
                      </div>

                      {changedField?.deliveryType === "Grey Received" && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider text-gray-400">Finish Qty</span>
                          <input onChange={handleEditOnChange} name="finishReceivedQty" className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs" type="text" placeholder="Finish Qty" />
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400">Challan</span>
                        <input onChange={handleEditOnChange} name="challanNo" className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs" type="text" placeholder="Challan No" />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400">Date</span>
                        <input onChange={handleEditOnChange} name="date" className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400">To</span>
                        <input onChange={handleEditOnChange} name="toFactory" className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs" type="text" placeholder="To Factory" />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400">From</span>
                        <input onChange={handleEditOnChange} name="fromFactory" className="outline-none border border-gray-200 p-3 rounded-md w-[10rem] text-xs" type="text" placeholder="From Factory" />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400">Type</span>
                        <Input className="w-full" onChange={handleEditOnChange} name="deliveryType" type="select" options={deliveryTypes} required />
                      </div>

                      <div className="flex gap-2 items-center pb-0.5">
                        <div onClick={() => handleSubmit(row.yarnId, row.workOrderId)} className="cursor-pointer bg-green-500 bg-opacity-15 text-green-600 p-2 rounded-lg">
                          {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </div>
                        <span onClick={() => handleRemove(row.id)} className="cursor-pointer bg-red-500 bg-opacity-15 text-red-600 p-2 rounded-lg">
                          <X className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  )
                }

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Deliveries;