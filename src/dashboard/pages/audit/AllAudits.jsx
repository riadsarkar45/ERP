import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import useAxiosPublic from "../../../hooks/Axios";

const AllAudits = () => {
    const axiosPublic = useAxiosPublic();
    const [audits, setAudits] = useState([])
    useEffect(() => {
        const allAudits = async () => {
            const res = await axiosPublic.get("/api/audits")
            setAudits(res.data);
        }
        allAudits();
    }, [axiosPublic])

    const handleChangeAuditStatus = async (auditId, status) => {
        console.log("clicked", status);
        const res = await axiosPublic.patch(`/api/update-audit/${auditId}/${status}`)
        console.log(res.data);
        if (res.status === 201) {
            const res = await axiosPublic.get("/api/audits")
            setAudits(res.data);
        }
    }
    return (
        <DashboardLayout>
            <div className="">
                {
                    audits?.map((audit) => {
                        return (
                            <div key={audit.id} className={`
                                ${audit.auditType === "pending" ? "bg-yellow-500 bg-opacity-30 text-yellow-600 border-yellow-600" : "bg-white"}
                                ${audit.auditType === "complete" ? "bg-green-600 bg-opacity-30  text-green-600 border-green-600" : "bg-white"}
                                ${audit.auditType === "canceled" ? "bg-red-600 bg-opacity-30  text-red-600 border-red-600" : "bg-white"}
                              border  p-2 rounded-md mb-3`}>
                                <div className="flex justify-between">
                                    <h2>{audit.auditTitle}</h2>
                                    <div className="flex mb-6 justify-between gap-4">
                                        <p>Start Date: {audit.auditStartDate}</p>
                                        <p>End Date: {audit.auditEndDate}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {
                                        audit.auditType === "pending" &&
                                        <>
                                            <button onClick={() => handleChangeAuditStatus(audit.id, "canceled")} className="bg-red-500 p-1 bg-opacity-40 rounded-md text-red-600 ">Cancel</button>
                                            <button onClick={() => handleChangeAuditStatus(audit.id, "complete")} className="bg-blue-500 p-1 bg-opacity-40 rounded-md text-blue-600 ">Complete</button>

                                        </>

                                    }
                                    {
                                        audit.auditType === "complete" &&
                                        <>
                                            <button onClick={() => handleChangeAuditStatus(audit.id, "canceled")} className="bg-red-500 p-1 bg-opacity-40 rounded-md text-red-600 ">Cancel</button>
                                            <button onClick={() => handleChangeAuditStatus(audit.id, "pending")} className="bg-yellow-500 p-1 bg-opacity-40 rounded-md text-yellow-600 ">Pending</button>

                                        </>
                                    }
                                    {
                                        audit.auditType === "canceled" &&
                                        <>
                                            <button onClick={() => handleChangeAuditStatus(audit.id, "complete")} className="bg-blue-500 p-1 bg-opacity-40 rounded-md text-blue-600 ">Complete</button>
                                            <button onClick={() => handleChangeAuditStatus(audit.id, "pending")} className="bg-yellow-500 p-1 bg-opacity-40 rounded-md text-yellow-600 ">Pending</button>

                                        </>

                                    }
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        </DashboardLayout>
    );
};

export default AllAudits;