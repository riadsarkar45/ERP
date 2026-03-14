import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import Table from "../../components/Table";
import { Package, Palette, FileText, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import useAxiosPublic from "../../hooks/Axios";

const Home = () => {
    const [countOrders, setCountOrders] = useState({})
    const axiosPublic = useAxiosPublic();

    useEffect(() => {
        const countOrders = async () => {
            const res = await axiosPublic.get("api/dashboard-detail")
            console.log(res.data.data);
            setCountOrders(res.data.data);
        }
        countOrders();
    }, [axiosPublic])
    const stats = [
        {
            label: "Knitting Order",
            value: countOrders.yarnDyeingOrder || 0,
            icon: Package,
            color: "text-primary-500",
            bg: "bg-primary-50",
            borderColor: "border-primary-500",
            bgOpacity: "bg-primary-500/10",
            borderOpacity: "border-primary-500/10"
        },
        
        {
            label: "Fabric Booking",
            value: countOrders.dyeingOrder || 0,
            icon: Palette,
            color: "text-blue-600",
            bg: "bg-blue-50",
            borderColor: "border-blue-600",
            bgOpacity: "bg-blue-600/10",
            borderOpacity: "border-blue-600/10"
        },
        {
            label: "Yarn Dye Order",
            value: countOrders.yarnDyeingOrder || 0,
            icon: TrendingUp,
            color: "text-green-600",
            bg: "bg-green-50",
            borderColor: "border-green-600",
            bgOpacity: "bg-green-600/10",
            borderOpacity: "border-green-600/10"
        },
        {
            label: "AOP Order",
            value: countOrders.aopOrder || 0,
            icon: FileText,
            color: "text-purple-600",
            bg: "bg-purple-50",
            borderColor: "border-purple-600",
            bgOpacity: "bg-purple-600/10",
            borderOpacity: "border-purple-600/10"
        },
    ];
    const audits = [
        { label: "Completed Audits", value: "44,444", icon: Package, color: "text-primary-500", bg: "bg-primary-50", borderColor: "border-primary-500", bgOpacity: "bg-primary-500/10", borderOpacity: "border-primary-500/10" },
        { label: "Pending Audits", value: "44,444", icon: Palette, color: "text-blue-600", bg: "bg-blue-50", borderColor: "border-blue-600", bgOpacity: "bg-blue-600/10", borderOpacity: "border-blue-600/10" },
        { label: "Upcoming Audits", value: "44,444", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", borderColor: "border-green-600", bgOpacity: "bg-green-600/10", borderOpacity: "border-green-600/10" },
    ];

    const factories = [
        "That's It Knit",
        "Fair Apparels Ltd",
        "Tj Sweaters Ltd",
        "Winter Dress Ltd",
        "Optimum Sourcing",
        "Styletex Ltd",
        "Fashion Knitwear",
        "Textile Solutions",
        "Global Knits"
    ];

    return (
        <DashboardLayout title="Dashboard">
            {/* AUDIT STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {audits.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className={`${stat.bgOpacity} rounded-lg border ${stat.borderOpacity} px-6 py-8`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                                    <p className={`text-xl font-normal ${stat.color}`}>{stat.value}</p>
                                </div>
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
                                    <Icon size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className={`${stat.bgOpacity} rounded-lg border ${stat.borderOpacity} px-6 py-8`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                                    <p className={`text-xl font-normal ${stat.color}`}>{stat.value}</p>
                                </div>
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
                                    <Icon size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Factories Section */}
            <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-800 mb-3">Factories</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {factories.map((factory, index) => (
                        <Link key={index} to={`/dashboard/factory-wise-report/${factory}`}>
                            <button
                                className="w-full bg-primary-50 text-gray-700 py-3 px-3 border border-gray-200 hover:border-gray-200 hover:bg-primary-100 hover:text-primary-600 rounded-lg transition-all text-sm font-medium text-center"
                            >
                                {factory}
                            </button>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Orders Section */}
            <div>
                <h3 className="text-base font-semibold text-gray-800 mb-3">Recent Orders</h3>
                <Table
                    columns={[
                        { header: "Sr#", accessor: "sr", render: (row) => <span className="font-medium text-gray-900">{row.sr}</span> },
                        { header: "Factory Name", accessor: "factory" },
                        { header: "Yarn Composition", accessor: "yarn" },
                        { header: "Price", accessor: "price" },
                        { header: "Qty", accessor: "qty" }
                    ]}
                    data={[
                        { sr: 1, factory: "That's It Knit", yarn: "100% Cotton 2/32", price: "$2,999", qty: "231" },
                        { sr: 2, factory: "Fair Apparels Ltd", yarn: "95% CTN 5% ELASTANE", price: "$3,499", qty: "450" },
                        { sr: 3, factory: "Tj Sweaters Ltd", yarn: "100% Polyester", price: "$1,899", qty: "320" }
                    ]}
                    emptyMessage="No recent orders"
                />
            </div>
        </DashboardLayout>
    );
};

export default Home;