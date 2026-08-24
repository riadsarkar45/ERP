import { useEffect, useRef, useState, useMemo, useContext } from "react";
import { Loader2, Save, X, Plus, Package, FileText, ClipboardList, Factory, Layers, Building2, Building, Locate, Users } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import Input from "../../components/Input";
import Toast from "../../components/Toast";
import { useParams, useNavigate } from "react-router-dom";
import useAxiosPrivate from "../../hooks/UseAxiosPrivate";
import { useSocket } from "../../hooks/socket.io/socketContext";
import { AuthContext } from "../auth/AuthContext";

const defaultYarnColor = () => ({
    color: "",
    shade: "",
    yarnCount: "",
    machineDia: "",
    lotNo: "",
    qty: "",
    price: "",
});

const ORDER_TYPE_RULES = {
    knittingOrder: { lotNo: true, yarnCount: true, stichLength: true, machineDia: true },
    aopOrder: { lotNo: true, yarnCount: true, stichLength: false, machineDia: false },
    dyeingOrder: { lotNo: true, yarnCount: true, stichLength: true, machineDia: false },
    yarnDyeingOrder: { lotNo: false, yarnCount: false, stichLength: false, machineDia: false },
};

const getRules = (orderType) => ORDER_TYPE_RULES[orderType] || {};

const rowStockKey = (rowIndex) => `row-${rowIndex}`;
const colorStockKey = (rowIndex, colorIndex) => `row-${rowIndex}-color-${colorIndex}`;

const buildLotAndCountOptions = (stock, selectedLotNo, selectedYarnCount) => {
    const lotSet = new Set();
    const countSet = new Set();
    (stock || []).forEach((s) => {
        const matchesSelectedCount = selectedYarnCount ? String(s.count) === String(selectedYarnCount) : true;
        const matchesSelectedLot = selectedLotNo ? s.lotNo === selectedLotNo : true;
        if (matchesSelectedCount && s.lotNo) lotSet.add(s.lotNo);
        if (matchesSelectedLot && s.count !== undefined && s.count !== null) countSet.add(s.count);
    });
    return { lotOptions: Array.from(lotSet), countOptions: Array.from(countSet) };
};

const isCombinationValid = (stock, lotNo, yarnCount) => {
    if (!lotNo && !yarnCount) return true;
    return (stock || []).some((s) => {
        const lotMatch = lotNo ? s.lotNo === lotNo : true;
        const countMatch = yarnCount ? String(s.count) === String(yarnCount) : true;
        return lotMatch && countMatch;
    });
};

const filterStockBySelection = (stock, selectedLotNo, selectedYarnCount) => {
    if (!stock?.length) return [];
    if (!selectedLotNo && !selectedYarnCount) return stock;
    return stock.filter((s) => {
        const lotMatches = selectedLotNo ? s.lotNo === selectedLotNo : true;
        const countMatches = selectedYarnCount ? String(s.count) === String(selectedYarnCount) : true;
        return lotMatches && countMatches;
    });
};

const dedupeStock = (list) => {
    const seen = new Map();
    const out = [];
    (list || []).forEach((s) => {
        const sig = `${s.supplierName ?? ""}|${s.lotNo ?? ""}|${s.count ?? ""}|${s.physicalBalanceQty ?? ""}`;
        if (!seen.has(sig)) {
            seen.set(sig, s);
            out.push(s);
        } else {
            if (s._isSelected) {
                const existing = seen.get(sig);
                existing._isSelected = true;
            }
        }
    });
    return out;
};

const dedupeRows = (list) => {
    const seen = new Set();
    const out = [];
    (list || []).forEach((row) => {
        const sig = `${row.composition ?? ""}|${row.color ?? ""}`;
        if (!seen.has(sig)) {
            seen.add(sig);
            out.push(row);
        }
    });
    return out;
};

const dedupeFactoryData = (list) => {
    const seen = new Set();
    const out = [];
    (list || []).forEach((f) => {
        const sig = f.factoryName ?? "";
        if (!seen.has(sig)) {
            seen.add(sig);
            out.push(f);
        }
    });
    return out;
};

