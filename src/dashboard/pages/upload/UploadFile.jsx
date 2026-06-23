import React, { useState, useRef } from 'react';
import useAxiosPublic from '../../../hooks/Axios';

const UploadFile = () => {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [uploadStats, setUploadStats] = useState(null);
    const fileInputRef = useRef(null);
    const axiosPublic = useAxiosPublic();

    // Handle file selection
    const handleFileChange = (selectedFile) => {
        if (!selectedFile) return;

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload a valid Excel file (.xlsx or .xls)');
            return;
        }

        // Validate file size (20MB max)
        if (selectedFile.size > 20 * 1024 * 1024) {
            setError('File size must be less than 20MB');
            return;
        }

        setFile(selectedFile);
        setError('');
        setSuccess('');
        setPreviewData([]);
        setUploadStats(null);
    };

    // Handle drag events
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    // Handle drop
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    // Handle file input change
    const onInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
        }
    };

    // Upload file to backend
    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        const formData = new FormData();
        formData.append('file', file);
        try {
            const axiosPub = await axiosPublic.post("/api/upload", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const result = axiosPub.data; // already parsed, no .json() needed
            console.log(result);
            if (result.success) {
                setPreviewData(result.data);
                setColumns(result.columns);
                setUploadStats({
                    fileName: result.fileName,
                    sheetName: result.sheetName,
                    totalRows: result.totalRows,
                });
                setSuccess(`✅ Successfully parsed ${result.totalRows} rows!`);
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } else {
                // success: false but not a thrown error — still show backend's reason
                setError(result.error || result.details || 'Failed to parse file');
            }
        } catch (err) {
            // Backend sends errors as { error: "...", details: "..." } — NOT { message: "..." }
            const backendError = err.response?.data?.error;
            const backendDetails = err.response?.data?.details;
            const friendlyMessage = backendDetails
                ? `${backendError}: ${backendDetails}`
                : backendError;

            setError(friendlyMessage || err.message || 'Failed to upload file');
            console.error('Upload error:', err.response?.data || err);
        } finally {
            setLoading(false);
        }
    };

    // Clear all data
    const handleClear = () => {
        setFile(null);
        setPreviewData([]);
        setColumns([]);
        setError('');
        setSuccess('');
        setUploadStats(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                        📊 Excel File Parser
                    </h1>
                    <p className="text-gray-600">
                        Upload your Excel file to preview the data
                    </p>
                </div>

                {/* Upload Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
                    {/* Drop Zone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all duration-300 ${dragActive
                                ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                            }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={onInputChange}
                            className="hidden"
                        />

                        <div className="flex flex-col items-center gap-4">
                            <div
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${dragActive ? 'bg-blue-500' : 'bg-blue-100'
                                    }`}
                            >
                                <svg
                                    className={`w-8 h-8 ${dragActive ? 'text-white' : 'text-blue-600'
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                    />
                                </svg>
                            </div>

                            <div>
                                <p className="text-lg font-semibold text-gray-700">
                                    {dragActive
                                        ? 'Drop your file here'
                                        : 'Drag & drop your Excel file here'}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    or{' '}
                                    <span className="text-blue-600 font-medium hover:underline">
                                        click to browse
                                    </span>
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    Supports .xlsx, .xls • Max 20MB
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Selected File Info */}
                    {file && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg
                                        className="w-5 h-5 text-green-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800 truncate max-w-xs md:max-w-md">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove file"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleUpload}
                            disabled={!file || loading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                        />
                                    </svg>
                                    Upload & Parse
                                </>
                            )}
                        </button>

                        {(previewData.length > 0 || file) && (
                            <button
                                onClick={handleClear}
                                disabled={loading}
                                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <svg
                                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                            <svg
                                className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    )}
                </div>

                {/* Preview Table */}
                {previewData.length > 0 && uploadStats && (
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        {/* Stats Header */}
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">
                                        📋 Data Preview
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Showing parsed data from your Excel file
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                        📄 {uploadStats.fileName}
                                    </span>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                        📑 {uploadStats.sheetName}
                                    </span>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                        📊 {uploadStats.totalRows} rows
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-800 text-white sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">#</th>
                                        {columns.map((col, idx) => (
                                            <th
                                                key={idx}
                                                className="px-4 py-3 text-left font-semibold whitespace-nowrap"
                                            >
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {previewData.map((row, index) => (
                                        <tr
                                            key={row.id || index}
                                            className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                }`}
                                        >
                                            <td className="px-4 py-3 font-medium text-gray-500">
                                                {row.id}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 font-medium">
                                                {row.salesContractNo}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {row.buyer}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                                                {row.jobNo}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {row.poNo}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {row.style}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                <span className="inline-flex items-center gap-1">
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                    {row.color}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 text-xs">
                                                {row.composition}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {row.finishDia}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold text-xs">
                                                    {(row.orderQty ?? 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-semibold text-xs">
                                                    {(row.finishFabricRequired ?? 0).toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-600">
                            Showing {previewData.length} of {previewData.length} entries
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!file && previewData.length === 0 && !loading && (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                            <svg
                                className="w-10 h-10 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            No file uploaded yet
                        </h3>
                        <p className="text-gray-500">
                            Upload an Excel file to see the preview here
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadFile;