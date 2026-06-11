import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import Table from "../../components/Table";
import { Package, Palette, FileText, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import useAxiosPublic from "../../hooks/Axios";

const Home = () => {
    const [countOrders, setCountOrders] = useState({})
    const axiosPublic = useAxiosPublic();
    const [aud, setAudits] = useState({
        audits: 0,
        upComing: 0,
        pending: 0,

    })

    useEffect(() => {
        const countOrders = async () => {
            const res = await axiosPublic.get("api/dashboard-detail")
            console.log(res.data);
            // setAudits({ audits: res?.data?.audits, upComing: res?.data?.upComing, pending: res?.data?.pending });
            // setCountOrders(res?.data?.data);
        }
        countOrders();
    }, [axiosPublic])
    const stats = [
        {
            label: "Knitting Order",
            value: countOrders.knittingOrder || 0,
            icon: Package,
            color: "text-primary-500",
            bg: "bg-primary-50",
            borderColor: "border-primary-500",
            bgOpacity: "bg-primary-500/10",
            borderOpacity: "border-primary-500/10"
        },

        {
            label: "Fabric Booking",
            value: countOrders.fabricBookingOrder || 0,
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
        { label: "Completed Audits", value: aud?.audits || 0, icon: Package, color: "text-primary-500", bg: "bg-primary-50", borderColor: "border-primary-500", bgOpacity: "bg-primary-500/10", borderOpacity: "border-primary-500/10" },
        { label: "Pending Audits", value: aud?.pending || 0, icon: Palette, color: "text-blue-600", bg: "bg-blue-50", borderColor: "border-blue-600", bgOpacity: "bg-blue-600/10", borderOpacity: "border-blue-600/10" },
        { label: "Upcoming Audits", value: aud?.upComing || 0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", borderColor: "border-green-600", bgOpacity: "bg-green-600/10", borderOpacity: "border-green-600/10" },
    ];

    // const factories = [
    //     "That's It Knit",
    //     "Fair Apparels Ltd",
    //     "Tj Sweaters Ltd",
    //     "Winter Dress Ltd",
    //     "Optimum Sourcing",
    //     "Styletex Ltd",
    //     "Fashion Knitwear",
    //     "Textile Solutions",
    //     "Global Knits"
    // ];

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

        </DashboardLayout>
    );
};

export default Home;