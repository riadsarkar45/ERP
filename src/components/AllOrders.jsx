import { useEffect, useState, useCallback, useMemo, useContext, useRef } from "react";
import { DownloadCloudIcon, FunnelX, Loader, Loader2, Save, Search, X, Filter } from "lucide-react";
import useAxiosPublic from "../hooks/Axios";
import Modal from "./Modal";
import { useFetchData } from "../hooks/fetch";
import YarnDyeOrders from "./YarnDyeOrders";
import KnittingOrder from "./KnittingOrder";
import DyeingOrder from "./DyeingOrder";
import AopOrder from "./AopOrder";
import InlineEdit from "../helpers/InlineEdit/InlineEdit";
import FilterDropdown from "../helpers/filtering/FilterDropdown";
import useAxiosPrivate from "../hooks/UseAxiosPrivate";
import Toast from "./Toast";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../dashboard/auth/AuthContext";

export const FROZEN_COUNT = 8;

const FILTERABLE_COLUMNS = new Set([
    "jobNo",
    "factoryName",
    "workOrderNo",
    "styleNo",
    "month",
    "buyerName",
    "composition",
    "color",
    "orderQty",
    "workOrderQty",
    "unitePrice",
    "bookingColor",
]);

const getSavedFilters = (type) => {
    try {
        const saved = sessionStorage.getItem(`workOrderFilters_${type}`);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error("Error loading filters:", e);
        return {};
    }
};

const AllOrders = ({ orderType }) => {
    const axiosPublic = useAxiosPublic();
    const axiosPrivate = useAxiosPrivate();
    const [jobId, setJobId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [orders, setOrders] = useState([]);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [changedField, setChangedField] = useState({});
    const [styleNo, setStyleNo] = useState("");
    const [deliveries, setDeliveries] = useState({});
    const [workOrderId, setWorkOrderId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [appliedSearchTerm, setAppliedSearchTerm] = useState("");

    const [filters, setFilters] = useState(() => getSavedFilters(orderType));
    const [filterOptions, setFilterOptions] = useState({});
    const [filterOptionsLoading, setFilterOptionsLoading] = useState({});

    const [duplicateChallan, setDuplicateChallan] = useState([]);
    const [challanIssue, setChallanIssue] = useState([]);
    const [deliveryIssue, setDeliveryIssue] = useState([]);
    const [page, setPage] = useState(1);
    const [prepareForChallan, setPrepareChallan] = useState([]);
    const [isChallanDowloading, setIsChallanDownloading] = useState({ isLoading: false, isError: null });
    const [limit] = useState(10);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    const { handleInlineEdit, changedField: updatedFields, toastType, toastMessage, setShowToast, showToast, isInlineEditingLoading, handleOnChange, isEdit, isUpdated, handleEditedSubmit } = InlineEdit();
    const { fetchData, error, loading } = useFetchData();
    const { fetchData: fetchFilterOptions } = useFetchData();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const tableRef = useRef(null);
    const [frozenWidths, setFrozenWidths] = useState([]);
    const [frozenLefts, setFrozenLefts] = useState([]);

    const COLUMNS = useMemo(() => {
        const cols = [];
        if (orderType === "knittingOrder") {
            cols.push(
                { header: "MONTH", width: 135, inputName: "month" },
                { header: "FACTORY NAME", width: 190, inputName: "factoryName" },
                { header: "WORK ORDER NO", width: 100, inputName: "workOrderNo" },
                { header: "BUYER NAME", width: 120, inputName: "buyerName" },
                { header: "JOB NO.", width: 175, inputName: "jobNo" },
                { header: "STYLE", width: 130, inputName: "styleNo" },
                { header: "COLOR", width: 180, inputName: "color" },
                { header: "COMPOSITION", width: 280, inputName: "composition" },
                { header: "FINISH DIA", width: 120, inputName: "finishdia" },
                { header: "YARN COUNT", width: 160, inputName: "yarnCount" },
                { header: "YARN LOT", width: 200, inputName: "yarnLot" },
                { header: "STITCH LENGHT", width: 200, inputName: "stitchLength" },
                { header: "M/C DIA", width: 200, inputName: "m/cDia" },
                { header: "WORK ORDER QTY", width: 140, inputName: "workOrderQty" },
                { header: "YARN DELIVERY", width: 140, inputName: "totalYarnDelivery" },
                { header: "DEL. SHORT & EXCESS", width: 150 },
                { header: "YARN RETURN RECEIVED", width: 160 },
                { header: "GREY RECEIVED", width: 140 },
                { header: "RCVD SHORT & EXCESS", width: 150 },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "PAYABLE AMOUNT", width: 140 },
                { header: "PAID BILLING AMOUNT", width: 150 },
                { header: "PENDING BILLING AMOUNT", width: 160 },
            );
        } else if (orderType === "dyeingOrder") {
            cols.push(
                { header: "MONTH", width: 135, inputName: "month" },
                { header: "FACTORY NAME", width: 190, inputName: "factoryName" },
                { header: "WORK ORDER NO", width: 100, inputName: "workOrderNo" },
                { header: "BUYER NAME", width: 160, inputName: "buyerName" },
                { header: "JOB NO.", width: 180, inputName: "jobNo" },
                { header: "STYLE", width: 145, inputName: "styleNo" },
                { header: "COLOR", width: 180, inputName: "bookingColor" },
                { header: "COMPOSITION", width: 300, inputName: "composition" },
                { header: "FINISH DIA", width: 150, inputName: "finishdia" },
                { header: "YARN COUNT", width: 200, inputName: "yarncount" },
                { header: "YARN LOT", width: 200, inputName: "yarnlot" },
                { header: "STICH LENGHT", width: 200, inputName: "stichLenght" },
                { header: "MACHINE DIA", width: 200, inputName: "machineDia" },
                { header: "SHADE %", width: 200, inputName: "shade%" },
                { header: "DYEING WORK ORDER QTY", width: 160, inputName: "workOrderQty" },
                { header: "GREY DELIVERY", width: 140, inputName: "greyReceived" },
                { header: "DELIVERY SHORT & EXCESS", width: 180, inputName: "greyReceived" },
                { header: "GREY RETURN RECEIVE", width: 160, inputName: "greyReturn" },
                { header: "GREY RECEIVED FROM DYEING", width: 190, inputName: "greyReturn" },
                { header: "FINISH FABRIC RECEIVED", width: 170, inputName: "greyReturn" },
                { header: "BALANCE", width: 110, inputName: "greyReturn" },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "TOTAL SENT FOR COMPACTING", width: 190, inputName: "sentForCompacting" },
                { header: "TOTAL RECEIVED FROM COMPACTING", width: 210, inputName: "receivedFromCompacting" },
                { header: "TOTAL BILLING AMOUNT", width: 170, inputName: "unitePrice" },
                { header: "PAYABLE AMOUNT", width: 140, inputName: "unitePrice" },
                { header: "PENDING BILLING AMOUNT", width: 170, inputName: "unitePrice" },
            );
        } else if (orderType === "yarnDyeingOrder") {
            cols.push(
                { header: "MONTH", width: 120, inputName: "month" },
                { header: "FACTORY NAME", width: 200, inputName: "factoryName" },
                { header: "WORK ORDER NO", width: 160, inputName: "workOrderNo" },
                { header: "BUYER NAME", width: 180, inputName: "buyerName" },
                { header: "JOB NO.", width: 200, inputName: "jobNo" },
                { header: "STYLE", width: 150, inputName: "styleNo" },
                { header: "BOOKING COLOR", width: 200, inputName: "bookingColor" },
                { header: "COMPOSITION", width: 200, inputName: "composition" },
                { header: "FINISH DIA", width: 150, inputName: "finishDia" },
                { header: "SHADE (%)", width: 200, inputName: "shade(%)" },
                { header: "COLOR WISE ORDER QTY", width: 180, inputName: "orderColor" },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "YARN DELIVERY FOR Y/D", width: 170, inputName: "yarnDeliveryForYd" },
                { header: "DEL.SHORT & EXCESS", width: 160 },
                { header: "YARN RETURN RECEIVED", width: 170, inputName: "yarnReturnReceived" },
                { header: "YARN RECEIVED FROM Y/D", width: 180, inputName: "greyReceivedFromYd" },
                { header: "FINISH YARN RECEIVED", width: 170, inputName: "finishReceived" },
                { header: "FINISH RETURN", width: 140, inputName: "finishReturn" },
                { header: "YARN STOCK", width: 130 },
            );
        } else if (orderType === "aopOrder") {
            cols.push(
                { header: "MONTH", width: 125, inputName: "month" },
                { header: "FACTORY NAME", width: 180, inputName: "factoryName" },
                { header: "WORK ORDER NO", width: 100, inputName: "workOrderNo" },
                { header: "BUYER NAME", width: 120, inputName: "buyerName" },
                { header: "JOB NO.", width: 180, inputName: "jobNo" },
                { header: "STYLE", width: 120, inputName: "styleNo" },
                { header: "COLOR", width: 180, inputName: "color" },
                { header: "COMPOSITION", width: 280, inputName: "composition" },
                { header: "FINISH DIA", width: 200, inputName: "finishDia" },
                { header: "WORK ORDER QTY", width: 140, inputName: "workOrderQty" },
                { header: "SENT FOR AOP", width: 140, inputName: "totalYarnDelivery" },
                { header: "DEL. SHORT & EXCESS", width: 150 },
                { header: "RETURN FROM AOP", width: 150 },
                { header: "RECEIVED FROM AOP", width: 150 },
                { header: "FINISH AFTER AOP", width: 150 },
                { header: "PARTY BALANCE", width: 170 },
                { header: "PRICE PER KG", width: 120, inputName: "unitePrice" },
                { header: "PAYABLE AMOUNT", width: 140 },
                { header: "PAID BILLING AMOUNT", width: 150 },
                { header: "PENDING BILLING AMOUNT", width: 160 },
            );
        }
        return cols;
    }, [orderType]);

    const [columnWidths, setColumnWidths] = useState(() => COLUMNS.map(c => c.width || 120));

    useEffect(() => {
        setColumnWidths(COLUMNS.map(c => c.width || 120));
    }, [COLUMNS]);

    useEffect(() => {
        const updateFrozenDimensions = () => {
            if (!tableRef.current) return;
            const thElements = tableRef.current.querySelectorAll('thead tr th');
            if (thElements.length < FROZEN_COUNT) return;

            const newWidths = [];
            const newLefts = [];
            let currentLeft = 0;

            for (let i = 0; i < FROZEN_COUNT; i++) {
                const width = thElements[i].getBoundingClientRect().width;
                newWidths.push(width);
                newLefts.push(currentLeft);
                currentLeft += width;
            }

            setFrozenWidths(prevWidths => {
                let changed = false;
                if (prevWidths.length !== newWidths.length) {
                    changed = true;
                } else {
                    for (let i = 0; i < newWidths.length; i++) {
                        if (Math.abs(prevWidths[i] - newWidths[i]) > 0.5) {
                            changed = true;
                            break;
                        }
                    }
                }

                if (changed) {
                    setFrozenLefts(newLefts);
                    return newWidths;
                }
                return prevWidths;
            });
        };

        const timer = setTimeout(updateFrozenDimensions, 150);

        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(updateFrozenDimensions);
        });

        if (tableRef.current) {
            resizeObserver.observe(tableRef.current);
        }

        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
        };
    }, [orders, isEdit, orderType]);

    const safeFrozenWidths = frozenWidths.length === FROZEN_COUNT ? frozenWidths : columnWidths.slice(0, FROZEN_COUNT);
    const safeFrozenLefts = frozenLefts.length === FROZEN_COUNT ? frozenLefts : safeFrozenWidths.reduce((acc, w, i) => {
        if (i === 0) return [0];
        return [...acc, acc[i - 1] + safeFrozenWidths[i - 1]];
    }, []);

    const handleRedirect = (jobNumber) => navigate(`/dashboard/new-order/${jobNumber}`);

    useEffect(() => {
        try {
            sessionStorage.setItem(`workOrderFilters_${orderType}`, JSON.stringify(filters));
        } catch (e) {
            console.error("Error saving filters:", e);
        }
    }, [filters, orderType]);

    useEffect(() => {
        setFilters(getSavedFilters(orderType));
        setFilterOptions({});
    }, [orderType]);

    useEffect(() => {
        setPage(1);
        setHasLoadedOnce(false);
    }, [orderType]);

    useEffect(() => {
        setPage(1);
    }, [filters]);

    const filtersParam = useMemo(
        () => (Object.keys(filters).length ? JSON.stringify(filters) : undefined),
        [filters]
    );

    useEffect(() => {
        const prepareToGenerateChallans = async () => {
            try {
                const res = await axiosPrivate.get(`/api/prepare-to-download/${Number(user?.id)}`);
                setPrepareChallan(res.data);
            } catch (err) {
                console.error("Failed to fetch challan prep data:", err);
            }
        };
        if (user?.id) {
            prepareToGenerateChallans();
        }
    }, [axiosPrivate, user?.id]);

    useEffect(() => {
        fetchData(`/api/work-order/${orderType}`, {
            params: { page, limit, filters: filtersParam }
        })
            .then(res => {
                if (res) {
                    setOrders(res.data ?? []);
                    if (res.pagination) setPagination(res.pagination);
                }
            })
            .finally(() => {
                setHasLoadedOnce(true);
            });
    }, [orderType, isUpdated, page, limit, filtersParam]);

    const loadFilterOptions = useCallback((columnName) => {
        if (!FILTERABLE_COLUMNS.has(columnName)) return;

        const otherFilters = { ...filters };
        delete otherFilters[columnName];
        const otherFiltersParam = Object.keys(otherFilters).length ? JSON.stringify(otherFilters) : undefined;

        setFilterOptionsLoading(prev => ({ ...prev, [columnName]: true }));

        fetchFilterOptions(`/api/work-order/${orderType}/filter-options/${columnName}`, {
            params: { filters: otherFiltersParam }
        })
            .then(res => {
                if (res) setFilterOptions(prev => ({ ...prev, [columnName]: res.data ?? [] }));
            })
            .finally(() => {
                setFilterOptionsLoading(prev => ({ ...prev, [columnName]: false }));
            });
    }, [orderType, filters, fetchFilterOptions]);

    useEffect(() => {
        Object.keys(filters).forEach(columnName => {
            if (FILTERABLE_COLUMNS.has(columnName) && !filterOptions[columnName]) {
                loadFilterOptions(columnName);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersParam, orderType]);

    const handleFilterApply = (columnName, selectedValues) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            const allOptions = filterOptions[columnName] || [];
            if (!selectedValues || selectedValues.length === 0 || selectedValues.length === allOptions.length) {
                delete newFilters[columnName];
            } else {
                newFilters[columnName] = selectedValues;
            }
            return newFilters;
        });
    };

    const handleRemoveFilter = (columnName) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[columnName];
            return newFilters;
        });
    };

    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded">Something went wrong</div>;

    if (loading && !hasLoadedOnce) {
        return (
            <div className="flex items-center justify-center h-full py-10">
                <Loader2 className="h-14 w-14 animate-spin text-gray-500" />
            </div>
        );
    }
    const isRefetching = loading && hasLoadedOnce;

    const handleEditRowData = async (id) => {
        const singleWorkOrderId = Array.isArray(id) ? id[0] : id;
        setLoadingDeliveries(true);
        setIsEditing(true);
        setJobId(singleWorkOrderId);
        setChangedField({});
        setDuplicateChallan([]);
        setChallanIssue([]);

        fetchData(`/api/deliveries/${orderType}`, {
            params: { workOrderIds: singleWorkOrderId }
        })
            .then(data => {
                if (data) {
                    setDeliveries(data);
                    setWorkOrderId(singleWorkOrderId);
                }
            })
            .catch(error => {
                console.error("Fetch error:", error);
            })
            .finally(() => {
                setLoadingDeliveries(false);
            });
    };

    const FACTORY_OPTIONAL_DELIVERY_TYPES = new Set([
        "Received From Compacting",
        "Received From Reprocess",
        "Received From HEAT Set",
    ]);

    const isFactoryOptional = (deliveryType) =>
        FACTORY_OPTIONAL_DELIVERY_TYPES.has(deliveryType);

    const handleEditOnChange = (yarnId, e) => {
        const { name, value } = e.target;
        setIsEditing(true);

        setChangedField(prev => {
            const rowPrev = prev[yarnId] || {};
            const updatedRow = { ...rowPrev, [name]: value };

            if (name !== "date" && updatedRow.date === undefined) {
                updatedRow.date = new Date().toISOString().split("T")[0];
            }

            if (name === "deliveryType") {
                delete updatedRow.toFactory;
                delete updatedRow.fromFactory;
                updatedRow.factoryOptional = isFactoryOptional(value);
            }

            const isAopGreyReceived = updatedRow.deliveryType === "Received From Aop";

            const deliveries = [
                { deliveryType: updatedRow.deliveryType, qty: updatedRow.deliveryQty },
                ...(updatedRow.finishReceivedQty ? [{
                    deliveryType: isAopGreyReceived ? "AOP Finish Fabric Rcvd" : "Finish Received",
                    qty: updatedRow.finishReceivedQty
                }] : []),
            ];

            return { ...prev, [yarnId]: { ...updatedRow, deliveries } };
        });
    };

    const handleSubmit = async (yarnId, workOrderId, overridePayload = null) => {
        setIsLoading(true);
        setChallanIssue([]);
        setDeliveryIssue([]);
        const payload = overridePayload || changedField[yarnId] || {};
        const singleWorkOrderId = Array.isArray(workOrderId) ? workOrderId[0] : workOrderId;

        try {
            const update = await axiosPrivate.patch(
                `/api/update-order`,
                payload,
                { params: { yarnId, workOrderId: singleWorkOrderId } }
            );

            if (update.status === 200) {
                setChallanIssue([{ message: "Delivery Added", type: "success" }]);

                await Promise.all([
                    fetchData(`/api/work-order/${orderType}`, {
                        params: { page, limit, filters: filtersParam }
                    })
                        .then((res) => {
                            if (res) {
                                setOrders(res.data ?? []);
                                if (res.pagination) setPagination(res.pagination);
                                setIsEditing(false);
                            }
                        })
                        .catch((err) => {
                            console.log("Failed to refresh orders:", err);
                            setChallanIssue(prev => [
                                ...prev,
                                { message: "Order list refresh failed", type: "error" }
                            ]);
                        }),

                    fetchData(`/api/deliveries/${orderType}`, {
                        params: { workOrderIds: singleWorkOrderId }
                    })
                        .then((dev) => {
                            setDeliveries(dev);
                        })
                        .catch((err) => {
                            console.log("Failed to refresh deliveries:", err);
                            setChallanIssue(prev => [
                                ...prev,
                                { message: "Deliveries refresh failed", type: "error" }
                            ]);
                        }),
                ]);

                setChangedField(prev => {
                    const next = { ...prev };
                    delete next[yarnId];
                    return next;
                });
            }
        } catch (e) {
            console.log(e.response?.data ?? e.message ?? e);
            const errorPayload = e.response?.data;
            setDeliveryIssue(
                Array.isArray(errorPayload)
                    ? errorPayload
                    : [{
                        message: errorPayload?.message ?? "Something went wrong. Please try again.",
                        type: "error"
                    }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearFilters = () => {
        setFilters({});
        setFilterOptions({});
    };

    const handlePDFchallanDownload = async () => {
        try {
            setIsChallanDownloading({ isLoading: true, isError: false });
            const response = await axiosPrivate.get(`/api/challan/download/${user?.id}`, {
                responseType: "blob",
            });

            const disposition = response.headers["content-disposition"];
            const match = disposition?.match(/filename="?([^"]+)"?/);
            const filename = match?.[1] ?? `challans-${Date.now()}.pdf`;

            const blob = new Blob([response.data], { type: "application/pdf" });
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setIsChallanDownloading({ isLoading: false, isError: false });
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            if (error?.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                console.error("Challan download failed:", JSON.parse(text)?.message ?? text);
                setIsChallanDownloading({ isLoading: false, isError: true });
            } else {
                console.error("Challan download failed:", error);
            }
        }
    };

    const handleSearchInputChange = (e) => setSearchTerm(e.target.value);
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') setAppliedSearchTerm(searchTerm);
        if (e.key === 'Escape') {
            setSearchTerm("");
            setAppliedSearchTerm("");
        }
    };
    const handleClearSearch = () => {
        setSearchTerm("");
        setAppliedSearchTerm("");
    };

    /* ============ EXCEL / MACRO-SHEET LOOK ============ */
    const searchBarContainerStyle = {
        display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px",
        padding: "8px 12px", backgroundColor: "#217346", borderRadius: "8px",
        border: "1px solid #14532D", boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    };
    const fxBadgeStyle = {
        background: "linear-gradient(180deg,#2E8B5F,#217346)",
        color: "#ffffff", fontWeight: 700, fontSize: 13, fontStyle: "italic",
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: "5px 10px", borderRadius: 6, border: "1px solid #1B5E3B",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)", userSelect: "none",
    };
    const searchInputWrapperStyle = { position: "relative", flex: 1 };
    const searchInputStyle = {
        width: "100%", padding: "10px 40px 10px 40px", border: "1px solid #d1d5db",
        borderRadius: "6px", fontSize: "14px", outline: "none", transition: "border-color 0.2s",
        boxSizing: "border-box", backgroundColor: "#FBFCFD",
    };
    const searchIconStyle = {
        position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
        color: "#9ca3af", pointerEvents: "none",
    };
    const clearSearchButtonStyle = {
        position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
        background: "#f3f4f6", border: "none", borderRadius: "50%", cursor: "pointer",
        color: "#6b7280", padding: "4px", display: "flex", alignItems: "center",
        justifyContent: "center", width: "24px", height: "24px", transition: "background-color 0.2s",
    };

    // Filter header styles with VERY DARK, HIGH-CONTRAST colors
    const filterHeaderStyle = {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        padding: "12px 16px",
        backgroundColor: "#F8FAFC",
        borderBottom: "2px solid #CBD5E1",
        alignItems: "center",
        minHeight: "56px",
    };

    const filterTagStyle = {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 14px",
        backgroundColor: "#0F172A",
        color: "#FFFFFF",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: "700",
        boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
        border: "1px solid #334155"
    };

    const filterTagLabelStyle = {
        fontWeight: "800",
        opacity: 1.0,
        letterSpacing: "0.5px",
    };

    const filterTagValueStyle = {
        maxWidth: "200px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontWeight: "500",
    };

    const removeFilterButtonStyle = {
        background: "rgba(255,255,255,0.2)",
        border: "none",
        borderRadius: "50%",
        width: "20px",
        height: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#FFFFFF",
        padding: "0",
        lineHeight: "1",
        transition: "background 0.2s",
    };

    const clearAllFiltersButtonStyle = {
        padding: "8px 16px",
        backgroundColor: "#DC2626",
        color: "#FFFFFF",
        border: "none",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        transition: "background 0.2s",
    };

    const filterIconStyle = {
        color: "#0F172A",
        marginRight: "4px",
    };

    const activeFiltersContainerStyle = {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flex: 1,
        flexWrap: "wrap",
    };

    return (
        <div>
            {showToast && (
                <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} duration={3000} />
            )}

            {/* Formula-bar style search */}
            <div style={searchBarContainerStyle}>
                <span style={fxBadgeStyle} title="Search (formula bar)">fx</span>
                <div style={searchInputWrapperStyle}>
                    <Search size={18} style={searchIconStyle} />
                    <input
                        type="text"
                        placeholder="Search by job no, factory, buyer, style, color, composition..."
                        value={searchTerm}
                        onChange={handleSearchInputChange}
                        onKeyDown={handleSearchKeyDown}
                        style={searchInputStyle}
                    />
                    {(searchTerm || appliedSearchTerm) && (
                        <button onClick={handleClearSearch} style={clearSearchButtonStyle} title="Clear search (Esc)">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                {isEdit?.isEditing && (
                    <button onClick={() => handleEditedSubmit()} title="Save Changes" className="bg-blue-700 text-white rounded-md p-2 text-lg">
                        <Save />
                    </button>
                )}
                {isInlineEditingLoading && (
                    <button title="Saving..." className="bg-blue-700 text-white rounded-md p-2 text-lg cursor-wait">
                        <Loader />
                    </button>
                )}
                {Object.keys(filters).length > 0 && (
                    <button onClick={() => handleClearFilters()} title="Clear Filter" className="bg-red-600 text-white rounded-md p-2 text-lg flex items-center gap-2">
                        <FunnelX /> Clear Filters
                    </button>
                )}
                {isChallanDowloading.isLoading === false && prepareForChallan?.length > 0 && (
                    <button onClick={() => handlePDFchallanDownload()} title="Download Challan" className="bg-blue-700 text-white rounded-md p-2 text-lg flex gap-2 items-center">
                        <DownloadCloudIcon /> Download Challan ({prepareForChallan?.length})
                    </button>
                )}
                {(isChallanDowloading.isLoading || isChallanDowloading.isError !== null) && (
                    <button
                        title="Download Status"
                        className={`${isChallanDowloading.isError ? "bg-red-400 text-red-700" : "bg-blue-700 text-white"} rounded-md p-2 text-lg flex gap-2 items-center`}
                    >
                        {isChallanDowloading.isLoading && <span className="animate-spin"><Loader /></span>}
                        {isChallanDowloading.isLoading === true ? "Downloading..." : isChallanDowloading.isError === true && "Download Failed"}
                    </button>
                )}
            </div>

            {/* Active Filters Header */}
            {Object.keys(filters).length > 0 && (
                <div style={filterHeaderStyle}>
                    <div style={activeFiltersContainerStyle}>
                        <Filter size={18} style={filterIconStyle} />
                        <span style={{ fontWeight: "700", color: "#0F172A", fontSize: "14px" }}>
                            Active Filters:
                        </span>
                        {Object.entries(filters).map(([columnName, values]) => {
                            const column = COLUMNS.find(c => c.inputName === columnName);
                            const columnHeader = column ? column.header : columnName;
                            const displayValues = Array.isArray(values) ? values : [values];
                            
                            return (
                                <div key={columnName} style={filterTagStyle}>
                                    <span style={filterTagLabelStyle}>{columnHeader}:</span>
                                    <span style={filterTagValueStyle}>
                                        {displayValues.length > 2 
                                            ? `${displayValues.slice(0, 2).join(", ")} +${displayValues.length - 2}`
                                            : displayValues.join(", ")
                                        }
                                    </span>
                                    <button
                                        onClick={() => handleRemoveFilter(columnName)}
                                        style={removeFilterButtonStyle}
                                        title={`Remove ${columnHeader} filter`}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.4)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    <button
                        onClick={handleClearFilters}
                        style={clearAllFiltersButtonStyle}
                        title="Clear all filters"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#B91C1C"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#DC2626"}
                    >
                        <X size={14} strokeWidth={3} />
                        Clear All
                    </button>
                </div>
            )}

            <div className="mb-5 p-2 rounded-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(!orders || orders.length < 1) && !isRefetching && <div className="text-gray-600 font-medium">No order found</div>}
                {isRefetching && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 13 }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating...</span>
                    </div>
                )}
            </div>

            <div
                className="bg-white rounded-lg border border-gray-200"
                style={{ borderTop: "3px solid #217346", overflow: "hidden" }}
            >
                <div className="order-table-wrapper" style={{ position: "relative", overflowX: "auto", overflowY: "auto", maxHeight: "80vh" }}>
                    <style>{`
                        /* ========================================== */
                        /* NUCLEAR CSS TO FORCE BLACK TEXT IN DROPDOWN*/
                        /* ========================================== */
                        .filter-dropdown-container * {
                            color: #000000 !important;
                            font-weight: 600 !important;
                            font-size: 14px !important;
                            text-shadow: none !important;
                            -webkit-font-smoothing: antialiased;
                        }
                        
                        .filter-dropdown-container input[type="text"],
                        .filter-dropdown-container input[type="search"] {
                            color: #000000 !important;
                            background-color: #ffffff !important;
                            -webkit-text-fill-color: #000000 !important;
                            border: 1px solid #d1d5db !important;
                        }
                        
                        .filter-dropdown-container input::placeholder {
                            color: #9ca3af !important;
                            -webkit-text-fill-color: #9ca3af !important;
                        }

                        .filter-dropdown-container button {
                            color: #000000 !important;
                        }

                        /* Keep OK button white text if it has a blue background */
                        .filter-dropdown-container button[class*="ok"], 
                        .filter-dropdown-container button[class*="Ok"],
                        .filter-dropdown-container button[class*="OK"] {
                            color: #ffffff !important;
                        }

                        /* ================= EXCEL / MACRO SHEET GRID ================= */
                        .order-table-wrapper table {
                            width: 100% !important;
                            table-layout: auto !important;
                            border-collapse: separate !important;
                            border-spacing: 0 !important;
                            background: #ffffff !important;
                        }
                        .order-table-wrapper th, .order-table-wrapper td {
                            text-align: center !important;
                            vertical-align: middle !important;
                            padding: 7px 10px !important;
                            box-sizing: border-box !important;
                            border-bottom: 1px solid #D9DEE5 !important;
                            border-right: 1px solid #D9DEE5 !important;
                            font-size: 13px !important;
                            color: #1F2937 !important;
                            font-variant-numeric: tabular-nums !important;
                        }

                        /* ---- FROZEN COLUMNS (1-8): keep wrap text ---- */
                        .order-table-wrapper th:nth-child(-n+8),
                        .order-table-wrapper td:nth-child(-n+8) {
                            white-space: normal !important;
                            word-break: break-word !important;
                            overflow-wrap: break-word !important;
                            overflow: visible !important;
                            text-overflow: clip !important;
                        }
                        .order-table-wrapper th:nth-child(-n+8) {
                            z-index: 20 !important;
                        }
                        .order-table-wrapper td:nth-child(-n+8) {
                            background-color: #ffffff !important;
                            z-index: 10 !important;
                        }

                        /* ---- UNFROZEN COLUMNS (9+): single line, no wrap ---- */
                        .order-table-wrapper th:nth-child(n+9),
                        .order-table-wrapper td:nth-child(n+9) {
                            white-space: nowrap !important;
                            overflow: hidden !important;
                            text-overflow: ellipsis !important;
                            min-width: 100px !important;
                            max-width: 260px !important;
                        }

                        /* ---- EXCEL-STYLE HEADER BAND ---- */
                        .order-table-wrapper thead th {
                            background: linear-gradient(180deg, #2E8B5F 0%, #217346 55%, #1B5E3B 100%) !important;
                            color: #ffffff !important;
                            font-weight: 700 !important;
                            font-size: 11.5px !important;
                            letter-spacing: .45px !important;
                            text-transform: uppercase !important;
                            border-right: 1px solid #1B5E3B !important;
                            border-bottom: 2px solid #14532D !important;
                            padding: 9px 10px !important;
                            text-shadow: 0 1px 1px rgba(0,0,0,.25);
                        }
                        .order-table-wrapper thead th button,
                        .order-table-wrapper thead th svg {
                            color: #EAF6EE !important;
                        }

                        /* ---- ZEBRA STRIPES (sheet rows) ---- */
                        .order-table-wrapper tbody tr:nth-child(even) td {
                            background-color: #F2F7F4 !important;
                        }
                        .order-table-wrapper tbody tr:nth-child(even) td:nth-child(-n+8) {
                            background-color: #F2F7F4 !important;
                        }

                        /* ---- EXCEL SELECTION HOVER ---- */
                        .order-table-wrapper tbody tr {
                            transition: background-color 0.12s ease;
                        }
                        .order-table-wrapper tbody tr:hover td {
                            background-color: #DCEFD9 !important;
                        }

                        /* ================= SHORT & EXCESS PILL ================= */
                        .se-badge {
                            display: inline-block;
                            min-width: 86px;
                            padding: 4px 14px;
                            border-radius: 9px;
                            border: 1px solid transparent;
                            font-family: "Consolas", "SF Mono", "Menlo", "Courier New", monospace;
                            font-weight: 700;
                            font-size: 13px;
                            letter-spacing: .6px;
                            line-height: 1.2;
                            text-align: center;
                            white-space: nowrap;
                            box-shadow: inset 0 1px 0 rgba(255,255,255,.6);
                        }
                        .se-neg  { background: #FCEDEF; border-color: #E5A9B4; color: #8C1D2F; }
                        .se-pos  { background: #E9F7EE; border-color: #A3D9B4; color: #17663A; }
                        .se-zero { background: #F3F4F6; border-color: #D6DAE1; color: #6B7280; }
                    `}</style>

                    {isEditing && (
                        <Modal
                            workOrderId={workOrderId}
                            isLoading={isLoading}
                            deliveriesLoading={loadingDeliveries}
                            deliveries={deliveries}
                            duplicateChallan={duplicateChallan}
                            setIsEditing={setIsEditing}
                            handleSubmit={handleSubmit}
                            handleEditOnChange={handleEditOnChange}
                            orderId={jobId}
                            orders={orders}
                            setJobId={setJobId}
                            orderType={orderType}
                            changedField={changedField}
                            challanIssue={challanIssue}
                            deliveryIssue={deliveryIssue}
                        />
                    )}

                    <table ref={tableRef}>
                        <colgroup>
                            {COLUMNS.map((col, i) => (
                                <col key={i} style={{
                                    width: `${columnWidths[i]}px`,
                                    minWidth: i < FROZEN_COUNT ? `${columnWidths[i]}px` : "100px",
                                }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr>
                                {COLUMNS.map((col, i) => {
                                    const isFilterable = col.inputName && FILTERABLE_COLUMNS.has(col.inputName);
                                    const isFrozen = i < FROZEN_COUNT;
                                    const hasActiveFilter = filters[col.inputName];
                                    
                                    return (
                                        <th
                                            key={i}
                                            style={{
                                                position: "sticky",
                                                top: 0,
                                                left: isFrozen ? `${safeFrozenLefts[i]}px` : "auto",
                                                zIndex: isFrozen ? 20 : 10,
                                                borderRight: "1px solid #1B5E3B",
                                                borderBottom: "2px solid #14532D",
                                                boxShadow: i === FROZEN_COUNT - 1 ? "3px 0 6px -1px rgba(0,0,0,0.30)" : "none",
                                                boxSizing: "border-box",
                                                backgroundColor: hasActiveFilter ? "#166534" : undefined,
                                            }}
                                        >
                                            <div style={{
                                                display: "flex", justifyContent: "center", alignItems: "center",
                                                width: "100%", gap: "4px"
                                            }}>
                                                <span style={{
                                                    textAlign: "center", flex: 1, fontWeight: 700, fontSize: "11.5px",
                                                    minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
                                                    whiteSpace: "inherit", wordBreak: "inherit"
                                                }}>{col.header}</span>
                                                {isFilterable && (
                                                    /* WRAPPED IN CONTAINER TO FORCE BLACK TEXT */
                                                    <div className="filter-dropdown-container">
                                                        <FilterDropdown
                                                            columnName={col.inputName}
                                                            uniqueValues={filterOptions[col.inputName] || []}
                                                            isLoading={!!filterOptionsLoading[col.inputName]}
                                                            selectedValues={filters[col.inputName]}
                                                            onOpen={() => {
                                                                if (!filterOptions[col.inputName]) loadFilterOptions(col.inputName);
                                                            }}
                                                            onApply={handleFilterApply}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        {orderType === "yarnDyeingOrder" && <YarnDyeOrders
                            orders={orders}
                            searchTerm={appliedSearchTerm}
                            handleEditRowData={handleEditRowData}
                            FROZEN_COUNT={FROZEN_COUNT}
                            currentFrozenWidths={safeFrozenWidths}
                            currentFrozenLefts={safeFrozenLefts}
                            isEdit={isEdit}
                            updatedFields={updatedFields}
                            handleOnChange={handleOnChange}
                            handleInlineEdit={handleInlineEdit}
                            handleRedirect={handleRedirect}
                            columnWidths={columnWidths}
                        />}
                        {orderType === "knittingOrder" && <KnittingOrder
                            orders={orders}
                            searchTerm={appliedSearchTerm}
                            setJobId={setJobId}
                            handleEditRowData={handleEditRowData}
                            FROZEN_COUNT={FROZEN_COUNT}
                            currentFrozenWidths={safeFrozenWidths}
                            currentFrozenLefts={safeFrozenLefts}
                            isEdit={isEdit}
                            updatedFields={updatedFields}
                            handleOnChange={handleOnChange}
                            handleInlineEdit={handleInlineEdit}
                            handleRedirect={handleRedirect}
                            columnWidths={columnWidths}
                        />}
                        {orderType === "dyeingOrder" && <DyeingOrder
                            orders={orders}
                            searchTerm={appliedSearchTerm}
                            handleEditRowData={handleEditRowData}
                            updatedFields={updatedFields}
                            isEdit={isEdit}
                            handleOnChange={handleOnChange}
                            handleInlineEdit={handleInlineEdit}
                            FROZEN_COUNT={FROZEN_COUNT}
                            currentFrozenWidths={safeFrozenWidths}
                            currentFrozenLefts={safeFrozenLefts}
                            handleRedirect={handleRedirect}
                            columnWidths={columnWidths}
                        />}
                        {orderType === "aopOrder" && <AopOrder
                            orders={orders}
                            searchTerm={appliedSearchTerm}
                            handleEditRowData={handleEditRowData}
                            setJobId={setJobId}
                            FROZEN_COUNT={FROZEN_COUNT}
                            currentFrozenWidths={safeFrozenWidths}
                            currentFrozenLefts={safeFrozenLefts}
                            updatedFields={updatedFields}
                            handleOnChange={handleOnChange}
                            isEdit={isEdit}
                            handleInlineEdit={handleInlineEdit}
                            handleRedirect={handleRedirect}
                            columnWidths={columnWidths}
                        />}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AllOrders;