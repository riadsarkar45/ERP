import { useState, useEffect } from "react";
import { Search, Edit2, Trash2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import Table from "../../components/Table";
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
            <div className="bg-white mb-6">
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
            <Table
                columns={[
                    { header: "#", accessor: "index", render: (row, index) => <span className="font-medium text-gray-900">{index + 1}</span> },
                    { header: "Date", accessor: "workOrderPlaceDate" },
                    { header: "Work Order No", accessor: "workOrderNo" },
                    { header: "Buyer", accessor: "buyer" },
                    { header: "Job No", accessor: "jobNo" },
                    { header: "PO No", accessor: "poNo" },
                    { header: "Style", accessor: "style" },
                    { 
                        header: "Color", 
                        accessor: "color",
                        render: (row) => (
                            <span className="inline-block max-w-xs truncate" title={row.color}>
                                {row.color}
                            </span>
                        )
                    },
                    {
                        header: "Actions",
                        accessor: "actions",
                        render: (row) => (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(row)}
                                    className="p-2 text-primary-500 hover:bg-primary-50 rounded-md transition-colors border border-transparent hover:border-primary-200"
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(row.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )
                    }
                ]}
                data={orders}
                emptyMessage="No orders found"
            />
            
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
