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
    ChevronDown,
    ChevronRight,
    UserRoundPlus,
    ZoomIn,
    ZoomOut,
    EqualApproximately,
} from "lucide-react";
import { AuthContext } from "./auth/AuthContext";

const Sidebar = () => {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // NEW: Zoom state (default 100%, minimum fixed at 70%)
    const [zoomLevel, setZoomLevel] = useState(100);

    const isActive = (path) => location.pathname === path;
    const { user } = useContext(AuthContext);

    // Handle zoom changes with a fixed minimum of 70% and maximum of 200%
    const handleZoomChange = (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val)) val = 100;
        if (val < 70) val = 70;   // Fixed minimum capacity at 70%
        if (val > 200) val = 200; // Maximum capacity at 200%
        setZoomLevel(val);
    };

    // Unified Yarn routes (including Yarn Dyed Movement & Stock)
    const yarnSubItems = [
        { path: "/dashboard/yarn", label: "Yarn Purchase", icon: Package },
        { path: "/dashboard/spinning-yarn-movement", label: "Yarn Movement (Spinning)", icon: Package },
        { path: "/dashboard/yarn/movement", label: "Raw Yarn Movement", icon: Package },
        { path: "/dashboard/yarn/stock", label: "Raw Yarn Stock", icon: Package },
        { path: "/dashboard/yarndyed/movement", label: "Yarn Dyed Movement", icon: Package },
        { path: "/dashboard/yarndyed/stock", label: "Yarn Dyed Stock", icon: Package },
        
    ];

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

    const othersSubItems = [
        { path: "/dashboard/challan/others/compacting", label: "Compacting", icon: Package },
        { path: "/dashboard/challan/others/heat-set", label: "Heat Set", icon: Package },
        { path: "/dashboard/challan/others/trumble", label: "Trumble", icon: Package },
        { path: "/dashboard/challan/others/re-process", label: "Re-Process", icon: Package },
    ];

    const misSubItems = [
        { path: "/dashboard/mis/glance", label: "At A Glance (Stock)", icon: FileText },
    ];

    // Dropdown open states
    const [isYarnOpen, setIsYarnOpen] = useState(
        () => yarnSubItems.some(item => item.path === location.pathname)
    );

    const [isOrdersOpen, setIsOrdersOpen] = useState(
        () => orderSubItems.some(item => item.path === location.pathname)
    );

    const [isMovementOpen, setIsMovementOpen] = useState(
        () => movementSubItems.some(item => item.path === location.pathname)
            || othersSubItems.some(item => item.path === location.pathname)
    );

    const [isOthersOpen, setIsOthersOpen] = useState(
        () => othersSubItems.some(item => item.path === location.pathname)
    );

    const [isMisOpen, setIsMisOpen] = useState(
        () => misSubItems.some(item => item.path === location.pathname)
    );

    function ThreadIcon({ size = 16 }) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="95 25 210 350" width={size} height={size}>
                <defs>
                    <linearGradient id="coneBody" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f2ede2" />
                        <stop offset="20%" stopColor="#ffffff" />
                        <stop offset="45%" stopColor="#e8e0d0" />
                        <stop offset="55%" stopColor="#faf7f0" />
                        <stop offset="75%" stopColor="#e0d7c4" />
                        <stop offset="100%" stopColor="#f5f1e6" />
                    </linearGradient>
                    <linearGradient id="coneShade" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#000000" stopOpacity="0.08" />
                        <stop offset="50%" stopColor="#000000" stopOpacity="0" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
                    </linearGradient>
                    <radialGradient id="capGrad" cx="50%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#4a4a52" />
                        <stop offset="100%" stopColor="#1c1c22" />
                    </radialGradient>
                    <radialGradient id="baseGrad" cx="50%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#4a4a52" />
                        <stop offset="100%" stopColor="#1c1c22" />
                    </radialGradient>
                </defs>
                <path d="M 155 65 Q 155 55 170 55 L 230 55 Q 245 55 245 65 L 285 320 Q 288 335 270 340 L 130 340 Q 112 335 115 320 Z"
                    fill="url(#coneBody)" stroke="#c9bfa8" strokeWidth="2" />
                <path d="M 155 65 Q 155 55 170 55 L 230 55 Q 245 55 245 65 L 285 320 Q 288 335 270 340 L 130 340 Q 112 335 115 320 Z"
                    fill="url(#coneShade)" />
                <g stroke="#c7bda3" strokeWidth="1" fill="none" opacity="0.55">
                    <path d="M 130 90 L 262 190" /><path d="M 126 120 L 268 220" />
                    <path d="M 123 150 L 273 250" /><path d="M 120 180 L 277 280" />
                    <path d="M 117 210 L 281 300" /><path d="M 114 240 L 283 320" />
                    <path d="M 262 90 L 130 190" /><path d="M 268 120 L 126 220" />
                    <path d="M 273 150 L 123 250" /><path d="M 277 180 L 120 280" />
                    <path d="M 281 210 L 117 300" /><path d="M 283 240 L 114 320" />
                </g>
                <ellipse cx="200" cy="57" rx="42" ry="14" fill="url(#capGrad)" />
                <ellipse cx="200" cy="53" rx="42" ry="13" fill="#2a2a30" />
                <ellipse cx="200" cy="338" rx="78" ry="18" fill="url(#baseGrad)" />
                <ellipse cx="200" cy="332" rx="78" ry="17" fill="#2a2a30" />
                <ellipse cx="200" cy="53" rx="14" ry="5" fill="#0e0e12" />
            </svg>
        );
    }

    const navItems = [
        { path: "/dashboard/style-requirement", label: "Style Requirements", icon: PlusCircle },
        { path: "/dashboard/new-user", label: "Add New User", icon: UserRoundPlus },
        { path: "/dashboard/party-wise-view", label: "Party Wise View", icon: UserRoundPlus },
        { path: "/dashboard/requested-work-orders", label: "Work Order Requests", icon: EqualApproximately },
    ];

    // Active checks for highlighting parent dropdowns
    const isYarnActive = yarnSubItems.some(item => isActive(item.path));
    const isOrdersActive = orderSubItems.some(item => isActive(item.path));
    const isMovementActive = movementSubItems.some(item => isActive(item.path)) || othersSubItems.some(item => isActive(item.path));
    const isOthersActive = othersSubItems.some(item => isActive(item.path));
    const isMisActive = misSubItems.some(item => isActive(item.path));

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
        if (path.includes('management-view')) return { title: 'Manage Management View' };

        const routeMap = {
            '/dashboard/home': { title: 'Dashboard', subtitle: 'Welcome back, System Admin' },
            '/dashboard/yarn': { title: 'Yarn Purchase', subtitle: 'Purchase order status' },
            '/dashboard/yarn/movement': { title: 'Yarn Movement', subtitle: 'Yarn movement report' },
            '/dashboard/yarn/stock': { title: 'Yarn Stock', subtitle: 'Yarn stock status' },
            '/dashboard/yarn-dyed/movement': { title: 'Yarn Dyed Movement', subtitle: 'Yarn dyed movement report' },
            '/dashboard/yarn-dyed/stock': { title: 'Yarn Dyed Stock', subtitle: 'Yarn dyed stock status' },
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
            '/dashboard/challan/others/compacting': { title: 'Compacting', subtitle: 'Manage compacting movement' },
            '/dashboard/challan/others/heat-set': { title: 'Heat Set', subtitle: 'Manage heat set movement' },
            '/dashboard/challan/others/trumble': { title: 'Trumble', subtitle: 'Manage trumble movement' },
            '/dashboard/challan/others/re-process': { title: 'Re-Process', subtitle: 'Manage re-process movement' },
        };

        const misRouteMap = {
            '/dashboard/mis/glance': { title: 'MIS - AOP', subtitle: 'At A Glance' },
        };

        return (
            routeMap[path] ||
            movementRouteMap[path] ||
            misRouteMap[path] ||
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

                        {/* Yarn Dropdown (Includes Yarn Dyed Movement & Stock) */}
                        <li>
                            <button
                                onClick={() => !isCollapsed && setIsYarnOpen(prev => !prev)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${isYarnActive ? 'bg-primary-400 text-white' : 'text-white hover:bg-primary-600'
                                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                                title={isCollapsed ? 'Yarn' : ''}
                            >
                                <div className="flex items-center gap-3">
                                    <ThreadIcon size={20} />
                                    {!isCollapsed && <span className="font-medium text-sm">Yarn</span>}
                                </div>
                                {!isCollapsed && (
                                    isYarnOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                )}
                            </button>

                            {isYarnOpen && !isCollapsed && (
                                <ul className="mt-1 ml-4 space-y-1 border-l border-primary-400 pl-3">
                                    {yarnSubItems.map(item => (
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

                        {/* Orders Dropdown */}
                        <li>
                            <button
                                onClick={() => !isCollapsed && setIsOrdersOpen(prev => !prev)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${isOrdersActive ? 'bg-primary-400 text-white' : 'text-white hover:bg-primary-600'
                                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                                title={isCollapsed ? 'Orders' : ''}
                            >
                                <div className="flex items-center gap-3">
                                    <Package size={20} className="shrink-0" />
                                    {!isCollapsed && <span className="font-medium text-sm">Orders</span>}
                                </div>
                                {!isCollapsed && (
                                    isOrdersOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                )}
                            </button>

                            {isOrdersOpen && !isCollapsed && (
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

                        {/* Standalone Nav Items */}
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
                                onClick={() => !isCollapsed && setIsMovementOpen(prev => !prev)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${isMovementActive ? 'bg-primary-400 text-white' : 'text-white hover:bg-primary-600'
                                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                                title={isCollapsed ? 'Movement' : ''}
                            >
                                <div className="flex items-center gap-3">
                                    <Package size={20} className="shrink-0" />
                                    {!isCollapsed && <span className="font-medium text-sm">Movement</span>}
                                </div>
                                {!isCollapsed && (
                                    isMovementOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                )}
                            </button>

                            {isMovementOpen && !isCollapsed && (
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

                                    {/* Others Nested Dropdown */}
                                    <li>
                                        <button
                                            onClick={() => setIsOthersOpen(prev => !prev)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm justify-between ${isOthersActive
                                                ? 'bg-primary-400 text-white font-medium'
                                                : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Package size={16} className="shrink-0" />
                                                Others
                                            </div>
                                            {isOthersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>

                                        {isOthersOpen && (
                                            <ul className="mt-1 ml-4 space-y-1 border-l border-primary-400 pl-3">
                                                {othersSubItems.map(item => (
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
                            )}
                        </li>

                        {/* MIS Dropdown */}
                        <li>
                            <button
                                onClick={() => !isCollapsed && setIsMisOpen(prev => !prev)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${isMisActive ? 'bg-primary-400 text-white' : 'text-white hover:bg-primary-600'
                                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                                title={isCollapsed ? 'MIS' : ''}
                            >
                                <div className="flex items-center gap-3">
                                    <FileText size={20} className="shrink-0" />
                                    {!isCollapsed && <span className="font-medium text-sm">MIS</span>}
                                </div>
                                {!isCollapsed && (
                                    isMisOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                )}
                            </button>

                            {isMisOpen && !isCollapsed && (
                                <ul className="mt-1 ml-4 space-y-1 border-l border-primary-400 pl-3">
                                    {misSubItems.map(item => (
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

                    <div className="flex items-center gap-3">
                        {/* NEW: Zoom Control (Fixed min 70%, Customizable) */}
                        <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 border border-gray-200">
                            <ZoomOut size={14} className="text-gray-500" />
                            <select
                                value={zoomLevel}
                                onChange={handleZoomChange}
                                className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer w-16"
                                title="Adjust zoom level (Minimum 70%)"
                            >
                                <option value="70">70%</option>
                                <option value="80">80%</option>
                                <option value="90">90%</option>
                                <option value="100">100%</option>
                                <option value="110">110%</option>
                                <option value="125">125%</option>
                                <option value="150">150%</option>
                                <option value="200">200%</option>
                            </select>
                            <ZoomIn size={14} className="text-gray-500" />
                        </div>

                        {/* Notification */}
                        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>

                        {/* User Profile */}
                        <button className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <div className="w-10 uppercase h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                                {user && (
                                    <h2>{user?.name?.[0] || "UNK"}</h2>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Outlet Wrapper with Zoom Applied */}
                <div className="flex-1 overflow-auto bg-gray-50">
                    <div
                        className="p-6 lg:p-8 w-full transition-all duration-200 ease-in-out origin-top-left"
                        style={{ zoom: `${zoomLevel}%` }}
                    >
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Sidebar;