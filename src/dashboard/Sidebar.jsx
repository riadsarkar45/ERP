import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
    LayoutDashboard, 
    Package, 
    Palette, 
    FileText, 
    PlusCircle, 
    PanelLeftOpen,
    PanelRightOpen,
    X,
    Bell
} from "lucide-react";

const Sidebar = () => {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const isActive = (path) => location.pathname === path;
    
    const navItems = [
        { path: "/dashboard/home", label: "Dashboard", icon: LayoutDashboard },
        { path: "/dashboard/knitting-order", label: "Knitting Orders", icon: Package },
        { path: "/dashboard/yarn-dye-order", label: "Yarn Dyeing Orders", icon: Palette },
        { path: "/dashboard/yarn-dye-order", label: "Dyeing Order", icon: Palette },
        { path: "/dashboard/aop-order", label: "AOP Orders", icon: FileText },
        { path: "/dashboard/new-order", label: "Add New Order", icon: PlusCircle },
        { path: "/dashboard/new-order", label: "New Audit", icon: PlusCircle },
    ];

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Get current page info with dynamic titles
    const getPageInfo = () => {
        const path = location.pathname;
        
        // Handle factory report pages
        if (path.includes('/factory-wise-report/')) {
            const factoryName = path.split('/factory-wise-report/')[1];
            return {
                title: `Factory Report - ${factoryName}`,
                subtitle: 'Factory wise yarn dyeing report'
            };
        }
        
        // Handle other routes
        const routeMap = {
            '/dashboard/home': { title: 'Dashboard', subtitle: 'Welcome back, System Admin' },
            '/dashboard/knitting-order': { title: 'Knitting Orders', subtitle: 'Manage knitting orders' },
            '/dashboard/yarn-dye-order': { title: 'Yarn Dyeing Orders', subtitle: 'Manage yarn dyeing orders' },
            '/dashboard/aop-order': { title: 'AOP Orders', subtitle: 'Manage AOP orders' },
            '/dashboard/new-order': { title: 'Add New Order', subtitle: 'Create new order' },
        };
        
        return routeMap[path] || { title: 'Dashboard', subtitle: 'Welcome back, System Admin' };
    };

    const pageInfo = getPageInfo();

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={toggleMobileMenu}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40
                ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64
                shrink-0 bg-primary-500 flex flex-col border-r border-gray-300
                transform transition-all duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Header with Logo */}
                <div className="h-20 px-6 border-b border-primary-400 bg-primary-600 flex items-center justify-between">
                    {!isCollapsed ? (
                        <>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Logo/Icon */}
                                <div className="w-10 h-10 bg-primary-400 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-primary-100 font-bold text-lg">E</span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-base font-bold text-white truncate">ERP System</h1>
                                    <p className="text-primary-200 text-xs">Audit Management</p>
                                </div>
                            </div>
                            
                            {/* Mobile Close Button - Only on mobile */}
                            <button
                                onClick={toggleMobileMenu}
                                className="lg:hidden p-2 text-white hover:bg-primary-700 rounded-md transition-colors shrink-0"
                                title="Close Menu"
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
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 no-underline ${
                                            isActive(item.path)
                                                ? 'bg-primary-400 text-white'
                                                : 'text-white hover:bg-primary-600'
                                        } ${isCollapsed ? 'justify-center' : ''}`}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        <Icon size={20} className="shrink-0" />
                                        {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden w-full">
                {/* Top Bar with Toggle Button, Page Title and Notification */}
                <div className="h-20 bg-white border-b border-gray-200 px-6 lg:px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Toggle Button - Instead of Page Icon */}
                        <button
                            onClick={() => {
                                if (window.innerWidth < 1024) {
                                    toggleMobileMenu();
                                } else {
                                    toggleSidebar();
                                }
                            }}
                            className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-primary-500 hover:bg-gray-200 transition-colors shrink-0"
                            title={isCollapsed ? "Open Sidebar" : "Close Sidebar"}
                        >
                            {isCollapsed || !isMobileMenuOpen ? <PanelRightOpen size={20} /> : <PanelLeftOpen size={20} />}
                        </button>
                        
                        {/* Page Title */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">
                                {pageInfo.title}
                            </h2>
                            <p className="text-sm text-gray-500">{pageInfo.subtitle}</p>
                        </div>
                    </div>
                    
                    {/* Notification Bell */}
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                </div>
                
                {/* Content Area */}
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
