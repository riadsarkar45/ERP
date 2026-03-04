import { createBrowserRouter } from "react-router-dom";
import Root from "../root/Root";
import Sidebar from "../dashboard/Sidebar";
import Home from "../dashboard/pages/Home";
import KnittingOrders from "../dashboard/pages/KnittingOrders";
import NewOrder from "../dashboard/pages/NewOrder";
import FactoryWiseReport from "../dashboard/pages/FactoryWiseReport";

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
                    }
                ]
            }
        ]
    }
]);

export default routers;