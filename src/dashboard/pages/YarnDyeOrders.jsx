import AllOrders from "../../components/AllOrders";
import DashboardLayout from "../../components/DashboardLayout";

const YarnDyeOrders = () => {
    return (
        <DashboardLayout>
            <AllOrders
                orderType={"yarnDyeingOrder"}
            />
        </DashboardLayout>
    );
};

export default YarnDyeOrders;