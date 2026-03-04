import { useState, useEffect } from "react";
import { Search, Edit2, Trash2, Package } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import Toast from "../../components/Toast";

const KnittingOrders = () => {
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orders, setOrders] = useState([]);
    const [searchFilters, setSearchFilters] = useState({
        buyer: "",
        jobNo: "",
        style: ""
    });
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = () => {
        const savedOrders = JSON.parse(localStorage.getItem('knittingOrders') || '[]');
        setOrders(savedOrders);
    };

    const showNotification = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    };

    const handleEdit = (order) => {
        setSelectedOrder(order);
        setEditModalOpen(true);
    };

    const handleUpdateOrder = (updatedOrder) => {
        const updatedOrders = orders.map(order => 
            order.id === updatedOrder.id ? updatedOrder : order
        );
        localStorage.setItem('knittingOrders', JSON.stringify(updatedOrders));
        setOrders(updatedOrders);
        setEditModalOpen(false);
        showNotification('Order updated successfully!', 'success');
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            const updatedOrders = orders.filter(order => order.id !== id);
            localStorage.setItem('knittingOrders', JSON.stringify(updatedOrders));
            setOrders(updatedOrders);
            showNotification('Order deleted successfully!', 'success');
        }
    };

    const handleSearch = () => {
        const savedOrders = JSON.parse(localStorage.getItem('knittingOrders') || '[]');
        const filtered = savedOrders.filter(order => {
            return (
                (!searchFilters.buyer || order.buyer.toLowerCase().includes(searchFilters.buyer.toLowerCase())) &&
                (!searchFilters.jobNo || order.jobNo.toLowerCase().includes(searchFilters.jobNo.toLowerCase())) &&
                (!searchFilters.style || order.style.toLowerCase().includes(searchFilters.style.toLowerCase()))
            );
        });
        setOrders(filtered);
        
        if (filtered.length === 0) {
            showNotification('No orders found matching your search', 'info');
        }
    };

    const handleSearchChange = (e) => {
        const { name, value } = e.target;
        setSearchFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <DashboardLayout title="Knitting Orders">
            {showToast && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setShowToast(false)}
                    duration={3000}
                />
            )}
            
            {/* Search Section */}
            <div className="bg-white rounded-md border border-gray-200 p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input
                        label=""
                        name="buyer"
                        type="text"
                        value={searchFilters.buyer}
                        onChange={handleSearchChange}
                        placeholder="Search by Buyer"
                    />
                    <Input
                        label=""
                        name="jobNo"
                        type="text"
                        value={searchFilters.jobNo}
                        onChange={handleSearchChange}
                        placeholder="Search by Job No"
                    />
                    <Input
                        label=""
                        name="style"
                        type="text"
                        value={searchFilters.style}
                        onChange={handleSearchChange}
                        placeholder="Search by Style"
                    />
                    <button
                        onClick={handleSearch}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600 mt-auto"
                    >
                        <Search size={18} />
                        Search
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700">#</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700">Date</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700">Work Order No</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700">Buyer</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700">Job No</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700">PO No</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700">Style</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700">Color</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Package size={32} className="text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-medium text-gray-700">No orders found</p>
                                                <p className="text-sm text-gray-500 mt-1">Create your first order to get started</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order, index) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{index + 1}</td>
                                        <td className="px-6 py-4 text-gray-700">{order.workOrderPlaceDate}</td>
                                        <td className="px-6 py-4 text-gray-700">{order.workOrderNo}</td>
                                        <td className="px-6 py-4 text-gray-700">{order.buyer}</td>
                                        <td className="px-6 py-4 text-gray-700">{order.jobNo}</td>
                                        <td className="px-6 py-4 text-gray-700">{order.poNo}</td>
                                        <td className="px-6 py-4 text-gray-700">{order.style}</td>
                                        <td className="px-6 py-4 text-gray-700">
                                            <span className="inline-block max-w-xs truncate" title={order.color}>
                                                {order.color}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(order)}
                                                    className="p-2 text-primary-500 hover:bg-primary-50 rounded-md transition-colors border border-transparent hover:border-primary-200"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(order.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {editModalOpen && selectedOrder && (
                <Modal 
                    order={selectedOrder}
                    onClose={() => setEditModalOpen(false)}
                    onUpdate={handleUpdateOrder}
                />
            )}
        </DashboardLayout>
    );
};

export default KnittingOrders;
