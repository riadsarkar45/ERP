import { useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import Input from "../../../components/Input";
import useAxiosPublic from "../../../hooks/Axios";
import { Save, X } from "lucide-react";

const CreateNewAudit = () => {
    const [formData, setFormData] = useState({
        auditTitle: "",
        auditStartDate: "",
        auditEndDate: "",
        auditDesc: "",
    })
    const axiosPublic = useAxiosPublic();

    const handleOnChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async () => {
        console.log("clicked...");
        const res = await axiosPublic.post("/api/create-new-audit", formData)
        console.log(res.data);
    }
    return (
        <DashboardLayout title="Add New Order">
            <div className="bg-white p-2 border">
                <div className="grid grid-cols-3 gap-6">
                    <Input
                        label="Audit Title"
                        name="auditTitle"
                        type="text"
                        placeholder="Audit Title"
                        onChange={handleOnChange}
                        required
                    />
                    <Input
                        label="Audit Start Date"
                        name="auditStartDate"
                        type="date"
                        onChange={handleOnChange}

                        required
                    />
                    <Input
                        label="Audit End Date"
                        name="auditEndDate"
                        type="date"
                        onChange={handleOnChange}

                        required
                    />

                </div>

                <div className="mt-8">
                    <h2>Audit Description</h2>
                    <textarea onChange={handleOnChange}
                        name="auditDesc" className="h-[10rem] w-full p-2 border rounded-md outline-none" placeholder="Audit Description">

                    </textarea>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                    <button
                        onClick={() => handleSubmit()}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white font-medium rounded-md hover:bg-primary-600 transition-all duration-200 border border-primary-600"
                    >
                        <Save size={18} />
                        Create Order
                    </button>
                    <button
                        type="button"
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500 bg-opacity-30 text-red-700 font-medium rounded-md hover:bg-gray-50 transition-all duration-200 border border-red-700"
                    >
                        <X size={18} />
                        Cancel
                    </button>
                </div>
            </div>

        </DashboardLayout>
    );
};

export default CreateNewAudit;