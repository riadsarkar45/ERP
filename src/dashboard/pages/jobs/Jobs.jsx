import { useEffect, useState } from "react";
import useAxiosPublic from "../../../hooks/Axios";

const Jobs = () => {
    const axiosPublic = useAxiosPublic();
    const [jobs, setJobs] = useState([])
    useEffect(() => {
        const fetchJobs = async () => {
            const res = await axiosPublic.get("/api/jobs")
            console.log(res.data);
            setJobs(res.data)
        }
        fetchJobs();
    }, [axiosPublic])

    const handleJobs = async (jobId, status) => {
        console.log("clicked..", jobId, status);
        const res = await axiosPublic.patch(`/api/job-status/${status}/${jobId}`)
        console.log(res.data);
        if (res.status === 201) {
            const res = await axiosPublic.get("/api/jobs")
            console.log(res.data);
            setJobs(res.data)
        }
    }
    return (
        <div className="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
            <table className="w-full text-sm text-left rtl:text-right text-body">
                <thead className="text-sm text-body bg-neutral-secondary-medium border-b border-default-medium">
                    <tr>
                        <th scope="col" className="px-6 py-3 font-medium">
                            Buyer Name
                        </th>
                        <th scope="col" className="px-6 py-3 font-medium">
                            Job No
                        </th>
                        <th scope="col" className="px-6 py-3 font-medium">
                            PO NO
                        </th>
                        <th scope="col" className="px-6 py-3 font-medium">
                            Created At
                        </th>
                        <th scope="col" className="px-6 py-3 font-medium">
                            Status
                        </th>
                        <th scope="col" className="px-6 py-3 font-medium">
                            Action
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {
                        jobs?.map((job) => {
                            return (
                                <tr key={job.id} className="bg-neutral-primary-soft border-b border-default hover:bg-neutral-secondary-medium">
                                    <th scope="row" className="px-6 py-4 font-medium text-heading whitespace-nowrap">
                                        {job.buyer}
                                    </th>
                                    <td className="px-6 py-4">
                                        {job.jobNo}
                                    </td>
                                    <td className="px-6 py-4">
                                        {job.poNo}
                                    </td>
                                    <td className="px-6 py-4">
                                        {job.createdAt}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        {/* {job.status} */}
                                        {
                                            job.status === "active" && <small className="cursor-pointer bg-green-500 bg-border-500 bg-opacity-35 text-green-600 p-1 rounded-md">Active</small>
                                        }
                                        {
                                            job.status === "cancel" && <small className="cursor-pointer bg-red-500 bg-border-500 bg-opacity-35 text-red-600 p-1 rounded-md">Canceled</small>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-2">
                                            <small onClick={() => handleJobs(job.id, "cancel")} className="cursor-pointer bg-yellow-500 bg-border-500 bg-opacity-35 text-yellow-600 p-1 rounded-md">Cancel</small>
                                            <small onClick={() => handleJobs(job.id, "delete")} className="cursor-pointer bg-red-500 bg-border-500 bg-opacity-35 text-red-600 p-1 rounded-md">Delete</small>
                                            <small onClick={() => handleJobs(job.id, "active")} className="cursor-pointer bg-green-500 bg-border-500 bg-opacity-35 text-green-600 p-1 rounded-md">Active</small>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })
                    }
                </tbody>
            </table>
        </div>

    );
};

export default Jobs;