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

const routers = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            {
                path: "/",
                element: <h1>Login</h1>
            },
            {
                path: "/dashboard",
                element: <Sidebar />,
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
                    },
                    {
                        path: "fabric-booking-order",
                        element: <FabricDyeOrder />
                    },
                    {
                        path: "style-requirement",
                        element: <Summary />
                    },
                ]
            }
        ]
    }
]);

export default routers;