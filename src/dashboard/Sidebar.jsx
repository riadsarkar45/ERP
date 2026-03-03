import { Link, Outlet } from "react-router-dom";

const Sidebar = () => {
    return (
        <div className="flex h-screen w-screen overflow-hidden">

            {/* Sidebar */}
            <div className="w-60 shrink-0 bg-gray-900 text-white flex flex-col">
                <div className="p-4 text-xl font-bold border-b border-gray-700">
                    My App
                </div>
                <nav className="p-4 flex flex-col gap-2">
                    <Link className="block p-2 rounded text-white no-underline hover:bg-gray-700" to="/dashboard/home">Dashboard</Link>
                    <Link className="block p-2 rounded text-white no-underline hover:bg-gray-700" to="/dashboard/knitting-order">Knitting Orders</Link>
                    <Link className="block p-2 rounded text-white no-underline hover:bg-gray-700" to="/dashboard/yarn-dye-order">Yarn Dyeing Orders</Link>
                    <Link className="block p-2 rounded text-white no-underline hover:bg-gray-700" to="/dashboard/aop-order">AOP Orders</Link>
                    <Link className="block p-2 rounded text-white no-underline hover:bg-gray-700" to="/dashboard/new-order">Add New Order</Link>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1  flex flex-col overflow-auto">
                <div className="p-6">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Sidebar;