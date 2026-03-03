import React from 'react';
import Header from '../../components/Header';

const Home = () => {
    return (
        <div>
            <Header headerText='Dashboard' />
            <div className='grid grid-cols-4 gap-2 mb-8'>
                <div className='border p-3 rounded-md'>
                    <h2>Total Knitting Order</h2>
                    <span>44,444</span>
                </div>
                <div className='border p-3 rounded-md'>
                    <h2>Total Dyeing Order</h2>
                    <span>44,444</span>
                </div>
                <div className='border p-3 rounded-md'>
                    <h2>Total Yarn Dye Order</h2>
                    <span>44,444</span>
                </div>
                <div className='border p-3 rounded-md'>
                    <h2>Total AOP Order</h2>
                    <span>44,444</span>
                </div>
            </div>

            <div className='mb-10'>
                <Header headerText='Factories' />
                <div className='grid grid-cols-6 gap-2'>
                    <button className='bg-blue-500 outline-none bg-opacity-30 p-2 border border-blue-500 hover:bg-opacity-20 text-blue-500'>That's It Knit </button>
                    <button className='bg-blue-500 outline-none bg-opacity-30 p-2 border border-blue-500 hover:bg-opacity-20 text-blue-500'>Fair Apparels Ltd</button>
                    <button className='bg-blue-500 outline-none bg-opacity-30 p-2 border border-blue-500 hover:bg-opacity-20 text-blue-500'>Tj Sweaters Ltd </button>
                    <button className='bg-blue-500 outline-none bg-opacity-30 p-2 border border-blue-500 hover:bg-opacity-20 text-blue-500'>Winter Dress Ltd </button>
                    <button className='bg-blue-500 outline-none bg-opacity-30 p-2 border border-blue-500 hover:bg-opacity-20 text-blue-500'>Optimum Sourcing </button>
                    <button className='bg-blue-500 outline-none bg-opacity-30 p-2 border border-blue-500 hover:bg-opacity-20 text-blue-500'>Optimum Sourcing </button>
                    <button className='bg-blue-500 outline-none bg-opacity-30 p-2 border border-blue-500 hover:bg-opacity-20 text-blue-500'>Optimum Sourcing </button>
                    <button className='bg-blue-500 outline-none bg-opacity-30 p-2 border border-blue-500 hover:bg-opacity-20 text-blue-500'>Optimum Sourcing </button>
                    <button className='bg-blue-500 outline-none bg-opacity-30 p-2 border border-blue-500 hover:bg-opacity-20 text-blue-500'>Styletex Ltd </button>
                </div>
            </div>

            <Header headerText='Recent Orders' />

            <div>
                <div className="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
                    <table className="w-full text-sm text-left rtl:text-right text-body">
                        <thead className="text-sm text-body bg-neutral-secondary-soft border-b rounded-base border-default">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Sr#
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Factory Name
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Yarn Composition
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Price
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium">
                                    Qty
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-neutral-primary border-b border-default">
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    1
                                </th>
                                <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                    Apple MacBook Pro 17"
                                </th>
                                <td className="px-6 py-4">
                                    Silver
                                </td>
                                <td className="px-6 py-4">
                                    Laptop
                                </td>
                                <td className="px-6 py-4">
                                    $2999
                                </td>
                                <td className="px-6 py-4">
                                    231
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default Home;