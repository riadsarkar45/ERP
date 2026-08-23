import { useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import useAxiosPrivate from '../../../hooks/UseAxiosPrivate';

const AllPendingWorkOrder = ({
    id,
    compositions,
    lotNo,
    jobNo,
    workOrderNo,
    styleRequirement,
    factoryName,
    stichLength,
    machineDia,
    yarnCount,
}) => {
    const axiosSecure = useAxiosPrivate();
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(null);

    // Blob responses can't be read directly with err.response.data.message —
    // when the backend sends a JSON error, axios still hands it back as a Blob
    // because we requested responseType: 'blob'. This reads it back out as text
    // and parses it so real backend error messages surface instead of a generic one.
    const extractErrorMessage = async (err) => {
        const fallback = 'Failed to generate PDF. Please try again.';
        const data = err?.response?.data;

        if (!data) return fallback;

        if (data instanceof Blob) {
            try {
                const text = await data.text();
                const parsed = JSON.parse(text);
                return parsed?.message || fallback;
            } catch {
                return fallback;
            }
        }

        return data?.message || fallback;
    };

    const handleDownloadPdf = async () => {
        if (!id || isDownloading) return;

        setIsDownloading(true);
        setDownloadError(null);

        try {
            const response = await axiosSecure.get(
                `/api/generate-pdf-work-order/${id}`, // adjust to match your actual route mount path
                { responseType: 'blob' }
            );

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `Knitting-WorkOrder-${jobNo ?? id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download work order PDF:', err);
            const message = await extractErrorMessage(err);
            setDownloadError(message);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow mb-3">
            {/* Header strip */}
            <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-gray-200 rounded-t-lg">
                <div className="flex gap-1">
                    <h2 className="font-semibold text-blue-900">{styleRequirement?.buyerName}</h2>
                    <h2 className="font-semibold text-blue-900">|</h2>
                    <h2 className="font-semibold text-blue-900">{jobNo}</h2>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        WO# {workOrderNo} {"->"} {id}
                    </span>
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={isDownloading || !id}
                        title={!id ? 'Missing work order id' : 'Download PDF'}
                        className="flex items-center gap-1 text-xs font-medium bg-blue-800 hover:bg-blue-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-md uppercase tracking-wide transition-colors"
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 className="animate-spin" size={12} />
                                Generating
                            </>
                        ) : (
                            <>
                                <Download size={12} />
                                Download Pdf
                            </>
                        )}
                    </button>
                </div>
            </div>

            {downloadError && (
                <p className="text-xs text-red-500 px-4 pt-2">{downloadError}</p>
            )}

            {/* Main details grid */}
            <div className="grid grid-cols-5 sm:grid-cols-4 gap-x-4 gap-y-3 p-4">
                <Field label="Factory" value={factoryName} />
                <Field label="Stitch Length" value={stichLength} />
                <Field label="Machine Dia" value={machineDia} />
                <Field label="Lot No" value={lotNo} />
                <Field label="Yarn Count" value={yarnCount} />
            </div>

            {/* Compositions */}
            {compositions?.length > 0 && (
                <div className="border-t border-gray-200 px-4 py-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Compositions
                    </p>
                    <div className="grid flex-wrap gap-3">
                        {compositions.map((cmp, i) => (
                            <div key={i}>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                                    {cmp.composition} <span className="text-gray-400 ml-1"></span>
                                </span>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                                    {cmp.workOrderQty} <span className="text-gray-400 ml-1">Work Order Qty</span>
                                </span>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                                    {cmp.unitePrice} <span className="text-gray-400 ml-1">unit price</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Field = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value ?? '-'}</p>
    </div>
);

export default AllPendingWorkOrder;