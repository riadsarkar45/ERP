import React from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import AllOrders from '../../components/AllOrders';

const FabricDyeOrder = () => {
    return (
        <DashboardLayout title="Dashboards">
            <AllOrders
                orderType={"fabricBookingOrder"}
            />
        </DashboardLayout>
    );
};

export default FabricDyeOrder;