const SectionCard = ({ icon: Icon, title, description, children, aside }) => (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <header className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600">
                    <Icon size={16} />
                </span>
                <div>
                    <h3 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h3>
                    {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
                </div>
            </div>
            {aside}
        </header>
        <div className="p-5 sm:p-6">{children}</div>
    </section>
);

// NEW: small inline badge shown under a Lot No field when someone else is on the same lot
const LotConflictNote = ({ occupants }) => {
    if (!occupants || occupants.length === 0) return null;
    const names = occupants.map((o) => o.userName).filter(Boolean);
    return (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
            <Users size={12} className="shrink-0" />
            <span className="truncate">
                Also selected by {names.join(", ")}
            </span>
        </p>
    );
};

const NewOrder = () => {
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState("success");
    const [isClicked, setIsClicked] = useState(false);
    const { jobNumber } = useParams();
    const navigate = useNavigate();

    const [styleData, setStyleData] = useState(null);
    const [rows, setRows] = useState([]);
    const [orderType, setOrderType] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [factoryData, setFactoryData] = useState([]);
    const [isFactoryDataLoading, setFactoryLoading] = useState(false);

    const [yarnStockData, setYarnStockData] = useState({});
    const [yarnStockLoading, setYarnStockLoading] = useState({});
    const debounceTimers = useRef({});
    const orderTypeRef = useRef(orderType);
    const yarnStockDataRef = useRef(yarnStockData);
    const fetchedJobRef = useRef(null);
    const { user } = useContext(AuthContext);

    // NEW: live presence — lotNo -> [{ userId, userName, stockId }]
    const [lotPresence, setLotPresence] = useState({});

    const [formData, setFormData] = useState({
        workOrderPlaceDate: "",
        workOrderNo: "",
        month: "",
        salesContractNo: "",
        buyer: "",
        jobNo: "",
        poNo: "",
        style: "",
        orderType: "",
        factoryName: "",
        stichLength: "",
        lotNo: "",
        unitPrice: "",
        yarnCount: "",
        processLoss: "",
    });

    const axiosPrivate = useAxiosPrivate();
    const socket = useSocket();

    useEffect(() => {
        orderTypeRef.current = orderType;
    }, [orderType]);

    useEffect(() => {
        yarnStockDataRef.current = yarnStockData;
    }, [yarnStockData]);

    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach(clearTimeout);
        };
    }, []);

    const alreadyBookedTotal = useMemo(() => {
        if (!styleData?.compBreakdown || !orderType) return 0;
        return styleData.compBreakdown.reduce(
            (sum, b) => sum + (parseFloat(b[`${orderType}_workOrderQty`]) || 0),
            0
        );
    }, [styleData, orderType]);

    const styleTotals = useMemo(() => {
        const sourceRows = dedupeRows(styleData?.rows || []);
        const sourceData = styleData || {};
        const processLoss = Number(sourceData.processLoss) || 0;
        let totalOrderQty = 0;
        let totalFinishRequiredQty = 0;
        let totalAdditional = 0;

        sourceRows.forEach((row) => {
            totalOrderQty += parseFloat(row.orderQty) || 0;
            totalFinishRequiredQty += parseFloat(row.finishRequiredQty) || 0;
            totalAdditional += parseFloat(row.additional) || 0;
        });
        return { totalOrderQty, totalFinishRequiredQty, processLoss, totalAdditional };
    }, [styleData]);

    const totals = useMemo(() => {
        let totalWorkOrderQty = 0;
        let totalAmount = 0;
        const totalRows = rows.length;
        let compositionsWithWorkOrder = 0;

        rows.forEach((row) => {
            if (orderType === "yarnDyeingOrder") {
                const hasEntry = (row.yarnColors || []).some((yc) => parseFloat(yc.qty) > 0);
                if (hasEntry) compositionsWithWorkOrder += 1;

                (row.yarnColors || []).forEach((yc) => {
                    const qty = parseFloat(yc.qty) || 0;
                    const price = parseFloat(yc.price) || 0;
                    totalWorkOrderQty += qty;
                    totalAmount += qty * price;
                });
            } else {
                const qty = parseFloat(row.workOrderQty) || 0;
                const price = parseFloat(row.unitPrice) || 0;
                if (qty > 0) compositionsWithWorkOrder += 1;
                totalWorkOrderQty += qty;
                totalAmount += qty * price;
            }
        });

        return { totalWorkOrderQty, totalAmount, totalRows, compositionsWithWorkOrder };
    }, [rows, orderType]);

    const yarnStockEntries = useMemo(() => {
        const entries = [];
        rows.forEach((row, rIdx) => {
            if (orderType === "yarnDyeingOrder") {
                (row.yarnColors ?? []).forEach((yc, cIdx) => {
                    const stock = yarnStockData[colorStockKey(rIdx, cIdx)] || [];
                    const filtered = filterStockBySelection(stock, yc.lotNo, yc.yarnCount);
                    filtered.forEach((s) => {
                        // FIXED: previously both ternaries fell through to `true` when
                        // yc.lotNo/yc.yarnCount were still empty, marking EVERY row as
                        // "selected" before the user had picked anything. Now a row can
                        // only be flagged selected once the user has actually chosen a
                        // matching lotNo (yarnCount only needs to match if also chosen).
                        const isSel = !!(
                            yc.lotNo &&
                            s.lotNo === yc.lotNo &&
                            (!yc.yarnCount || String(s.count) === String(yc.yarnCount))
                        );
                        entries.push({
                            ...s,
                            _isSelected: isSel,
                        });
                    });
                });
            } else {
                const stock = yarnStockData[rowStockKey(rIdx)] || [];
                const filtered = filterStockBySelection(stock, row.lotNo, row.yarnCount);
                filtered.forEach((s) => {
                    // FIXED: same "selected by default" bug as above.
                    const isSel = !!(
                        row.lotNo &&
                        s.lotNo === row.lotNo &&
                        (!row.yarnCount || String(s.count) === String(row.yarnCount))
                    );
                    entries.push({
                        ...s,
                        _isSelected: isSel,
                    });
                });
            }
        });

        return dedupeStock(entries);
    }, [rows, yarnStockData, orderType]);

    const isAnyYarnStockLoading = Object.values(yarnStockLoading).some(Boolean);

    // NEW: look up who else (not me) currently has this lotNo selected
    const getOtherOccupants = (lotNo, myUserId) => {
        if (!lotNo) return [];
        const occupants = lotPresence[lotNo] || [];
        const seen = new Set();
        const others = [];
        occupants.forEach((o) => {
            if (!o || String(o.userId) === String(myUserId)) return;
            if (seen.has(o.userId)) return;
            seen.add(o.userId);
            others.push(o);
        });
        return others;
    };

    // NEW: tell the server this row/color no longer holds a lot.
    const releaseLot = (stockId) => {
        if (!user?.id || !stockId) {
            console.warn("[lot] releaseLot skipped — missing", { hasUserId: !!user?.id, hasStockId: !!stockId });
            return;
        }
        if (!socket) {
            console.warn("[lot] releaseLot skipped — socket instance missing entirely (check SocketProvider)");
            return;
        }
        socket.emit("yarn-lot-cleared", { stockId: String(stockId), userId: user.id });
        setLotPresence((prev) => {
            let changed = false;
            const next = {};
            Object.entries(prev).forEach(([lotNo, occupants]) => {
                const filtered = occupants.filter(
                    (o) => !(String(o.userId) === String(user.id) && String(o.stockId) === String(stockId))
                );
                if (filtered.length !== occupants.length) changed = true;
                if (filtered.length > 0) next[lotNo] = filtered;
            });
            return changed ? next : prev;
        });
    };

    // NEW: tell the server this row/color now holds a lot.
    // Logs the exact reason instead of silently swallowing the click —
    // this is what will tell you definitively why a "first attempt" fails.
    const claimLot = (stockId, lotNo, yarnCount) => {
        if (!user?.id || !stockId || !lotNo) {
            console.warn("[lot] claimLot skipped — missing", {
                hasUserId: !!user?.id,
                hasStockId: !!stockId,
                hasLotNo: !!lotNo,
            });
            return;
        }
        if (!socket) {
            console.warn("[lot] claimLot skipped — socket instance missing entirely (check SocketProvider)");
            return;
        }
        socket.emit("yarn-lot-selected", {
            stockId: String(stockId),
            lotNo,
            yarnCount: yarnCount || "",
            userName: user?.name,
            userId: user.id,
        });
    };

    useEffect(() => {
        if (!jobNumber) return;
        if (fetchedJobRef.current === jobNumber) return;
        fetchedJobRef.current = jobNumber;

        const fetchStyleData = async () => {
            setIsLoading(true);
            try {
                const req = await axiosPrivate.get(`/api/styles/${jobNumber}`);
                const data = req.data.data;
                const style = Array.isArray(data) ? data[0] : data;

                if (!style) {
                    showNotification("Style not found", "error");
                    setIsLoading(false);
                    return;
                }

                setStyleData(style);
                setFormData({
                    workOrderPlaceDate: "",
                    workOrderNo: "",
                    month: "",
                    salesContractNo: style.salesContractNo || "",
                    buyer: style.buyerName || "",
                    jobNo: style.jobNo || "",
                    poNo: style.poNo || "",
                    style: style.styleNo || "",
                    orderType: "",
                    factoryName: "",
                    stichLength: "",
                    lotNo: "",
                    unitPrice: "",
                    yarnCount: "",
                    processLoss: style.processLoss || "",
                });

                const dedupedStyleRows = dedupeRows(style.rows || []);

                const initialRows = dedupedStyleRows.map((row, index) => ({
                    id: row.id || `${Date.now()}-${index}`,
                    composition: row.composition || "",
                    color: row.color || "",
                    orderQty: row.orderQty || "",
                    finishRequiredQty: row.finishRequiredQty || "",
                    additional: row.additional || "",
                    unitPrice: row.unitPrice || "",
                    workOrderQty: "",
                    stichLength: "",
                    machineDia: "",
                    lotNo: "",
                    yarnCount: "",
                    yarnColors: [defaultYarnColor()],
                }));

                setRows(initialRows.length > 0 ? initialRows : [{
                    id: Date.now(),
                    composition: "",
                    color: "",
                    orderQty: "",
                    finishRequiredQty: "",
                    additional: "",
                    unitPrice: "",
                    workOrderQty: "",
                    stichLength: "",
                    machineDia: "",
                    lotNo: "",
                    yarnCount: "",
                    yarnColors: [defaultYarnColor()],
                }]);
            } catch (error) {
                console.error("Failed to fetch style data:", error);
                showNotification("Failed to load style data", "error");
                fetchedJobRef.current = null;
            } finally {
                setIsLoading(false);
            }
        };

        fetchStyleData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobNumber]);

    useEffect(() => {
        if (!orderType || !jobNumber) return;
        let cancelled = false;
        const fetchFactoryWiseWorkOrderTotal = async () => {
            setFactoryLoading(true);
            try {
                const response = await axiosPrivate.get(`/api/factories/workOrder/totals/${jobNumber}/${orderType}`);
                if (!cancelled) {
                    setFactoryData(dedupeFactoryData(response.data));
                }
            } catch (error) {
                console.error("Failed to fetch factory totals:", error);
            } finally {
                if (!cancelled) setFactoryLoading(false);
            }
        };
        fetchFactoryWiseWorkOrderTotal();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobNumber, orderType]);

    const fetchYarnStockForKey = async (key, qty) => {
        if (!qty || Number(qty) <= 0) {
            setYarnStockData((prev) => ({ ...prev, [key]: [] }));
            return;
        }
        setYarnStockLoading((prev) => ({ ...prev, [key]: true }));
        try {
            const response = await axiosPrivate.get(`/api/total/yarn-work-order`, {
                params: { orderType: orderTypeRef.current, workOrderQty: Number(qty) },
            });
            const responseData = response.data.data || response.data || [];
            setYarnStockData((prev) => ({ ...prev, [key]: dedupeStock(responseData) }));
        } catch (error) {
            console.error("Failed to fetch yarn stock details:", error);
            setYarnStockData((prev) => ({ ...prev, [key]: [] }));
        } finally {
            setYarnStockLoading((prev) => ({ ...prev, [key]: false }));
        }
    };

    const scheduleYarnStockFetch = (key, qty) => {
        if (debounceTimers.current[key]) {
            clearTimeout(debounceTimers.current[key]);
        }
        debounceTimers.current[key] = setTimeout(() => {
            fetchYarnStockForKey(key, qty);
        }, 400);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "orderType") {
            setOrderType(value);
            if (value === "yarnDyeingOrder") {
                setRows((prev) => prev.map((row) => ({ ...row, yarnColors: row.yarnColors ?? [defaultYarnColor()] })));
            }
            setYarnStockData({});
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRowChange = (index, field, value) => {
        const stockId = rows[index]?.id ?? rowStockKey(index);

        // NEW: claim/release the lot on the server as the user picks or clears it
        if (field === "lotNo") {
            if (value) {
                claimLot(stockId, value, rows[index].yarnCount || "");
            } else {
                releaseLot(stockId);
            }
        }

        // NEW: workOrderQty change resets lotNo/yarnCount locally below,
        // so release whatever lot this row was holding
        if (field === "workOrderQty" && rows[index]?.lotNo) {
            releaseLot(stockId);
        }

        setRows((prev) =>
            prev.map((row, i) => {
                if (i !== index) return row;
                let updated = { ...row, [field]: value };

                if (field === "workOrderQty") {
                    updated.lotNo = "";
                    updated.yarnCount = "";
                } else if (field === "lotNo" || field === "yarnCount") {
                    const stock = yarnStockDataRef.current[rowStockKey(index)] || [];
                    if (!isCombinationValid(stock, updated.lotNo, updated.yarnCount)) {
                        if (field === "lotNo") updated.yarnCount = "";
                        else updated.lotNo = "";
                    }
                }
                return updated;
            })
        );

        if (field === "workOrderQty") {
            scheduleYarnStockFetch(rowStockKey(index), value);
        }
    };

    // NEW: keeps a live copy of `rows` for the reconnect/ready effect below,
    // without forcing that effect to re-run on every keystroke.
    const rowsRef = useRef(rows);
    useEffect(() => {
        rowsRef.current = rows;
    }, [rows]);

    // FIXED ("not working on the first attempt"): if the user picks a Lot No
    // before the socket connection is ready (very common — the context often
    // returns the socket before "connect" fires), the original claimLot call
    // silently no-op'd and that pick was lost for good; the NEXT pick worked
    // because by then the socket existed, which is exactly what was reported.
    // This effect re-announces every row/color that currently holds a lotNo
    // as soon as the socket becomes available, and again on every reconnect —
    // important at your scale since mobile clients drop and reconnect often.
    useEffect(() => {
        if (!socket || !user?.id) return;

        const announceCurrentSelections = () => {
            const currentRows = rowsRef.current;
            currentRows.forEach((row, idx) => {
                const stockId = row.id ?? rowStockKey(idx);
                if (row.lotNo) {
                    claimLot(stockId, row.lotNo, row.yarnCount || "");
                }
                (row.yarnColors || []).forEach((yc, ci) => {
                    if (yc.lotNo) {
                        claimLot(`${stockId}-c${ci}`, yc.lotNo, yc.yarnCount || "");
                    }
                });
            });
        };

        // Covers: socket just became ready after an earlier lost click
        announceCurrentSelections();

        // Covers: dropped connection reconnecting mid-session
        socket.on("connect", announceCurrentSelections);
        return () => {
            socket.off("connect", announceCurrentSelections);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, user?.id]);

    // Presence sync — listens for other users joining/leaving a lot
    useEffect(() => {
        if (!socket) {
            console.warn("Socket not initialized");
            return;
        }

        const upsertOccupant = (lotNo, occupant) => {
            setLotPresence((prev) => {
                const list = prev[lotNo] ? [...prev[lotNo]] : [];
                const idx = list.findIndex(
                    (o) => String(o.userId) === String(occupant.userId) && String(o.stockId) === String(occupant.stockId)
                );
                if (idx >= 0) list[idx] = occupant;
                else list.push(occupant);
                return { ...prev, [lotNo]: list };
            });
        };

        const removeOccupant = (lotNo, userId, stockId) => {
            setLotPresence((prev) => {
                if (!prev[lotNo]) return prev;
                const filtered = prev[lotNo].filter(
                    (o) => !(String(o.userId) === String(userId) && String(o.stockId) === String(stockId))
                );
                const next = { ...prev };
                if (filtered.length > 0) next[lotNo] = filtered;
                else delete next[lotNo];
                return next;
            });
        };

        const handleLotSelection = (payload) => {
            if (!payload?.lotNo) return;
            if (payload.users) {
                // snapshot: everyone already on this lot when I joined
                setLotPresence((prev) => ({
                    ...prev,
                    [payload.lotNo]: payload.users.map((u) => ({
                        userId: String(u.userId),
                        userName: u.userName,
                        stockId: u.stockId,
                    })),
                }));
            } else {
                upsertOccupant(payload.lotNo, {
                    userId: String(payload.userId),
                    userName: payload.userName,
                    stockId: payload.stockId,
                });
            }
        };

        const handleLotDeselection = (payload) => {
            if (!payload?.lotNo) return;
            removeOccupant(payload.lotNo, payload.userId, payload.stockId);
        };

        socket.on("yarn-lot-selection", handleLotSelection);
        socket.on("yarn-lot-deselection", handleLotDeselection);

        return () => {
            socket.off("yarn-lot-selection", handleLotSelection);
            socket.off("yarn-lot-deselection", handleLotDeselection);
        };
    }, [socket]);

    const handleRemoveRow = (index) => {
        if (rows.length <= 1) {
            showNotification("At least one composition is required", "error");
            return;
        }
        const row = rows[index];
        // NEW: release any lot(s) this row was holding before it disappears
        if (row?.lotNo) releaseLot(row.id ?? rowStockKey(index));
        (row?.yarnColors || []).forEach((yc, ci) => {
            if (yc.lotNo) releaseLot(`${row.id ?? rowStockKey(index)}-c${ci}`);
        });

        setRows((prev) => prev.filter((_, i) => i !== index));
        setYarnStockData((prev) => {
            const next = { ...prev };
            delete next[rowStockKey(index)];
            return next;
        });
    };

    const handleAddYarnColor = (rowIndex) => {
        setRows((prev) =>
            prev.map((row, i) =>
                i === rowIndex ? { ...row, yarnColors: [...(row.yarnColors ?? [defaultYarnColor()]), defaultYarnColor()] } : row
            )
        );
    };

    const handleYarnColorChange = (rowIndex, colorIndex, field, value) => {
        const row = rows[rowIndex];
        const colorStockId = `${row?.id ?? rowStockKey(rowIndex)}-c${colorIndex}`;

        // NEW: claim/release the lot for this specific color entry
        if (field === "lotNo") {
            if (value) {
                const yc = row?.yarnColors?.[colorIndex];
                claimLot(colorStockId, value, yc?.yarnCount || "");
            } else {
                releaseLot(colorStockId);
            }
        }
        if (field === "qty" && row?.yarnColors?.[colorIndex]?.lotNo) {
            releaseLot(colorStockId);
        }

        setRows((prev) =>
            prev.map((row, i) => {
                if (i !== rowIndex) return row;
                return {
                    ...row,
                    yarnColors: (row.yarnColors ?? [defaultYarnColor()]).map((c, ci) => {
                        if (ci !== colorIndex) return c;
                        let updated = { ...c, [field]: value };

                        if (field === "qty") {
                            updated.lotNo = "";
                            updated.yarnCount = "";
                        } else if (field === "lotNo" || field === "yarnCount") {
                            const stock = yarnStockDataRef.current[colorStockKey(rowIndex, colorIndex)] || [];
                            if (!isCombinationValid(stock, updated.lotNo, updated.yarnCount)) {
                                if (field === "lotNo") updated.yarnCount = "";
                                else updated.lotNo = "";
                            }
                        }

                        return updated;
                    }),
                };
            })
        );

        if (field === "qty") {
            scheduleYarnStockFetch(colorStockKey(rowIndex, colorIndex), value);
        }
    };

    const handleRemoveYarnColor = (rowIndex, colorIndex) => {
        const row = rows[rowIndex];
        const yc = row?.yarnColors?.[colorIndex];
        // NEW: release the lot this color entry was holding
        if (yc?.lotNo) releaseLot(`${row?.id ?? rowStockKey(rowIndex)}-c${colorIndex}`);

        setRows((prev) =>
            prev.map((row, i) =>
                i === rowIndex ? {
                    ...row,
                    yarnColors: (row.yarnColors ?? [defaultYarnColor()]).filter((_, ci) => ci !== colorIndex),
                } : row
            )
        );
        setYarnStockData((prev) => {
            const next = { ...prev };
            delete next[colorStockKey(rowIndex, colorIndex)];
            return next;
        });
    };

    const showNotification = (message, type = "success") => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const validateForm = () => {
        if (!formData.workOrderPlaceDate) return showNotification("Work Order Place Date is required", "error"), false;
        if (!formData.workOrderNo) return showNotification("Work Order No is required", "error"), false;
        if (!formData.orderType) return showNotification("Order Type is required", "error"), false;
        if (!formData.factoryName) return showNotification("Factory Name is required", "error"), false;

        const rules = getRules(orderType);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.composition || !row.color) {
                return showNotification(`Composition and Color are required for Composition ${i + 1}`, "error"), false;
            }

            if (orderType !== "yarnDyeingOrder") {
                if (!row.unitPrice) return showNotification(`Price Per Kg is required for Composition ${i + 1}`, "error"), false;
                if (!row.workOrderQty) return showNotification(`Work Order Qty is required for Composition ${i + 1}`, "error"), false;
                if (rules.yarnCount && !row.yarnCount) return showNotification(`Yarn Count is required for Composition ${i + 1}`, "error"), false;
                if (rules.lotNo && !row.lotNo) return showNotification(`Lot No is required for Composition ${i + 1}`, "error"), false;
                if (rules.machineDia && !row.machineDia) return showNotification(`Machine Dia is required for Composition ${i + 1}`, "error"), false;
                if (rules.stichLength && !row.stichLength) return showNotification(`Stich Length is required for Composition ${i + 1}`, "error"), false;
            } else {
                if (!row.yarnColors || row.yarnColors.length === 0) {
                    return showNotification(`At least one yarn color is required for Composition ${i + 1}`, "error"), false;
                }
                for (let j = 0; j < row.yarnColors.length; j++) {
                    const yc = row.yarnColors[j];
                    if (!yc.color) return showNotification(`Yarn color is required for Composition ${i + 1}, Color ${j + 1}`, "error"), false;
                    if (!yc.qty) return showNotification(`Qty is required for Composition ${i + 1}, Color ${j + 1}`, "error"), false;
                    if (!yc.price) return showNotification(`Price is required for Composition ${i + 1}, Color ${j + 1}`, "error"), false;
                }
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm() || !styleData) {
            if (!styleData) showNotification("Style data not loaded", "error");
            return;
        }

        setIsClicked(true);
        try {
            const payload = {
                workOrderPlaceDate: formData.workOrderPlaceDate,
                workOrderNo: formData.workOrderNo,
                month: formData.month,
                jobNo: formData.jobNo,
                factoryName: formData.factoryName,
                orderType: formData.orderType,
                styleNo: styleData.styleNo || formData.style,
                compositions: rows.map((row) => ({
                    composition: row.composition,
                    color: row.color,
                    orderQty: row.orderQty,
                    workOrderQty: row.workOrderQty,
                    unitPrice: row.unitPrice,
                    machineDia: row.machineDia,
                    yarnCount: row.yarnCount,
                    stichLength: row.stichLength,
                    lotNo: row.lotNo,
                    ...(orderType === "yarnDyeingOrder" ? { yarnColors: row.yarnColors } : {}),
                })),
            };

            const res = await axiosPrivate.post("/api/create-job", payload);
            if (res.data.type === "success") {
                showNotification("Order created successfully", "success");
                setTimeout(() => navigate("/dashboard/style-requirement"), 1500);
            } else {
                showNotification(res.data.message || "Failed to create order", "error");
            }
        } catch (error) {
            console.error("Submit error:", error);
            showNotification(error?.response?.data?.message || "Failed to create order. Please try again.", "error");
        } finally {
            setIsClicked(false);
        }
    };

    const handleCancel = () => navigate(-1);

    const dyeingOrderType = ["knittingOrder", "aopOrder", "dyeingOrder", "yarnDyeingOrder"];

    const totalRequireQty = (
        Number(styleTotals.totalFinishRequiredQty) * (1 + (Number(styleTotals.processLoss) || 0) / 100) +
        (Number(styleTotals.totalAdditional) || 0)
    ).toFixed(2);

    if (isLoading) {
        return (
            <DashboardLayout title="Add New Order">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 size={32} className="animate-spin text-primary-500" />
                    <span className="ml-3 text-slate-600">Loading style data...</span>
                </div>
            </DashboardLayout>
        );
    }

    if (!styleData) {
        return (
            <DashboardLayout title="Add New Order">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <p className="text-slate-600 mb-4">No style data found</p>
                    <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600">
                        Go Back
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const currentRules = getRules(orderType);
    const isYarnDyeing = orderType === "yarnDyeingOrder";

    return (
        <DashboardLayout title="Add New Order">
            {showToast && (
                <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} duration={3000} />
            )}

            <div className="pb-32">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-slate-500 mt-1">
                            Job <span className="font-medium text-slate-700">{formData.jobNo || "—"}</span>
                            <span className="mx-2 text-slate-300">/</span>
                            Style <span className="font-medium text-slate-700">{formData.style || "—"}</span>
                            <span className="mx-2 text-slate-300">/</span>
                            Buyer <span className="font-medium text-slate-700">{formData.buyer || "—"}</span>
                        </p>
                    </div>
                    {orderType && (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                            {orderType.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_490px] gap-6 items-start">
                    <div className="space-y-6">
                        <SectionCard icon={ClipboardList} title="Work Order Details" description="Basic identification for this work order">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <Input label="Work Order Place Date" name="workOrderPlaceDate" type="date" value={formData.workOrderPlaceDate} onChange={handleChange} required />
                                <Input label="Work Order No" name="workOrderNo" type="text" value={formData.workOrderNo} onChange={handleChange} placeholder="Enter work order number" required />
                                <Input label="Month" name="month" type="text" value={formData.month} onChange={handleChange} placeholder="Select Month" required />
                                <Input label="Job No" name="jobNo" readOnly value={formData.jobNo} placeholder="e.g., SM26-3429/JAN" />
                                <Input label="Process Loss (%)" name="processLoss" value={formData.processLoss} readOnly placeholder="Wastage %" />
                                <Input label="Order Type" name="orderType" value={formData.orderType} type="select" onChange={handleChange} required placeholder="Order Type" options={dyeingOrderType} />
                            </div>
                        </SectionCard>

                        <SectionCard
                            icon={Layers}
                            title="Compositions"
                            description="Quantities and process parameters per composition"
                            aside={<span className="shrink-0 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 tracking-wide">{totals.totalRows} {totals.totalRows === 1 ? "ITEM" : "ITEMS"}</span>}
                        >
                            <div className="space-y-4">
                                {rows.map((styleRow, index) => {
                                    const rowStock = yarnStockData[rowStockKey(index)] || [];
                                    const rowLoading = yarnStockLoading[rowStockKey(index)];
                                    const { lotOptions: rowLotOptions, countOptions: rowCountOptions } = buildLotAndCountOptions(
                                        rowStock,
                                        styleRow.lotNo,
                                        styleRow.yarnCount
                                    );
                                    // NEW: who else (not me) is on this row's currently selected lot
                                    const rowConflicts = getOtherOccupants(styleRow.lotNo, user?.id);

                                    return (
                                        <div key={styleRow.id || index} className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden transition-colors hover:border-slate-300">
                                            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800 text-[11px] font-semibold text-white">{index + 1}</span>
                                                    <p className="truncate text-sm font-medium text-slate-700">
                                                        {styleRow.composition || "Composition"}
                                                        {styleRow.color && <span className="ml-2 text-xs font-normal text-slate-500">{styleRow.color}</span>}
                                                    </p>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveRow(index)} title="Remove composition" className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                                                    <X size={15} />
                                                </button>
                                            </div>

                                            <div className="p-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <Input label="Composition" readOnly value={styleRow.composition} />
                                                    <Input label="Color" readOnly value={styleRow.color} />
                                                    <Input label="Order Qty (KG)" readOnly value={styleRow.orderQty} />
                                                    {!isYarnDyeing && <Input label="Price Per Kg" value={styleRow.unitPrice} onChange={(e) => handleRowChange(index, "unitPrice", e.target.value)} required placeholder="Unit Price" />}
                                                    {!isYarnDyeing && <Input label="Work Order Qty" value={styleRow.workOrderQty} onChange={(e) => handleRowChange(index, "workOrderQty", e.target.value)} required placeholder="Work Order Qty" />}
                                                    {currentRules.stichLength && <Input label="Stich Length" value={styleRow.stichLength} onChange={(e) => handleRowChange(index, "stichLength", e.target.value)} required placeholder="Stich Length" />}
                                                    {currentRules.machineDia && <Input label="Machine Dia" value={styleRow.machineDia} onChange={(e) => handleRowChange(index, "machineDia", e.target.value)} required placeholder="Machine Dia" />}
                                                    {currentRules.lotNo && (
                                                        // NEW: wrapper div holds the Input + conflict note beneath it
                                                        <div>
                                                            <Input
                                                                label={rowLoading ? "Lot No (loading...)" : "Lot No"}
                                                                type="select"
                                                                options={rowLotOptions}
                                                                value={styleRow.lotNo}
                                                                onChange={(e) => handleRowChange(index, "lotNo", e.target.value)}
                                                                required
                                                                placeholder={styleRow.workOrderQty ? "Lot No" : "Enter Work Order Qty first"}
                                                                disabled={!styleRow.workOrderQty}
                                                            />
                                                            <LotConflictNote occupants={rowConflicts} />
                                                        </div>
                                                    )}
                                                    {currentRules.yarnCount && (
                                                        <Input
                                                            label={rowLoading ? "Yarn Count (loading...)" : "Yarn Count"}
                                                            type="select"
                                                            options={rowCountOptions}
                                                            value={styleRow.yarnCount}
                                                            onChange={(e) => handleRowChange(index, "yarnCount", e.target.value)}
                                                            required
                                                            placeholder={styleRow.workOrderQty ? "Yarn Count" : "Enter Work Order Qty first"}
                                                            disabled={!styleRow.workOrderQty}
                                                        />
                                                    )}
                                                </div>

                                                {isYarnDyeing && (
                                                    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Yarn Booking Colors</h5>
                                                            <button type="button" onClick={() => handleAddYarnColor(index)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100">
                                                                <Plus size={13} /> Add Color
                                                            </button>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {(styleRow.yarnColors ?? [defaultYarnColor()]).map((yarnItem, ci) => {
                                                                const colorStock = yarnStockData[colorStockKey(index, ci)] || [];
                                                                const colorLoading = yarnStockLoading[colorStockKey(index, ci)];
                                                                const { lotOptions: colorLotOptions, countOptions: colorCountOptions } = buildLotAndCountOptions(
                                                                    colorStock,
                                                                    yarnItem.lotNo,
                                                                    yarnItem.yarnCount
                                                                );
                                                                // NEW: conflicts for this specific color's lot
                                                                const colorConflicts = getOtherOccupants(yarnItem.lotNo, user?.id);

                                                                return (
                                                                    <div key={ci} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 items-end rounded-lg border border-slate-200 bg-white p-3">
                                                                        <Input label={ci === 0 ? "Booking Color" : ""} placeholder="Yarn booking color" value={yarnItem.color} onChange={(e) => handleYarnColorChange(index, ci, "color", e.target.value)} />
                                                                        <Input label={ci === 0 ? "Shade%" : ""} placeholder="Shade %" value={yarnItem.shade} onChange={(e) => handleYarnColorChange(index, ci, "shade", e.target.value)} />
                                                                        <Input label={ci === 0 ? "Qty (KG)" : ""} placeholder="Qty" value={yarnItem.qty} onChange={(e) => handleYarnColorChange(index, ci, "qty", e.target.value)} />
                                                                        <Input label={ci === 0 ? "Machine Dia" : ""} placeholder="Machine Dia" value={yarnItem.machineDia} onChange={(e) => handleYarnColorChange(index, ci, "machineDia", e.target.value)} />
                                                                        <div>
                                                                            <Input
                                                                                label={ci === 0 ? (colorLoading ? "Lot No (loading...)" : "Lot No") : ""}
                                                                                type="select"
                                                                                options={colorLotOptions}
                                                                                value={yarnItem.lotNo}
                                                                                onChange={(e) => handleYarnColorChange(index, ci, "lotNo", e.target.value)}
                                                                                placeholder={yarnItem.qty ? "Lot No" : "Enter Qty first"}
                                                                                disabled={!yarnItem.qty}
                                                                            />
                                                                            <LotConflictNote occupants={colorConflicts} />
                                                                        </div>
                                                                        <Input
                                                                            label={ci === 0 ? (colorLoading ? "Yarn Count (loading...)" : "Yarn Count") : ""}
                                                                            type="select"
                                                                            options={colorCountOptions}
                                                                            value={yarnItem.yarnCount}
                                                                            onChange={(e) => handleYarnColorChange(index, ci, "yarnCount", e.target.value)}
                                                                            placeholder={yarnItem.qty ? "Yarn Count" : "Enter Qty first"}
                                                                            disabled={!yarnItem.qty}
                                                                        />
                                                                        <Input label={ci === 0 ? "Price Per Kg" : ""} value={yarnItem.price} onChange={(e) => handleYarnColorChange(index, ci, "price", e.target.value)} required placeholder="Unit Price" />
                                                                        <div className="flex justify-end">
                                                                            {(styleRow.yarnColors ?? []).length > 1 && (
                                                                                <button type="button" onClick={() => handleRemoveYarnColor(index, ci)} className="flex h-[42px] w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                                                                                    <X size={14} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </SectionCard>

                        <SectionCard icon={Factory} title="Factory" description="Where this work order will be produced">
                            <div className="max-w-md">
                                <Input label="Factory Name" name="factoryName" value={formData.factoryName} onChange={handleChange} placeholder="Factory Name" required />
                            </div>
                        </SectionCard>
                    </div>

                    <aside className="xl:sticky xl:top-6">
                        <div className="rounded-xl border mb-3 border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                                <FileText size={15} className="text-slate-500" />
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Order Summary</h4>
                            </div>

                            <div className="px-5 py-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm text-slate-600">
                                        <Package size={14} className="text-slate-400" />
                                        Total Order Qty
                                    </span>
                                    <span className="text-sm font-medium text-slate-900 tabular-nums">
                                        {styleTotals.totalOrderQty.toLocaleString()}
                                        <span className="ml-1 text-xs text-slate-400">PCS</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm text-slate-600">
                                        <Package size={14} className="text-slate-400" />
                                        Finish Required Qty
                                    </span>
                                    <span className="text-sm font-medium text-slate-900 tabular-nums">
                                        {totalRequireQty}
                                        <span className="ml-1 text-xs text-slate-400">KG</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm text-slate-600">
                                        <Package size={14} className="text-slate-400" />
                                        Previous Work Order Qty
                                    </span>
                                    <span className="text-sm font-medium text-slate-900 tabular-nums">
                                        {alreadyBookedTotal.toLocaleString()}
                                        <span className="ml-1 text-xs text-slate-400">KG</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm text-slate-600">
                                        <Package size={14} className="text-slate-400" />
                                        New Work Order Qty
                                    </span>
                                    <span className="text-sm font-medium text-slate-900 tabular-nums">
                                        {totals.totalWorkOrderQty.toLocaleString()}
                                        <span className="ml-1 text-xs text-slate-400">KG</span>
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                    <span className="text-xs text-slate-500">Work Short & Excess</span>
                                    <span
                                        className={`text-xs font-semibold tabular-nums ${(
                                            (alreadyBookedTotal ?? 0) -
                                            (Number(totalRequireQty) || 0) +
                                            (totals.totalWorkOrderQty ?? 0)
                                        ) < 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                            }`}
                                    >
                                        {Math.abs(
                                            (alreadyBookedTotal ?? 0) -
                                            (Number(totalRequireQty) || 0) +
                                            (totals.totalWorkOrderQty ?? 0)
                                        ).toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                    <span className="text-xs text-slate-500">Work Orders Created</span>
                                    <span className="text-xs font-semibold text-slate-700 tabular-nums">
                                        {totals.compositionsWithWorkOrder} / {totals.totalRows} compositions
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Estimated Total</p>
                                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                                    {totals.totalAmount.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                    <span className="ml-1.5 text-xs font-medium text-slate-400">BDT</span>
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-3">
                            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                                <Building2 size={15} className="text-slate-500" />
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Factory Wise Total Work Order Qty</h4>
                            </div>

                            {isFactoryDataLoading ? (
                                <div className="px-5 py-4 space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="flex items-center justify-between animate-pulse">
                                            <div className="flex items-center gap-2">
                                                <div className="h-3.5 w-3.5 rounded bg-slate-200" />
                                                <div className="h-3.5 rounded bg-slate-200" style={{ width: 90 + (i % 3) * 20 }} />
                                            </div>
                                            <div className="h-3.5 w-16 rounded bg-slate-200" />
                                        </div>
                                    ))}
                                </div>
                            ) : factoryData?.length ? (
                                <div className="max-h-[250px] overflow-y-auto overscroll-contain">
                                    {factoryData.map((fact, index) => (
                                        <div key={`${fact.factoryName}-${index}`} className="px-5 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-2 min-w-0 text-sm text-slate-600" title={fact.factoryName}>
                                                    <Building size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                    <span className="break-words whitespace-normal">{fact.factoryName}</span>
                                                </div>
                                                <span className="text-sm font-medium text-slate-900 tabular-nums whitespace-nowrap">
                                                    {Number(fact.workOrderQty).toFixed(2)}
                                                    <span className="ml-1 text-xs text-slate-400">KG</span>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-5 py-6 text-center text-xs text-slate-400">No factory data available</div>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                                <Package size={15} className="text-slate-500" />
                                <div>
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Yarn Stock Detail</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Narrows to the Lot No / Yarn Count you select</p>
                                </div>
                                {yarnStockEntries.length > 0 && (
                                    <span className="ml-auto rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                        {yarnStockEntries.length}
                                    </span>
                                )}
                            </div>

                            {isAnyYarnStockLoading ? (
                                <div className="px-5 py-4 space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="grid grid-cols-4 gap-3 animate-pulse">
                                            <div className="h-3.5 rounded bg-slate-200" />
                                            <div className="h-3.5 rounded bg-slate-200" />
                                            <div className="h-3.5 rounded bg-slate-200" />
                                            <div className="h-3.5 rounded bg-slate-200" />
                                        </div>
                                    ))}
                                </div>
                            ) : yarnStockEntries.length ? (
                                <div className="max-h-[420px] overflow-y-auto overscroll-contain">
                                    <div className="sticky top-0 z-10 grid grid-cols-[minmax(150px,1.5fr)_0.8fr_1fr_1fr] gap-3 px-5 py-2.5 bg-slate-100 border-b border-slate-200">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Supplier</span>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Count</span>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Lot No</span>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 text-right">Balance</span>
                                    </div>

                                    {yarnStockEntries.map((fact) => {
                                        const uniqueKey = `${fact.supplierName ?? ""}-${fact.count ?? ""}-${fact.lotNo ?? ""}-${fact.physicalBalanceQty ?? ""}`;
                                        const isSelected = fact._isSelected;
                                        // NEW: also flag rows other users are on right now
                                        const hasLiveConflict = isSelected && getOtherOccupants(fact.lotNo, user?.id).length > 0;

                                        return (
                                            <div
                                                key={uniqueKey}
                                                className={`grid grid-cols-[minmax(150px,1.5fr)_0.8fr_1fr_1fr] gap-3 items-start px-5 py-3 border-b border-slate-100 last:border-b-0 transition-colors ${hasLiveConflict
                                                    ? "bg-amber-50 hover:bg-amber-100"
                                                    : isSelected
                                                        ? "bg-red-50 hover:bg-red-100"
                                                        : "hover:bg-slate-50/70"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-1.5 min-w-0">
                                                    <Locate size={13} className={`shrink-0 mt-0.5 ${hasLiveConflict ? "text-amber-500" : isSelected ? "text-red-400" : "text-slate-400"}`} />
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-sm whitespace-normal break-words leading-5 ${hasLiveConflict ? "text-amber-800 font-medium" : isSelected ? "text-red-800 font-medium" : "text-slate-700"}`} title={fact.supplierName}>
                                                            {fact.supplierName || "—"}
                                                        </span>
                                                        {isSelected && !hasLiveConflict && (
                                                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200 shrink-0">
                                                                Selected
                                                            </span>
                                                        )}
                                                        {hasLiveConflict && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200 shrink-0">
                                                                <Users size={10} /> Also picked
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className={`text-sm whitespace-normal break-words ${hasLiveConflict ? "text-amber-800 font-medium" : isSelected ? "text-red-800 font-medium" : "text-slate-600"}`} title={String(fact.count ?? "")}>
                                                    {fact.count || "—"}
                                                </div>

                                                <div className={`text-sm whitespace-normal break-words ${hasLiveConflict ? "text-amber-800 font-medium" : isSelected ? "text-red-800 font-medium" : "text-slate-600"}`} title={fact.lotNo || ""}>
                                                    {fact.lotNo || "—"}
                                                </div>

                                                <div className="text-right">
                                                    <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${hasLiveConflict ? "text-amber-800" : isSelected ? "text-red-800" : "text-slate-900"}`}>
                                                        {Number(fact.physicalBalanceQty).toFixed(2)}
                                                    </span>
                                                    <span className={`ml-1 text-[10px] font-medium ${hasLiveConflict ? "text-amber-600" : isSelected ? "text-red-600" : "text-slate-400"}`}>
                                                        KG
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="px-5 py-8 text-center">
                                    <Package size={24} className="mx-auto mb-2 text-slate-300" />
                                    <p className="text-xs text-slate-400">No yarn stock available</p>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/90 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70 lg:left-64">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between max-w-[1400px] mx-auto">
                    <p className="text-xs text-slate-500">{totals.totalRows} composition{totals.totalRows === 1 ? "" : "s"} · review before submitting</p>
                    <div className="flex gap-3">
                        <button type="button" onClick={handleCancel} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                            <X size={16} /> Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={isClicked} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-70">
                            {isClicked ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {isClicked ? "Saving..." : "Create Order"}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default NewOrder;