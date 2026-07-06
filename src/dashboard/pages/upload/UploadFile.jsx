import React, { useState, useRef, useEffect } from 'react';
import useAxiosPublic from '../../../hooks/Axios';
import { useSocket } from '../../../hooks/socket.io/socketContext';

const UploadFile = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [summary, setSummary] = useState(null);

    // Live progress state, driven by socket events
    const [jobId, setJobId] = useState(null);
    const [progress, setProgress] = useState(null); // { phase, current, total, styleNo, rowsInGroup }

    const fileInputRef = useRef(null);
    const axiosPublic = useAxiosPublic();
    const socket = useSocket();

    // ── Listen for progress on the existing socket connection ─────────────
    useEffect(() => {
        if (!socket) {
            console.warn('⚠️ useSocket() returned null — no socket connection available');
            return;
        }
        console.log('🔌 Socket in UploadFile:', socket.id, socket.connected);

        const handleProgress = (data) => {
            console.log('📩 Received upload-progress:', data, 'current jobId state:', jobId);
            if (data.jobId !== jobId) return; // ignore other users' uploads
            setProgress(data);
        };

        const handleComplete = (data) => {
            if (data.jobId !== jobId) return;
            setSummary(data.summary);
            setSuccess(`✅ Import finished`);
            setLoading(false);
            setJobId(null);
        };

        const handleError = (data) => {
            if (data.jobId !== jobId) return;
            setError(data.message || 'Import failed on the server');
            setLoading(false);
            setJobId(null);
        };

        socket.on('upload-progress', handleProgress);
        socket.on('upload-complete', handleComplete);
        socket.on('upload-error', handleError);

        return () => {
            socket.off('upload-progress', handleProgress);
            socket.off('upload-complete', handleComplete);
            socket.off('upload-error', handleError);
        };
    }, [socket, jobId]);

    // Handle file selection
    const handleFileChange = (selectedFile) => {
        if (!selectedFile) return;

        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please upload a valid Excel file (.xlsx or .xls)');
            return;
        }

        if (selectedFile.size > 20 * 1024 * 1024) {
            setError('File size must be less than 20MB');
            return;
        }

        setFile(selectedFile);
        setError('');
        setSuccess('');
        setSummary(null);
        setProgress(null);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

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
        setSummary(null);
        setProgress(null);

        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axiosPublic.post("/api/upload", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const result = res.data;
            console.log('🎯 Upload response:', result);
            if (result.success) {
                // Server has only parsed the file so far — DB writes happen
                // in the background. Register the jobId so incoming socket
                // events are matched to this upload.
                setJobId(result.jobId);
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                // Loading stays true until 'upload-complete' arrives
            } else {
                setError(result.error || result.details || 'Failed to upload file');
                setLoading(false);
            }
        } catch (err) {
            const backendError = err.response?.data?.error;
            const backendDetails = err.response?.data?.details;
            const friendlyMessage = backendDetails
                ? `${backendError}: ${backendDetails}`
                : backendError;

            setError(friendlyMessage || err.message || 'Failed to upload file');
            console.error('Upload error:', err.response?.data || err);
            setLoading(false);
        }
    };

    const handleClear = () => {
        setFile(null);
        setError('');
        setSuccess('');
        setSummary(null);
        setProgress(null);
        setJobId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const percent = progress && progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

    const phaseLabel = () => {
        if (!progress) return 'Uploading & parsing…';
        if (progress.phase === 'starting') return 'Starting import…';
        if (progress.phase === 'inserting') {
            return `Inserting style ${progress.current}/${progress.total} — ${progress.styleNo}`;
        }
        if (progress.phase === 'error') {
            return `Skipped style ${progress.styleNo} (error) — ${progress.current}/${progress.total}`;
        }
        return 'Processing…';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                        📊 Style Requirement Import
                    </h1>
                    <p className="text-gray-600">
                        Upload your Excel file to import it directly
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
                                    Upload
                                </>
                            )}
                        </button>

                        {(file || summary) && !loading && (
                            <button
                                onClick={handleClear}
                                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Live progress bar */}
                    {loading && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-600">{phaseLabel()}</span>
                                <span className="text-xs font-semibold text-blue-700">{percent}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            {progress?.rowsInGroup !== undefined && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {progress.rowsInGroup} row(s) in this style
                                </p>
                            )}
                        </div>
                    )}

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
                    {success && !loading && (
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

                    {/* Summary */}
                    {summary && !loading && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 bg-blue-50 rounded-lg text-center">
                                <p className="text-2xl font-bold text-blue-700">{summary.stylesCreated}</p>
                                <p className="text-xs text-gray-600">Styles created</p>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-lg text-center">
                                <p className="text-2xl font-bold text-indigo-700">{summary.stylesUpdated}</p>
                                <p className="text-xs text-gray-600">Styles updated</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg text-center">
                                <p className="text-2xl font-bold text-green-700">{summary.rowsInserted}</p>
                                <p className="text-xs text-gray-600">Rows inserted</p>
                            </div>
                            <div className="p-3 bg-yellow-50 rounded-lg text-center">
                                <p className="text-2xl font-bold text-yellow-700">{summary.rowsSkipped}</p>
                                <p className="text-xs text-gray-600">Rows skipped</p>
                            </div>
                        </div>
                    )}

                    {/* Per-style errors, if any */}
                    {summary && summary.errors.length > 0 && !loading && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-700 mb-2">
                                {summary.errors.length} style(s) failed to import:
                            </p>
                            <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                                {summary.errors.map((e, i) => (
                                    <li key={i}>
                                        <span className="font-mono">{e.style}</span>: {e.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UploadFile;