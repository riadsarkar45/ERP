import React from 'react';
import AllOrders from '../../components/AllOrders';
import DashboardLayout from '../../components/DashboardLayout';

const DyeingOrders = () => {
    return (
        <DashboardLayout title={`Factory Report`}>
            <AllOrders 
                orderType={"dyeingOrder"}
            />
        </DashboardLayout>


    );
};

export default DyeingOrders;