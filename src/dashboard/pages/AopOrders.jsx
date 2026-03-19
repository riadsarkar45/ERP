import React from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import AllOrders from '../../components/AllOrders';

const AopOrders = () => {
    return (
        <DashboardLayout>
            <div>
                <AllOrders
                    orderType={"aopOrder"}
                />
            </div>
        </DashboardLayout>
    );
};

export default AopOrders;