
const Modal = ({ editModalOpen,setEditModalOpen }) => {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">

            

            {/* Modal */}
            {editModalOpen && (
                <div className="fixed inset-0 z-50">

                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black bg-opacity-60"
                        onClick={() => setEditModalOpen(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative w-screen h-screen bg-white flex flex-col">

                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-2xl font-semibold">Edit Table</h2>
                            <button
                                onClick={() => setEditModalOpen(false)}
                                className="text-gray-600 hover:text-black text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className=" p-6 overflow-auto">
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Job No</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Job No' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Knitting Factory Name</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Knitting Factory Name' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Order Qty</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Order Qty' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Delivery Short & Access Grey</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Delivery Short & Access Grey' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Received Yarn</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Received Yarn' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Return Received Yarn</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Return Received Yarn' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Balance Knitting Charge</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Balance Knitting Charge' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Charge Deducted For Debit Note</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Charge Deducted For Debit Note' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Payable Amount</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Payable Amount' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Paid Billing Amount</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Paid Billing Amount' />
                            </div>
                            <div className='grid grid-cols-2 p-2 border items-center'>
                                <span>Pending Billing Amount</span>
                                <input className="p-2 rounded-md outline-none" type="text" placeholder='Pending Billing Amount' />
                            </div>
                            
                        </div>

                        <div className="flex gap-3 justify-end items-center p-6 border-t">
                            <button onClick={() => setEditModalOpen(false)} className='bg-red-500 bg-opacity-30 border-red-500 text-red-800 p-4'>Cancel</button>
                            <button className='bg-blue-500 bg-opacity-30 border-blue-500 text-blue-800 p-4'>Update</button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default Modal;