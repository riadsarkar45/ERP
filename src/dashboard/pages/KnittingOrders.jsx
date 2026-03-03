import { useState } from "react";
import Header from "../../components/Header";
import Modal from "../../components/Modal";

const KnittingOrders = () => {
    const [editModalOpen, setEditModalOpen] = useState(false);
    const handleEdit = () => {
        setEditModalOpen(true);
    }
    console.log(editModalOpen);
    return (
        <div>
            <Header headerText="Knitting Orders" />
            <div>
                <div className="flex gap-2 mb-3">
                    <div>
                        <input className="border outline-none rounded-md p-3 w-[10rem]" type="text" placeholder="Search by Factory Name" />
                        <input className="border outline-none rounded-md p-3 w-[10rem]" type="text" placeholder="Search by Merchandiser" />
                        <input className="border outline-none rounded-md p-3 w-[10rem]" type="text" placeholder="Search by JOB No" />
                        <input className="border outline-none rounded-md p-3 w-[10rem]" type="text" placeholder="Search by Style" />
                    </div>
                    <button className="bg-blue-500 text-white p-3 rounded-md">Search</button>
                </div>

                <div className="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
                    <table className="w-full text-sm text-left rtl:text-right text-body">
                        <thead className="text-sm text-body bg-neutral-secondary-soft border-b rounded-base border-default">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    #
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Factory Name
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Job Number
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Yarn
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Color
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Style
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Merchandiser
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-neutral-primary border-b border-default">
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    1
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    ATL Limited
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    JOB-NO-3
                                </th>
                                <td className="px-6 py-4">
                                    100% Cotton 2/32
                                </td>
                                <td className="px-6 py-4">
                                    Red
                                </td>
                                <td className="px-6 py-4">
                                    wdi-2999
                                </td>
                                <td className="px-6 py-4">
                                    Riad Sarkar
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-500 bg-opacity-30 border-blue-500 text-blue-700 p-1 rounded-lg">Detail</span>

                                    |
                                    <span onClick={() => handleEdit(setEditModalOpen(true))} className="bg-yellow-500 cursor-pointer bg-opacity-30 border-yellow-500 text-yellow-700 p-1 rounded-lg">Edit</span>

                                    |
                                    <span className="bg-red-500 bg-opacity-30 border-red-500 text-red-700 p-1 rounded-lg">Delete</span>
                                </td>
                            </tr>
                            <tr className="bg-neutral-primary border-b border-default">
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    1
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    ATL Limited
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    JOB-NO-3
                                </th>
                                <td className="px-6 py-4">
                                    100% Cotton 2/32
                                </td>
                                <td className="px-6 py-4">
                                    Red
                                </td>
                                <td className="px-6 py-4">
                                    wdi-2999
                                </td>
                                <td className="px-6 py-4">
                                    Riad Sarkar
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-500 bg-opacity-30 border-blue-500 text-blue-700 p-1 rounded-lg">Detail</span>

                                    |
                                    <span className="bg-yellow-500 bg-opacity-30 border-yellow-500 text-yellow-700 p-1 rounded-lg">Edit</span>

                                    |
                                    <span className="bg-red-500 bg-opacity-30 border-red-500 text-red-700 p-1 rounded-lg">Delete</span>
                                </td>
                            </tr>
                            <tr className="bg-neutral-primary border-b border-default">
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    1
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    ATL Limited
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    JOB-NO-3
                                </th>
                                <td className="px-6 py-4">
                                    100% Cotton 2/32
                                </td>
                                <td className="px-6 py-4">
                                    Red
                                </td>
                                <td className="px-6 py-4">
                                    wdi-2999
                                </td>
                                <td className="px-6 py-4">
                                    Riad Sarkar
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-500 bg-opacity-30 border-blue-500 text-blue-700 p-1 rounded-lg">Detail</span>

                                    |
                                    <span className="bg-yellow-500 bg-opacity-30 border-yellow-500 text-yellow-700 p-1 rounded-lg">Edit</span>

                                    |
                                    <span className="bg-red-500 bg-opacity-30 border-red-500 text-red-700 p-1 rounded-lg">Delete</span>
                                </td>
                            </tr>
                            <tr className="bg-neutral-primary border-b border-default">
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    1
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    ATL Limited
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    JOB-NO-3
                                </th>
                                <td className="px-6 py-4">
                                    100% Cotton 2/32
                                </td>
                                <td className="px-6 py-4">
                                    Red
                                </td>
                                <td className="px-6 py-4">
                                    wdi-2999
                                </td>
                                <td className="px-6 py-4">
                                    Riad Sarkar
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-500 bg-opacity-30 border-blue-500 text-blue-700 p-1 rounded-lg">Detail</span>

                                    |
                                    <span className="bg-yellow-500 bg-opacity-30 border-yellow-500 text-yellow-700 p-1 rounded-lg">Edit</span>

                                    |
                                    <span className="bg-red-500 bg-opacity-30 border-red-500 text-red-700 p-1 rounded-lg">Delete</span>
                                </td>
                            </tr>
                            <tr className="bg-neutral-primary border-b border-default">
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    1
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    ATL Limited
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    JOB-NO-3
                                </th>
                                <td className="px-6 py-4">
                                    100% Cotton 2/32
                                </td>
                                <td className="px-6 py-4">
                                    Red
                                </td>
                                <td className="px-6 py-4">
                                    wdi-2999
                                </td>
                                <td className="px-6 py-4">
                                    Riad Sarkar
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-500 bg-opacity-30 border-blue-500 text-blue-700 p-1 rounded-lg">Detail</span>

                                    |
                                    <span className="bg-yellow-500 bg-opacity-30 border-yellow-500 text-yellow-700 p-1 rounded-lg">Edit</span>

                                    |
                                    <span className="bg-red-500 bg-opacity-30 border-red-500 text-red-700 p-1 rounded-lg">Delete</span>
                                </td>
                            </tr>
                            <tr className="bg-neutral-primary border-b border-default">
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    1
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    ATL Limited
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    JOB-NO-3
                                </th>
                                <td className="px-6 py-4">
                                    100% Cotton 2/32
                                </td>
                                <td className="px-6 py-4">
                                    Red
                                </td>
                                <td className="px-6 py-4">
                                    wdi-2999
                                </td>
                                <td className="px-6 py-4">
                                    Riad Sarkar
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-500 bg-opacity-30 border-blue-500 text-blue-700 p-1 rounded-lg">Detail</span>

                                    |
                                    <span className="bg-yellow-500 bg-opacity-30 border-yellow-500 text-yellow-700 p-1 rounded-lg">Edit</span>

                                    |
                                    <span className="bg-red-500 bg-opacity-30 border-red-500 text-red-700 p-1 rounded-lg">Delete</span>
                                </td>
                            </tr>

                        </tbody>
                    </table>
                </div>
                {editModalOpen && <Modal editModalOpen={editModalOpen} setEditModalOpen={setEditModalOpen} />}
            </div>
        </div>
    );
};

export default KnittingOrders;