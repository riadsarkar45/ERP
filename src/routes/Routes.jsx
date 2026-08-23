import { createBrowserRouter } from "react-router-dom";
import Root from "../root/Root";
import Sidebar from "../dashboard/Sidebar";
import Home from "../dashboard/pages/Home";
import KnittingOrders from "../dashboard/pages/KnittingOrders";
import NewOrder from "../dashboard/pages/NewOrder";
import FactoryWiseReport from "../dashboard/pages/FactoryWiseReport";
import AopOrders from "../dashboard/pages/AopOrders";
import YarnDyeOrders from "../dashboard/pages/YarnDyeOrders";
import CreateNewAudit from "../dashboard/pages/audit/CreateNewAudit";
import FabricDyeOrder from "../dashboard/pages/FabricDyeOrder";
import Summary from "../dashboard/pages/styleSummary/Summary";
import AllAudits from "../dashboard/pages/audit/AllAudits";
import Jobs from "../dashboard/pages/jobs/Jobs";
import Cutting from "../dashboard/pages/cutting/DailyFabricCutting";
import DailyFabricCutting from "../dashboard/pages/cutting/DailyFabricCutting";
import ApiMonitoring from "../dashboard/pages/monitoring/ApiMonitoring";
import DyeingOrders from "../dashboard/pages/DyeingOrders";
import UploadFile from "../dashboard/pages/upload/UploadFile";
import Login from "../dashboard/pages/users/login/Login";
import AddNewUser from "../dashboard/pages/users/addNewUser/AddNewUser";
import ProtectedRoute from "../dashboard/auth/ProtectedRoute";
import PartyWiseView from "../dashboard/pages/partyWiseView/PartyWiseView";
import Aop from "../dashboard/pages/movement/Aop";
import Dyeing from "../dashboard/pages/movement/Dyeing";
import Knitting from "../dashboard/pages/movement/Knitting";
import GlanceReport from "../dashboard/pages/MIS/GlanceReport";
import Reconciliation from "../dashboard/pages/reconciliation/Reconciliation";
import Compacting from "../dashboard/pages/movement/others/Compacting";
import ReProcess from "../dashboard/pages/movement/others/ReProcess";
import PurchaseOrderStatus from "../dashboard/pages/yarnstock/PurchaseOrderStatus";
import YarnMovementReport from "../dashboard/pages/yarnstock/MovementReport";
import StockStaus from "../dashboard/pages/yarnstock/StockStatus";
import YarnDyedMovement from "../dashboard/pages/yarnstock/YarnDyedMovement";
import YarnDyedStock from "../dashboard/pages/yarnstock/YarnDyedStock";
import BalanceSheet from "../dashboard/pages/reconciliation/JobWiseBalance";

const routers = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            {
                path: "/login",
                element: <Login />
            },
            {
                path: "/dashboard",
                element: (
                    <ProtectedRoute>
                        <Sidebar />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        path: "home",
                        element: <Home />
                    },
                    {
                        path: "knitting-order",
                        element: <KnittingOrders />
                    },
                    {
                        path: "new-order/:jobNumber",
                        element: <NewOrder />
                    },
                    {
                        path: "factory-wise-report/:factoryName",
                        element: <FactoryWiseReport />
                    },
                    {
                        path: "aop-order",
                        element: <AopOrders />
                    },
                    {
                        path: "yarn-dye-order",
                        element: <YarnDyeOrders />
                    },
                    {
                        path: "new-audit",
                        element: <CreateNewAudit />
                    },
                    {
                        path: "fabric-booking-order",
                        element: <FabricDyeOrder />
                    },
                    {
                        path: "style-requirement",
                        element: <Summary />
                    },
                    {
                        path: "audits",
                        element: <AllAudits />
                    },
                    {
                        path: "jobs",
                        element: <Jobs />
                    },
                    {
                        path: "cutting",
                        element: <DailyFabricCutting />
                    },
                    {
                        path: "monitoring",
                        element: <ApiMonitoring />
                    },
                    {
                        path: "dyeing-order",
                        element: <DyeingOrders />
                    },
                    {
                        path: "upload",
                        element: <UploadFile />
                    },
                    {
                        // ADJUST allowed roles if AUDITOR (or another role) should also manage users
                        path: "new-user",
                        element: (
                            <ProtectedRoute allowedRoles={["SUPER ADMIN", "ADMIN"]}>
                                <AddNewUser />
                            </ProtectedRoute>
                        )
                    },
                    {
                        // ADJUST allowed roles if AUDITOR (or another role) should also manage users
                        path: "party-wise-view",
                        element: (
                            <ProtectedRoute allowedRoles={["SUPER ADMIN", "ADMIN"]}>
                                <PartyWiseView />
                            </ProtectedRoute>
                        )
                    },
                    {
                        path: "challan/aop",
                        element: <Aop />
                    },
                    {
                        path: "challan/dyeing",
                        element: <Dyeing />
                    },
                    {
                        path: "challan/knitting",
                        element: <Knitting />
                    },
                    {
                        path: "challan/others/compacting",
                        element: <Compacting />
                    },
                    {
                        path: "challan/others/re-process",
                        element: <ReProcess />
                    },

                    {
                        path: "mis/glance",
                        element: <GlanceReport />
                    },
                    {
                        path: "style/reconciliation",
                        element: <Reconciliation />
                    },
                    {
                        path: "yarn",
                        element: <PurchaseOrderStatus/>
                    },
                    {
                        path: "yarn/movement",
                        element: <YarnMovementReport/>
                    },
                    {
                        path: "yarn/stock",
                        element: <StockStaus/>
                    },
                    {
                        path: "yarndyed/movement",
                        element: <YarnDyedMovement/>
                    },
                    {
                        path: "yarndyed/stock",
                        element: <YarnDyedStock/>
                    },
                    {
                        path: "balance-sheet",
                        element: <BalanceSheet/>
                    },
                ]
            }
        ]
    }
]);

export default routers;