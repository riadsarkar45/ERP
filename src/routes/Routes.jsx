import { createBrowserRouter, Navigate } from "react-router-dom";
import Root from "../root/Root";
import Sidebar from "../dashboard/Sidebar";
import Home from "../dashboard/pages/Home";
import KnittingOrders from "../dashboard/pages/KnittingOrders";
import NewOrder from "../dashboard/pages/NewOrder";
import FactoryWiseReport from "../dashboard/pages/FactoryWiseReport";
import AopOrders from "../dashboard/pages/AopOrders";
import YarnDyeOrders from "../dashboard/pages/YarnDyeOrders";
import CreateNewAudit from "../dashboard/pages/audit/CreateNewAudit";
import Login from "../auth/Login";
import ProtectedRoute from "../components/ProtectedRoute";

const routers = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            {
                path: "/",
                element: <Navigate to="/login" replace />
            },
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
                        path: "",
                        element: <Navigate to="/dashboard/home" replace />
                    },
                    {
                        path: "home",
                        element: <Home />
                    },
                    {
                        path: "knitting-order",
                        element: <KnittingOrders />
                    },
                    {
                        path: "yarn-dye-order",
                        element: <div className="p-6"><h2 className="text-2xl font-semibold">Yarn Dyeing Orders</h2><p className="text-gray-600 mt-2">Coming soon...</p></div>
                    },
                    {
                        path: "aop-order",
                        element: <div className="p-6"><h2 className="text-2xl font-semibold">AOP Orders</h2><p className="text-gray-600 mt-2">Coming soon...</p></div>
                    },
                    {
                        path: "new-order",
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
                    }
                ]
            }
        ]
    }
]);

export default routers;