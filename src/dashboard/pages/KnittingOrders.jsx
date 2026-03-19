import React from 'react';
import AllOrders from '../../components/AllOrders';
import DashboardLayout from '../../components/DashboardLayout';

const KnittingOrders = () => {
    return (
        <DashboardLayout title={`Factory Report`}>
            <AllOrders 
                orderType={"knittingOrder"}
            />
        </DashboardLayout>


    );
};

export default KnittingOrders;