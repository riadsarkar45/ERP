import { useEffect, useState, useCallback, useMemo, useContext } from "react";
import { DownloadCloudIcon, FunnelX, Loader, Loader2, Save, Search, X } from "lucide-react";
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

// ---- Responsive column scaling (replaces the old localStorage width cache) ----
// Breakpoints are bucketed on purpose so a resize doesn't fire on every pixel
// (that would thrash the layout and reset the table constantly).
const getScaleForWidth = (width) => {
    if (width >= 1600) return 1;
    if (width >= 1440) return 0.9;
    if (width >= 1280) return 0.8;
    if (width >= 1100) return 0.72;
    return 0.65; // small laptops (~1024px and narrower)
};

const useViewportScale = () => {
    const [scale, setScale] = useState(() =>
        typeof window === "undefined" ? 1 : getScaleForWidth(window.innerWidth)
    );

    useEffect(() => {
        let timeout;
        const onResize = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                setScale(getScaleForWidth(window.innerWidth));
            }, 150);
        };
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
            clearTimeout(timeout);
        };
    }, []);

    return scale;
};

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

    // Search state
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
    const [isChallanDowloading, setIsChallanDownloading] = useState({ isLoading: false, isError: null })
    const [limit] = useState(10);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    const { handleInlineEdit, changedField: updatedFields, toastType, toastMessage, setShowToast, showToast, isInlineEditingLoading, handleOnChange, isEdit, isUpdated, handleEditedSubmit } = InlineEdit();
    const { fetchData, error, loading } = useFetchData();
    const { fetchData: fetchFilterOptions } = useFetchData();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const scale = useViewportScale();
    // 70px floor keeps text from clipping badly at the smallest breakpoint
    const w = useCallback((px) => Math.max(70, Math.round(px * scale)), [scale]);

    const COLUMNS = useMemo(() => {
        const cols = [];
        const defaultWidths = [120, 270, 160, 220, 300, 200, 400, 290].map(w);

        if (orderType === "knittingOrder") {
            cols.push(
                { header: "MONTH", width: defaultWidths[0], inputName: "month" },
                { header: "FACTORY NAME", width: defaultWidths[1], inputName: "factoryName" },
                { header: "WORK ORDER NO", width: defaultWidths[2], inputName: "workOrderNo" },
                { header: "BUYER NAME", width: defaultWidths[3], inputName: "buyerName" },
                { header: "JOB NO.", width: defaultWidths[4], inputName: "jobNo" },
                { header: "STYLE", width: defaultWidths[5], inputName: "styleNo" },
                { header: "COLOR", width: defaultWidths[6], inputName: "color" },
                { header: "COMPOSITION", width: defaultWidths[7], inputName: "composition" },
                { header: "FINISH DIA", width: w(120), inputName: "finishdia" },
                { header: "YARN COUNT", width: w(160), inputName: "yarnCount" },
                { header: "YARN LOT", width: w(200), inputName: "yarnLot" },
                { header: "STITCH LENGHT", width: w(200), inputName: "stitchLength" },
                { header: "M/C DIA", width: w(200), inputName: "m/cDia" },
                { header: "WORK ORDER QTY", width: w(140), inputName: "workOrderQty" },
                { header: "YARN DELIVERY", width: w(140), inputName: "totalYarnDelivery" },
                { header: "DEL. SHORT & EXCESS", width: w(150) },
                { header: "YARN RETURN RECEIVED", width: w(160) },
                { header: "GREY RECEIVED", width: w(140) },
                { header: "RCVD SHORT & EXCESS", width: w(150) },
                { header: "PRICE PER KG", width: w(120), inputName: "unitePrice" },
                { header: "PAYABLE AMOUNT", width: w(140) },
                { header: "PAID BILLING AMOUNT", width: w(150) },
                { header: "PENDING BILLING AMOUNT", width: w(160) },
            );
        } else if (orderType === "dyeingOrder") {
            cols.push(
                { header: "MONTH", width: defaultWidths[0], inputName: "month" },
                { header: "FACTORY NAME", width: defaultWidths[1], inputName: "factoryName" },
                { header: "WORK ORDER NO", width: defaultWidths[2], inputName: "workOrderNo" },
                { header: "BUYER NAME", width: defaultWidths[3], inputName: "buyerName" },
                { header: "JOB NO.", width: defaultWidths[4], inputName: "jobNo" },
                { header: "STYLE", width: defaultWidths[5], inputName: "styleNo" },
                { header: "COLOR", width: defaultWidths[6], inputName: "bookingColor" },
                { header: "COMPOSITION", width: defaultWidths[7], inputName: "composition" },
                { header: "FINISH DIA", width: w(150), inputName: "finishdia" },
                { header: "YARN COUNT", width: w(200), inputName: "yarncount" },
                { header: "YARN LOT", width: w(200), inputName: "yarnlot" },
                { header: "STICH LENGHT  ", width: w(200), inputName: "stichLenght" },
                { header: "MACHINE DIA", width: w(200), inputName: "machineDia" },
                { header: "SHADE %", width: w(200), inputName: "shade%" },
                { header: "DYEING WORK ORDER QTY", width: w(180), inputName: "workOrderQty" },
                { header: "GREY DELIVERY", width: w(140), inputName: "greyReceived" },
                { header: "DELIVERY SHORT & EXCESS", width: w(180), inputName: "greyReceived" },
                { header: "GREY RETURN RECEIVE", width: w(160), inputName: "greyReturn" },
                { header: "GREY RECEIVED FROM DYEING", width: w(190), inputName: "greyReturn" },
                { header: "FINISH FABRIC RECEIVED", width: w(170), inputName: "greyReturn" },
                { header: "BALANCE", width: w(110), inputName: "greyReturn" },
                { header: "PRICE PER KG", width: w(120), inputName: "unitePrice" },
                { header: "TOTAL SENT FOR COMPACTING", width: w(190), inputName: "sentForCompacting" },
                { header: "TOTAL RECEIVED FROM COMPACTING", width: w(210), inputName: "receivedFromCompacting" },
                { header: "TOTAL BILLING AMOUNT", width: w(170), inputName: "unitePrice" },
                { header: "PAYABLE AMOUNT", width: w(140), inputName: "unitePrice" },
                { header: "PENDING BILLING AMOUNT", width: w(170), inputName: "unitePrice" },
            );
        } else if (orderType === "yarnDyeingOrder") {
            cols.push(
                { header: "MONTH", width: defaultWidths[0], inputName: "month" },
                { header: "FACTORY NAME", width: defaultWidths[1], inputName: "factoryName" },
                { header: "WORK ORDER NO", width: defaultWidths[2], inputName: "workOrderNo" },
                { header: "BUYER NAME", width: defaultWidths[3], inputName: "buyerName" },
                { header: "JOB NO.", width: defaultWidths[4], inputName: "jobNo" },
                { header: "STYLE", width: defaultWidths[5], inputName: "styleNo" },
                { header: "BOOKING COLOR", width: defaultWidths[6], inputName: "bookingColor" },
                { header: "COMPOSITION", width: defaultWidths[7], inputName: "composition" },
                { header: "FINISH DIA", width: w(150), inputName: "finishDia" },
                { header: "SHADE (%)", width: w(200), inputName: "shade(%)" },
                { header: "COLOR WISE ORDER QTY", width: w(180), inputName: "orderColor" },
                { header: "PRICE PER KG", width: w(120), inputName: "unitePrice" },
                { header: "YARN DELIVERY FOR Y/D", width: w(170), inputName: "yarnDeliveryForYd" },
                { header: "DEL.SHORT & EXCESS", width: w(160) },
                { header: "YARN RETURN RECEIVED", width: w(170), inputName: "yarnReturnReceived" },
                { header: "YARN RECEIVED FROM Y/D", width: w(180), inputName: "greyReceivedFromYd" },
                { header: "FINISH YARN RECEIVED", width: w(170), inputName: "finishReceived" },
                { header: "FINISH RETURN", width: w(140), inputName: "finishReturn" },
                { header: "YARN STOCK", width: w(130) },
            );
        } else if (orderType === "aopOrder") {
            cols.push(
                { header: "MONTH", width: defaultWidths[0], inputName: "month" },
                { header: "FACTORY NAME", width: defaultWidths[1], inputName: "factoryName" },
                { header: "WORK ORDER NO", width: defaultWidths[2], inputName: "workOrderNo" },
                { header: "BUYER NAME", width: defaultWidths[3], inputName: "buyerName" },
                { header: "JOB NO.", width: defaultWidths[4], inputName: "jobNo" },
                { header: "STYLE", width: defaultWidths[5], inputName: "styleNo" },
                { header: "COLOR", width: defaultWidths[6], inputName: "color" },
                { header: "COMPOSITION", width: defaultWidths[7], inputName: "composition" },
                { header: "FINISH DIA", width: w(200), inputName: "finishDia" },
                { header: "WORK ORDER QTY", width: w(140), inputName: "workOrderQty" },
                { header: "SENT FOR AOP", width: w(140), inputName: "totalYarnDelivery" },
                { header: "DEL. SHORT & EXCESS", width: w(150) },
                { header: "RETURN FROM AOP", width: w(150) },
                { header: "RECEIVED FROM AOP", width: w(150) },
                { header: "FINISH AFTER AOP", width: w(150) },
                { header: "PARTY BALANCE", width: w(170) },
                { header: "PRICE PER KG", width: w(120), inputName: "unitePrice" },
                { header: "PAYABLE AMOUNT", width: w(140) },
                { header: "PAID BILLING AMOUNT", width: w(150) },
                { header: "PENDING BILLING AMOUNT", width: w(160) },
            );
        }
        return cols;
    }, [orderType, w]);

    // No more localStorage cache — columnWidths is just COLUMNS' widths, kept in
    // state only so header/col/body all read from one array during a render pass.
    const [columnWidths, setColumnWidths] = useState(() => COLUMNS.map(c => c.width));

    useEffect(() => {
        setColumnWidths(COLUMNS.map(c => c.width));
    }, [COLUMNS]);

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

    const currentFrozenWidths = columnWidths.slice(0, FROZEN_COUNT);
    const currentFrozenLefts = currentFrozenWidths.reduce((acc, w, i) => {
        if (i === 0) return [0];
        return [...acc, acc[i - 1] + currentFrozenWidths[i - 1]];
    }, []);

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
        Object.keys(filterOptions).forEach(columnName => {
            if (FILTERABLE_COLUMNS.has(columnName)) loadFilterOptions(columnName);
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
            setIsChallanDownloading({ isLoading: true, isError: false })
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
            setIsChallanDownloading({ isLoading: false, isError: false })
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            if (error?.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                console.error("Challan download failed:", JSON.parse(text)?.message ?? text);
                setIsChallanDownloading({ isLoading: false, isError: true })
            } else {
                console.error("Challan download failed:", error);
            }
        }
    };

    // SEARCH BAR HANDLERS
    const handleSearchInputChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            setAppliedSearchTerm(searchTerm);
        }
        if (e.key === 'Escape') {
            setSearchTerm("");
            setAppliedSearchTerm("");
        }
    };

    const handleClearSearch = () => {
        setSearchTerm("");
        setAppliedSearchTerm("");
    };

    // SEARCH BAR STYLES
    const searchBarContainerStyle = {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "12px",
        padding: "8px 12px",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    };

    const searchInputWrapperStyle = {
        position: "relative",
        flex: 1,
    };

    const searchInputStyle = {
        width: "100%",
        padding: "10px 40px 10px 40px",
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        fontSize: "14px",
        outline: "none",
        transition: "border-color 0.2s",
        boxSizing: "border-box",
    };

    const searchIconStyle = {
        position: "absolute",
        left: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#9ca3af",
        pointerEvents: "none",
    };

    const clearSearchButtonStyle = {
        position: "absolute",
        right: "8px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "#f3f4f6",
        border: "none",
        borderRadius: "50%",
        cursor: "pointer",
        color: "#6b7280",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        transition: "background-color 0.2s",
    };

    const searchLabelStyle = {
        fontSize: "13px",
        fontWeight: 600,
        color: "#374151",
        whiteSpace: "nowrap",
    };

    return (
        <div>
            {showToast && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setShowToast(false)}
                    duration={3000}
                />
            )}

            {/* SEARCH BAR ABOVE TABLE */}
            <div style={searchBarContainerStyle}>
                <span style={searchLabelStyle}>Search:</span>
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
                        <button
                            onClick={handleClearSearch}
                            style={clearSearchButtonStyle}
                            title="Clear search (Esc)"
                        >
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
                    <button onClick={() => handleClearFilters()} title="Clear Filter" className="bg-blue-700 text-white rounded-md p-2 text-lg">
                        <FunnelX />
                    </button>
                )}
                {isChallanDowloading.isLoading === false && prepareForChallan?.length > 0 && (
                    <button onClick={() => handlePDFchallanDownload()} title="Download Challan" className="bg-blue-700 text-white rounded-md p-2 text-lg flex gap-2 items-center">
                        <DownloadCloudIcon /> Download Challan ({prepareForChallan?.length})
                    </button>
                )}

                {(isChallanDowloading.isLoading ||
                    isChallanDowloading.isError !== null) && (
                        <button
                            title="Download Status"
                            className={`${isChallanDowloading.isError
                                    ? "bg-red-400 text-red-700"
                                    : "bg-blue-700 text-white"
                                } rounded-md p-2 text-lg flex gap-2 items-center`}
                        >
                            {isChallanDowloading.isLoading && (
                                <span className="animate-spin">
                                    <Loader />
                                </span>
                            )}

                            {isChallanDowloading.isLoading === true
                                ? "Downloading..."
                                : isChallanDowloading.isError === true
                                    && "Download Failed"}
                        </button>
                    )}
            </div>

            <div className="mb-5 p-2 rounded-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(!orders || orders.length < 1) && !isRefetching && <div>No order found</div>}
                {isRefetching && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 13 }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating...</span>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
                <div
                    className="order-table-wrapper"
                    style={{ position: "relative", overflowX: "auto", overflowY: "auto", maxHeight: "80vh" }}
                >
                    <style>{`
                        .order-table-wrapper table { 
                            width: max-content !important; 
                            table-layout: auto !important; 
                            border-collapse: separate !important;
                            border-spacing: 0 !important;
                        }
                        
                        .order-table-wrapper th,
                        .order-table-wrapper td {
                            text-align: center !important;
                            vertical-align: middle !important;
                            padding: 8px 12px !important;
                            box-sizing: border-box !important;
                            border-bottom: 1px solid #d1d5db !important;
                            border-right: 1px solid #d1d5db !important;
                        }

                        /* FROZEN COLUMNS */
                        .order-table-wrapper th:nth-child(-n+8),
                        .order-table-wrapper td:nth-child(-n+8) {
                            white-space: nowrap !important;
                            width: var(--col-width) !important;
                            min-width: var(--col-width) !important;
                            max-width: var(--col-width) !important;
                            overflow: visible !important;
                            text-overflow: clip !important;
                        }

                        .order-table-wrapper th:nth-child(-n+8) {
                            background-color: #f3f4f6 !important;
                            z-index: 20 !important;
                        }
                        .order-table-wrapper td:nth-child(-n+8) {
                            background-color: #ffffff !important;
                            z-index: 10 !important;
                        }

                        .order-table-wrapper th:nth-child(n+9),
                        .order-table-wrapper td:nth-child(n+9) {
                            white-space: nowrap !important;
                            min-width: 100px !important;
                        }
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

                    <table>
                        <colgroup>
                            {COLUMNS.map((col, i) => (
                                <col key={i} style={{
                                    width: `${columnWidths[i]}px`,
                                    minWidth: `${columnWidths[i]}px`,
                                    maxWidth: `${columnWidths[i]}px`
                                }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr>
                                {COLUMNS.map((col, i) => {
                                    const isFilterable = col.inputName && FILTERABLE_COLUMNS.has(col.inputName);
                                    const isFrozen = i < FROZEN_COUNT;
                                    return (
                                        <th
                                            key={i}
                                            style={{
                                                position: "sticky",
                                                top: 0,
                                                left: isFrozen ? `${currentFrozenLefts[i]}px` : "auto",
                                                zIndex: isFrozen ? 20 : 10,
                                                backgroundColor: "#f3f4f6",
                                                borderRight: "1px solid #d1d5db",
                                                borderBottom: "2px solid #9ca3af",
                                                boxShadow: i === FROZEN_COUNT - 1 ? "2px 0 5px -1px rgba(0,0,0,0.18)" : "none",
                                                boxSizing: "border-box",
                                                '--col-width': `${columnWidths[i]}px`,
                                            }}
                                        >
                                            <div style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                width: "100%",
                                                overflow: "visible",
                                                textOverflow: "clip",
                                                whiteSpace: "nowrap"
                                            }}>
                                                <span style={{
                                                    textAlign: "center",
                                                    whiteSpace: "nowrap",
                                                    overflow: "visible",
                                                    textOverflow: "clip",
                                                    flex: 1,
                                                    fontWeight: 600,
                                                    fontSize: "13px",
                                                }}>{col.header}</span>
                                                {isFilterable && (
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
                            currentFrozenWidths={currentFrozenWidths}
                            currentFrozenLefts={currentFrozenLefts}
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
                            currentFrozenWidths={currentFrozenWidths}
                            isEdit={isEdit}
                            updatedFields={updatedFields}
                            handleOnChange={handleOnChange}
                            handleInlineEdit={handleInlineEdit}
                            handleRedirect={handleRedirect}
                            currentFrozenLefts={currentFrozenLefts}
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
                            currentFrozenWidths={currentFrozenWidths}
                            handleRedirect={handleRedirect}
                            currentFrozenLefts={currentFrozenLefts}
                            columnWidths={columnWidths}
                        />}
                        {orderType === "aopOrder" &&
                            <AopOrder
                                orders={orders}
                                searchTerm={appliedSearchTerm}
                                handleEditRowData={handleEditRowData}
                                setJobId={setJobId}
                                FROZEN_COUNT={FROZEN_COUNT}
                                currentFrozenWidths={currentFrozenWidths}
                                updatedFields={updatedFields}
                                handleOnChange={handleOnChange}
                                isEdit={isEdit}
                                handleInlineEdit={handleInlineEdit}
                                handleRedirect={handleRedirect}
                                currentFrozenLefts={currentFrozenLefts}
                                columnWidths={columnWidths}
                            />}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AllOrders;