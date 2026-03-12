import DashboardLayout from "../../../components/DashboardLayout";
import Input from "../../../components/Input";

const CreateNewAudit = () => {
    return (
        <DashboardLayout title="Add New Order">
            <div className="bg-white p-2 border">
                <div className="grid grid-cols-3 gap-6">
                    <Input
                        label="Audit Title"
                        name="auditTitle"
                        type="text"
                        placeholder="Audit Title"
                        required
                    />
                    <Input
                        label="Audit Start Date"
                        name="auditStartDate"
                        type="date"
                        required
                    />
                    <Input
                        label="Audit End Date"
                        name="auditEndDate"
                        type="date"
                        required
                    />

                </div>

                <div className="mt-8">
                    <h2>Audit Description</h2>
                    <textarea className="h-[10rem] w-full p-2 border rounded-md outline-none" placeholder="Audit Description">

                    </textarea>
                </div>
            </div>

        </DashboardLayout>
    );
};

export default CreateNewAudit;