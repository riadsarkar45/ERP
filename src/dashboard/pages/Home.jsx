import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import { Package, Palette, FileText, TrendingUp } from "lucide-react";

const Home = () => {
    const stats = [
        { label: "Total Knitting Order", value: "44,444", icon: Package, color: "text-primary-500", bg: "bg-primary-50" },
        { label: "Total Dyeing Order", value: "44,444", icon: Palette, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Total Yarn Dye Order", value: "44,444", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
        { label: "Total AOP Order", value: "44,444", icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
    ];
    const audits = [
        { label: "Completed Audits", value: "44,444", icon: Package, color: "text-primary-500", bg: "bg-primary-50" },
        { label: "Pending Audits", value: "44,444", icon: Palette, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Upcoming Audits", value: "44,444", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {audits.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-white rounded-md border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                                    <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
                                </div>
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-md`}>
                                    <Icon size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-white rounded-md border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                                    <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
                                </div>
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-md`}>
                                    <Icon size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Factories Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Factories</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {factories.map((factory, index) => (
                        <Link to={`../factory-wise-report/${factory}`}>
                            <button
                                key={index}
                                className="bg-primary-50 text-primary-500 p-3 border border-primary-200 hover:bg-primary-100 rounded-md transition-colors text-sm font-medium"
                            >
                                {factory}
                            </button>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Orders Section */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Orders</h3>
                <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Sr#</th>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Factory Name</th>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Yarn Composition</th>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Price</th>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">1</td>
                                    <td className="px-6 py-4 text-gray-700">That's It Knit</td>
                                    <td className="px-6 py-4 text-gray-700">100% Cotton 2/32</td>
                                    <td className="px-6 py-4 text-gray-700">$2,999</td>
                                    <td className="px-6 py-4 text-gray-700">231</td>
                                </tr>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">2</td>
                                    <td className="px-6 py-4 text-gray-700">Fair Apparels Ltd</td>
                                    <td className="px-6 py-4 text-gray-700">95% CTN 5% ELASTANE</td>
                                    <td className="px-6 py-4 text-gray-700">$3,499</td>
                                    <td className="px-6 py-4 text-gray-700">450</td>
                                </tr>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">3</td>
                                    <td className="px-6 py-4 text-gray-700">Tj Sweaters Ltd</td>
                                    <td className="px-6 py-4 text-gray-700">100% Polyester</td>
                                    <td className="px-6 py-4 text-gray-700">$1,899</td>
                                    <td className="px-6 py-4 text-gray-700">320</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Home;
