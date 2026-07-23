import { Link, Outlet, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import {
    LayoutDashboard,
    Package,
    FileText,
    PlusCircle,
    PanelLeftOpen,
    PanelRightOpen,
    X,
    Bell,
    Scissors,
    ChevronDown,
    ChevronRight,
    UserRoundPlus,
} from "lucide-react";
import { AuthContext, AuthProvider } from "./auth/AuthContext";

const Sidebar = () => {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isOrdersOpen, setIsOrdersOpen] = useState(false);
    const [isMovementOpen, setIsMovementOpen] = useState(false);
    const isActive = (path) => location.pathname === path;
    const { user } = useContext(AuthContext)
    const orderSubItems = [
        { path: "/dashboard/knitting-order", label: "Knitting Orders", icon: Package },
        { path: "/dashboard/dyeing-order", label: "Dyeing Orders", icon: Package },
        { path: "/dashboard/yarn-dye-order", label: "Yarn Dyeing Orders", icon: Package },
        { path: "/dashboard/aop-order", label: "AOP Orders", icon: Package },
    ];
    const movementSubItems = [
        { path: "/dashboard/challan/aop", label: "Aop", icon: Package },
        { path: "/dashboard/challan/dyeing", label: "Dyeing", icon: Package },
        { path: "/dashboard/challan/knitting", label: "Knitting", icon: Package },
    ];

    const navItems = [
        { path: "/dashboard/new-audit", label: "New Audit", icon: PlusCircle },
        { path: "/dashboard/style-requirement", label: "Style Requirements", icon: PlusCircle },
        { path: "/dashboard/monitoring", label: "Api Monitoring", icon: PlusCircle },
        { path: "/dashboard/new-user", label: "Add New User", icon: UserRoundPlus },
        { path: "/dashboard/party-wise-view", label: "Party Wise View", icon: UserRoundPlus },
    ];

    // Auto-open dropdown if current route is an order sub-route
    const isOrdersActive = orderSubItems.some(item => isActive(item.path));
    const isMovementActive = orderSubItems.some(item => isActive(item.path));

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const toggleSidebar = () => setIsCollapsed(!isCollapsed);
    const getPageInfo = () => {
        const path = location.pathname;
        if (path.includes('/factory-wise-report/')) {
            const factoryName = path.split('/factory-wise-report/')[1];
            return { title: `Factory Report - ${factoryName}` };
        }
        if (path.includes('style-requirement')) return { title: 'Style And Requirement' };
        if (path.includes('audits')) return { title: 'All Audits' };
        if (path.includes('cutting')) return { title: 'Daily Fabric Cutting Report' };
        if (path.includes('new-user')) return { title: 'Add New User' };
        if (path.includes('party-wise-view')) return { title: 'Manage Party Wise View' };

        const routeMap = {
            '/dashboard/home': { title: 'Dashboard', subtitle: 'Welcome back, System Admin' },
            '/dashboard/knitting-order': { title: 'Knitting Orders', subtitle: 'Manage knitting orders' },
            '/dashboard/yarn-dye-order': { title: 'Yarn Dyeing Orders', subtitle: 'Manage yarn dyeing orders' },
            '/dashboard/aop-order': { title: 'AOP Orders', subtitle: 'Manage AOP orders' },
            '/dashboard/new-order': { title: 'Add New Order', subtitle: 'Create new order' },
            '/dashboard/audits': { title: 'AUDITS', subtitle: 'Audits' },
        };

        const movementRouteMap = {
            '/dashboard/challan/aop': { title: 'AOP Movement', subtitle: 'Manage AOP challans' },
            '/dashboard/challan/dyeing': { title: 'Dyeing Movement', subtitle: 'Manage dyeing challans' },
            '/dashboard/challan/knitting': { title: 'Knitting Movement', subtitle: 'Manage knitting challans' },
        };

        // Look up by the actual path, in either map
        return (
            routeMap[path] ||
            movementRouteMap[path] ||
            { title: 'Dashboard', subtitle: 'Welcome back, System Admin' }
        );
    };

    const pageInfo = getPageInfo();

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={toggleMobileMenu}
                />
            )}

            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40
                ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64
                shrink-0 bg-primary-500 flex flex-col border-r border-gray-300
                transform transition-all duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Header */}
                <div className="h-20 px-6 border-b border-primary-400 bg-primary-600 flex items-center justify-between">
                    {!isCollapsed ? (
                        <>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-primary-400 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-primary-100 font-bold text-lg">E</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-base font-bold text-white truncate">ERP System</h1>
                                    <p className="text-primary-200 text-xs">Audit Management</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleMobileMenu}
                                className="lg:hidden p-2 text-white hover:bg-primary-700 rounded-md transition-colors shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex items-center justify-center">
                            <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
                                <span className="text-primary-500 font-bold text-lg">E</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 overflow-y-auto">
                    <ul className="space-y-1">

                        {/* Dashboard */}
                        <li>
                            <Link
                                to="/dashboard/home"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 no-underline ${isActive('/dashboard/home') ? 'bg-primary-400 text-white' : 'text-white hover:bg-primary-600'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <LayoutDashboard size={20} className="shrink-0" />
                                {!isCollapsed && <span className="font-medium text-sm">Dashboard</span>}
                            </Link>
                        </li>

                        {/* Orders Dropdown */}
                        <li>
                            <button
                                onClick={() => !isCollapsed && setIsOrdersOpen(!isOrdersOpen)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${isOrdersActive ? 'bg-primary-400 text-white' : 'text-white hover:bg-primary-600'
                                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                                title={isCollapsed ? 'Orders' : ''}
                            >
                                <div className="flex items-center gap-3">
                                    <Package size={20} className="shrink-0" />
                                    {!isCollapsed && <span className="font-medium text-sm">Orders</span>}
                                </div>
                                {!isCollapsed && (
                                    (isOrdersOpen || isOrdersActive)
                                        ? <ChevronDown size={16} />
                                        : <ChevronRight size={16} />
                                )}
                            </button>

                            {/* Sub Items */}
                            {(isOrdersOpen || isOrdersActive) && !isCollapsed && (
                                <ul className="mt-1 ml-4 space-y-1 border-l border-primary-400 pl-3">
                                    {orderSubItems.map(item => (
                                        <li key={item.path}>
                                            <Link
                                                to={item.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 no-underline text-sm ${isActive(item.path)
                                                    ? 'bg-primary-400 text-white font-medium'
                                                    : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                                                    }`}
                                            >
                                                <item.icon size={16} className="shrink-0" />
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>

                        {/* Rest of nav items */}
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 no-underline ${isActive(item.path) ? 'bg-primary-400 text-white' : 'text-white hover:bg-primary-600'
                                            } ${isCollapsed ? 'justify-center' : ''}`}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        <Icon size={20} className="shrink-0" />
                                        {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                                    </Link>
                                </li>
                            );
                        })}

                        {/* Movement Dropdown */}
                        <li>
                            <button
                                onClick={() => !isCollapsed && setIsMovementOpen(!isMovementOpen)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${isOrdersActive ? 'bg-primary-400 text-white' : 'text-white hover:bg-primary-600'
                                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                                title={isCollapsed ? 'Movement' : ''}
                            >
                                <div className="flex items-center gap-3">
                                    <Package size={20} className="shrink-0" />
                                    {!isCollapsed && <span className="font-medium text-sm">Movement</span>}
                                </div>
                                {!isCollapsed && (
                                    (isMovementOpen || isMovementActive)
                                        ? <ChevronDown size={16} />
                                        : <ChevronRight size={16} />
                                )}
                            </button>

                            {/* Sub Items */}
                            {(movementSubItems || isMovementOpen) && !isCollapsed && (
                                <ul className="mt-1 ml-4 space-y-1 border-l border-primary-400 pl-3">
                                    {movementSubItems.map(item => (
                                        <li key={item.path}>
                                            <Link
                                                to={item.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 no-underline text-sm ${isActive(item.path)
                                                    ? 'bg-primary-400 text-white font-medium'
                                                    : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                                                    }`}
                                            >
                                                <item.icon size={16} className="shrink-0" />
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    </ul>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden w-full">
                <div className="h-20 bg-white border-b border-gray-200 px-6 lg:px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (window.innerWidth < 1024) toggleMobileMenu();
                                else toggleSidebar();
                            }}
                            className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-primary-500 hover:bg-gray-200 transition-colors shrink-0"
                        >
                            {isCollapsed || !isMobileMenuOpen ? <PanelRightOpen size={20} /> : <PanelLeftOpen size={20} />}
                        </button>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">{pageInfo.title}</h2>
                            <p className="text-sm text-gray-500">{pageInfo.subtitle}</p>
                        </div>
                    </div>
                    {/* import {Bell, ChevronDown, User} from "lucide-react"; */}

                    <div className="flex items-center gap-3">
                        {/* Notification */}
                        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>

                        {/* User Profile */}
                        <button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <div className="w-10 uppercase h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                                {/* User initials */}
                                {
                                    user && (
                                        <h2>{user?.name?.[0] || "UNK"}</h2>
                                    )
                                }
                                {/* Or use image */}
                                {/* <img src={user?.photoURL} className="w-full h-full rounded-full object-cover" /> */}
                            </div>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <div className="p-6 lg:p-8 w-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Sidebar;