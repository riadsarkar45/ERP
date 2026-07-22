import React, { useState, useRef, useEffect } from 'react';
import useAxiosPublic from '../../../hooks/Axios';
import { useSocket } from '../../../hooks/socket.io/socketContext';

const UploadFile = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dragActive, setDragActive] = useState(false);

    // ── Five separate progress states ──
    const [styleReqProgress, setStyleReqProgress] = useState(null);
    const [kwoProgress, setKwoProgress] = useState(null);
    const [awoProgress, setAwoProgress] = useState(null);
    const [dwoProgress, setDwoProgress] = useState(null);
    const [aopDelProgress, setAopDelProgress] = useState(null);

    const [styleReqSummary, setStyleReqSummary] = useState(null);
    const [kwoSummary, setKwoSummary] = useState(null);
    const [awoSummary, setAwoSummary] = useState(null);
    const [dwoSummary, setDwoSummary] = useState(null);
    const [aopDelSummary, setAopDelSummary] = useState(null);

    const [jobId, setJobId] = useState(null);
    const [expectedPhases, setExpectedPhases] = useState([]); // Dynamically tracks which sheets were found
    const [activePhase, setActivePhase] = useState(null); 

    const fileInputRef = useRef(null);
    const axiosPublic = useAxiosPublic();
    const socket = useSocket();

    // ── Socket listeners for ALL FIVE phases ────────────────────────
    useEffect(() => {
        if (!socket) {
            console.warn('⚠️ useSocket() returned null — no socket connection');
            return;
        }

        // Use functional updates to avoid stale closure issues
        const handleStyleReqProgress = (data) => { if (data.jobId !== jobId) return; setStyleReqProgress(data); setActivePhase('style-req'); };
        const handleStyleReqComplete = (data) => { if (data.jobId !== jobId) return; setStyleReqSummary(data.summary); setStyleReqProgress(prev => ({ ...(prev || {}), phase: 'complete' })); };
        const handleStyleReqError = (data) => { if (data.jobId !== jobId) return; setError(`Style Requirement failed: ${data.message}`); setLoading(false); setActivePhase(null); };

        const handleKwoProgress = (data) => { if (data.jobId !== jobId) return; setKwoProgress(data); setActivePhase('kwo'); };
        const handleKwoComplete = (data) => { if (data.jobId !== jobId) return; setKwoSummary(data.summary); setKwoProgress(prev => ({ ...(prev || {}), phase: 'complete' })); };
        const handleKwoError = (data) => { if (data.jobId !== jobId) return; setError(`K.W.O failed: ${data.message}`); setLoading(false); setActivePhase(null); };

        const handleAwoProgress = (data) => { if (data.jobId !== jobId) return; setAwoProgress(data); setActivePhase('awo'); };
        const handleAwoComplete = (data) => { if (data.jobId !== jobId) return; setAwoSummary(data.summary); setAwoProgress(prev => ({ ...(prev || {}), phase: 'complete' })); };
        const handleAwoError = (data) => { if (data.jobId !== jobId) return; setError(`A.W.O failed: ${data.message}`); setLoading(false); setActivePhase(null); };

        const handleDwoProgress = (data) => { if (data.jobId !== jobId) return; setDwoProgress(data); setActivePhase('dwo'); };
        const handleDwoComplete = (data) => { if (data.jobId !== jobId) return; setDwoSummary(data.summary); setDwoProgress(prev => ({ ...(prev || {}), phase: 'complete' })); };
        const handleDwoError = (data) => { if (data.jobId !== jobId) return; setError(`D.W.O failed: ${data.message}`); setLoading(false); setActivePhase(null); };

        const handleAopDelProgress = (data) => { if (data.jobId !== jobId) return; setAopDelProgress(data); setActivePhase('aop-del'); };
        const handleAopDelComplete = (data) => { if (data.jobId !== jobId) return; setAopDelSummary(data.summary); setAopDelProgress(prev => ({ ...(prev || {}), phase: 'complete' })); };

        // Register listeners
        socket.on('style-req-progress', handleStyleReqProgress);
        socket.on('style-req-complete', handleStyleReqComplete);
        socket.on('style-req-error', handleStyleReqError);
        socket.on('kwo-progress', handleKwoProgress);
        socket.on('kwo-complete', handleKwoComplete);
        socket.on('kwo-error', handleKwoError);
        socket.on('awo-progress', handleAwoProgress);
        socket.on('awo-complete', handleAwoComplete);
        socket.on('awo-error', handleAwoError);
        socket.on('dyeing-progress', handleDwoProgress);
        socket.on('dyeing-complete', handleDwoComplete);
        socket.on('dyeing-error', handleDwoError);
        socket.on('aop-delivery-progress', handleAopDelProgress);
        socket.on('aop-delivery-complete', handleAopDelComplete);

        return () => {
            socket.off('style-req-progress', handleStyleReqProgress);
            socket.off('style-req-complete', handleStyleReqComplete);
            socket.off('style-req-error', handleStyleReqError);
            socket.off('kwo-progress', handleKwoProgress);
            socket.off('kwo-complete', handleKwoComplete);
            socket.off('kwo-error', handleKwoError);
            socket.off('awo-progress', handleAwoProgress);
            socket.off('awo-complete', handleAwoComplete);
            socket.off('awo-error', handleAwoError);
            socket.off('dyeing-progress', handleDwoProgress);
            socket.off('dyeing-complete', handleDwoComplete);
            socket.off('dyeing-error', handleDwoError);
            socket.off('aop-delivery-progress', handleAopDelProgress);
            socket.off('aop-delivery-complete', handleAopDelComplete);
        };
    }, [socket, jobId]);

    // ── Dedicated Completion Checker ────────────────────────────────
    // This runs independently whenever any progress state updates, 
    // guaranteeing we always evaluate the absolute latest state.
    useEffect(() => {
        if (expectedPhases.length === 0) return;

        const isComplete = expectedPhases.every(phase => {
            if (phase === 'style-req') return styleReqProgress?.phase === 'complete';
            if (phase === 'kwo') return kwoProgress?.phase === 'complete';
            if (phase === 'awo') return awoProgress?.phase === 'complete';
            if (phase === 'dwo') return dwoProgress?.phase === 'complete';
            if (phase === 'aop-del') return aopDelProgress?.phase === 'complete';
            return true;
        });

        if (isComplete) {
            setSuccess('✅ All imports finished successfully!');
            setLoading(false);
            setActivePhase(null);
        }
    }, [expectedPhases, styleReqProgress, kwoProgress, awoProgress, dwoProgress, aopDelProgress]);

    // ── File handling ───────────────────────────────────────────────
    const handleFileChange = (selectedFile) => {
        if (!selectedFile) return;
        const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
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
        resetProgress();
    };

    const resetProgress = () => {
        setStyleReqProgress(null); setKwoProgress(null); setAwoProgress(null); setDwoProgress(null); setAopDelProgress(null);
        setStyleReqSummary(null); setKwoSummary(null); setAwoSummary(null); setDwoSummary(null); setAopDelSummary(null);
        setActivePhase(null);
        setExpectedPhases([]);
    };

    const handleDrag = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]);
    };

    const onInputChange = (e) => {
        if (e.target.files && e.target.files[0]) handleFileChange(e.target.files[0]);
    };

    // ── Upload ──────────────────────────────────────────────────────
    const handleUpload = async () => {
        if (!file) { setError('Please select a file first'); return; }
        setLoading(true); setError(''); setSuccess(''); resetProgress();

        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axiosPublic.post("/api/upload", formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const result = res.data;
            console.log('🎯 Upload response:', result);
            
            if (result.success) {
                setJobId(result.jobId);
                
                // Dynamically determine which phases are actually going to run based on backend response
                const phases = [];
                if (result.styleRequirement?.found) phases.push('style-req');
                if (result.kwo?.found) phases.push('kwo');
                if (result.awo?.found) phases.push('awo');
                if (result.dwo?.found) phases.push('dwo');
                if (result.aopDel?.found) phases.push('aop-del');
                
                setExpectedPhases(phases);
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                setError(result.error || result.details || 'Failed to upload file');
                setLoading(false);
            }
        } catch (err) {
            const backendError = err.response?.data?.error;
            const backendDetails = err.response?.data?.details;
            setError(backendDetails ? `${backendError}: ${backendDetails}` : backendError || err.message || 'Failed to upload file');
            console.error('Upload error:', err.response?.data || err);
            setLoading(false);
        }
    };

    const handleClear = () => {
        setFile(null); setError(''); setSuccess(''); resetProgress(); setJobId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    // ── Progress bar helpers ────────────────────────────────────────
    const getPercent = (progress) => {
        if (!progress || !progress.total || progress.total === 0) return 0;
        return Math.round((progress.current / progress.total) * 100);
    };

    const PHASE_NAMES = {
        'style-req': { short: 'Style Req', full: 'Style Requirement' },
        kwo: { short: 'K.W.O', full: 'K.W.O' },
        awo: { short: 'A.W.O', full: 'A.W.O' },
        dwo: { short: 'D.W.O', full: 'D.W.O' },
        'aop-del': { short: 'AOP Del', full: 'AOP DEL. & RCVD' },
    };

    const getPhaseLabel = (progress, type) => {
        const name = PHASE_NAMES[type];
        if (!progress) return `Waiting for ${name.full}…`;
        if (progress.phase === 'starting') return `${name.full}: Starting…`;
        if (progress.phase === 'inserting') {
            return `${name.short}: ${progress.current}/${progress.total} ${progress.challanNo ? `(Challan ${progress.challanNo})` : ''}`;
        }
        if (progress.phase === 'error') return `${name.short}: Skipped (error) — ${progress.current}/${progress.total}`;
        if (progress.phase === 'complete') return `${name.short}: ✅ Complete`;
        return 'Processing…';
    };

    const getBarColor = (type, phase) => {
        if (phase === 'complete') return 'bg-green-500';
        if (phase === 'error') return 'bg-red-500';
        if (type === 'style-req') return 'bg-blue-500';
        if (type === 'kwo') return 'bg-purple-500';
        if (type === 'awo') return 'bg-orange-500';
        if (type === 'dwo') return 'bg-teal-500';
        return 'bg-indigo-500'; // aop-del
    };

    const getPhaseDotColor = (type, isActive) => {
        if (!isActive) return 'bg-gray-300';
        if (type === 'style-req') return 'bg-blue-500 animate-pulse';
        if (type === 'kwo') return 'bg-purple-500 animate-pulse';
        if (type === 'awo') return 'bg-orange-500 animate-pulse';
        if (type === 'dwo') return 'bg-teal-500 animate-pulse';
        return 'bg-indigo-500 animate-pulse'; // aop-del
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">📊 Excel Import</h1>
                    <p className="text-gray-600">Upload Style Requirement + K.W.O + A.W.O + D.W.O + AOP DEL. sheets</p>
                </div>

                {/* Upload Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
                    {/* Drop Zone */}
                    <div
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all duration-300 ${dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
                    >
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onInputChange} className="hidden" />
                        <div className="flex flex-col items-center gap-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${dragActive ? 'bg-blue-500' : 'bg-blue-100'}`}>
                                <svg className={`w-8 h-8 ${dragActive ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-gray-700">{dragActive ? 'Drop your file here' : 'Drag & drop your Excel file here'}</p>
                                <p className="text-sm text-gray-500 mt-1">or <span className="text-blue-600 font-medium hover:underline">click to browse</span></p>
                                <p className="text-xs text-gray-400 mt-2">Supports .xlsx, .xls • Max 20MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Selected File Info */}
                    {file && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800 truncate max-w-xs md:max-w-md">{file.name}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleClear(); }} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Remove file">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button onClick={handleUpload} disabled={!file || loading} className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2">
                            {loading ? (
                                <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...</>
                            ) : (
                                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Upload</>
                            )}
                        </button>
                        {(file || styleReqSummary || kwoSummary || awoSummary || dwoSummary || aopDelSummary) && !loading && (
                            <button onClick={handleClear} className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">Clear</button>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════════
                        DYNAMIC PROGRESS BARS (Only shows phases found in file)
                        ═══════════════════════════════════════════════════ */}
                    {loading && expectedPhases.length > 0 && (
                        <div className="mt-6 space-y-4">
                            {/* Style Requirement */}
                            {expectedPhases.includes('style-req') && (
                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${getPhaseDotColor('style-req', activePhase === 'style-req')}`}></span>
                                            <span className="text-sm font-semibold text-gray-700">Style Requirement</span>
                                            {styleReqProgress?.phase === 'complete' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Done</span>}
                                        </div>
                                        <span className="text-xs font-bold text-blue-700">{getPercent(styleReqProgress)}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ease-out ${getBarColor('style-req', styleReqProgress?.phase)}`} style={{ width: `${getPercent(styleReqProgress)}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5">{getPhaseLabel(styleReqProgress, 'style-req')}</p>
                                </div>
                            )}

                            {/* K.W.O */}
                            {expectedPhases.includes('kwo') && (
                                <div className={`p-4 rounded-xl border transition-all ${activePhase === 'kwo' || kwoProgress ? 'bg-purple-50/50 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${getPhaseDotColor('kwo', activePhase === 'kwo')}`}></span>
                                            <span className="text-sm font-semibold text-gray-700">K.W.O (Knitting)</span>
                                            {kwoProgress?.phase === 'complete' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Done</span>}
                                        </div>
                                        <span className="text-xs font-bold text-purple-700">{getPercent(kwoProgress)}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ease-out ${getBarColor('kwo', kwoProgress?.phase)}`} style={{ width: `${getPercent(kwoProgress)}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5">{getPhaseLabel(kwoProgress, 'kwo')}</p>
                                </div>
                            )}

                            {/* A.W.O */}
                            {expectedPhases.includes('awo') && (
                                <div className={`p-4 rounded-xl border transition-all ${activePhase === 'awo' || awoProgress ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${getPhaseDotColor('awo', activePhase === 'awo')}`}></span>
                                            <span className="text-sm font-semibold text-gray-700">A.W.O (AOP)</span>
                                            {awoProgress?.phase === 'complete' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Done</span>}
                                        </div>
                                        <span className="text-xs font-bold text-orange-700">{getPercent(awoProgress)}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ease-out ${getBarColor('awo', awoProgress?.phase)}`} style={{ width: `${getPercent(awoProgress)}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5">{getPhaseLabel(awoProgress, 'awo')}</p>
                                </div>
                            )}

                            {/* D.W.O */}
                            {expectedPhases.includes('dwo') && (
                                <div className={`p-4 rounded-xl border transition-all ${activePhase === 'dwo' || dwoProgress ? 'bg-teal-50/50 border-teal-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${getPhaseDotColor('dwo', activePhase === 'dwo')}`}></span>
                                            <span className="text-sm font-semibold text-gray-700">D.W.O (Dyeing)</span>
                                            {dwoProgress?.phase === 'complete' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Done</span>}
                                        </div>
                                        <span className="text-xs font-bold text-teal-700">{getPercent(dwoProgress)}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ease-out ${getBarColor('dwo', dwoProgress?.phase)}`} style={{ width: `${getPercent(dwoProgress)}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5">{getPhaseLabel(dwoProgress, 'dwo')}</p>
                                </div>
                            )}

                            {/* AOP DEL. & RCVD */}
                            {expectedPhases.includes('aop-del') && (
                                <div className={`p-4 rounded-xl border transition-all ${activePhase === 'aop-del' || aopDelProgress ? 'bg-indigo-50/50 border-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${getPhaseDotColor('aop-del', activePhase === 'aop-del')}`}></span>
                                            <span className="text-sm font-semibold text-gray-700">AOP DEL. & RCVD</span>
                                            {aopDelProgress?.phase === 'complete' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Done</span>}
                                        </div>
                                        <span className="text-xs font-bold text-indigo-700">{getPercent(aopDelProgress)}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ease-out ${getBarColor('aop-del', aopDelProgress?.phase)}`} style={{ width: `${getPercent(aopDelProgress)}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5">{getPhaseLabel(aopDelProgress, 'aop-del')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && !loading && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════
                        DYNAMIC SUMMARY CARDS
                        ═══════════════════════════════════════════════════ */}
                    {(styleReqSummary || kwoSummary || awoSummary || dwoSummary || aopDelSummary) && !loading && (
                        <div className="mt-6 space-y-4">
                            {/* Style Req Summary */}
                            {styleReqSummary && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <h3 className="text-sm font-bold text-blue-800 mb-3">📋 Style Requirement Summary</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-blue-700">{styleReqSummary.stylesCreated}</p><p className="text-xs text-gray-600">Jobs created</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-indigo-700">{styleReqSummary.stylesUpdated}</p><p className="text-xs text-gray-600">Jobs updated</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-green-700">{styleReqSummary.rowsInserted}</p><p className="text-xs text-gray-600">Rows inserted</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-yellow-700">{styleReqSummary.rowsSkipped}</p><p className="text-xs text-gray-600">Rows skipped</p></div>
                                    </div>
                                    {styleReqSummary.errors?.length > 0 && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                            <p className="text-xs font-semibold text-red-700 mb-1">{styleReqSummary.errors.length} error(s):</p>
                                            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside max-h-32 overflow-y-auto">
                                                {styleReqSummary.errors.map((e, i) => <li key={i}><span className="font-mono">{e.jobNo}</span>: {e.message}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* KWO Summary */}
                            {kwoSummary && (
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                    <h3 className="text-sm font-bold text-purple-800 mb-3">🧵 K.W.O Summary</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-purple-700">{kwoSummary.workOrdersCreated}</p><p className="text-xs text-gray-600">WO created</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-indigo-700">{kwoSummary.workOrdersUpdated}</p><p className="text-xs text-gray-600">WO updated</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-green-700">{kwoSummary.compositionsInserted}</p><p className="text-xs text-gray-600">Compositions</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-yellow-700">{kwoSummary.rowsSkipped}</p><p className="text-xs text-gray-600">Rows skipped</p></div>
                                    </div>
                                    {kwoSummary.errors?.length > 0 && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                            <p className="text-xs font-semibold text-red-700 mb-1">{kwoSummary.errors.length} error(s):</p>
                                            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside max-h-32 overflow-y-auto">
                                                {kwoSummary.errors.map((e, i) => <li key={i}><span className="font-mono">{e.workOrderNo}</span>: {e.message}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AWO Summary */}
                            {awoSummary && (
                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                                    <h3 className="text-sm font-bold text-orange-800 mb-3">🎨 A.W.O Summary</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-orange-700">{awoSummary.workOrdersCreated}</p><p className="text-xs text-gray-600">WO created</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-indigo-700">{awoSummary.workOrdersUpdated}</p><p className="text-xs text-gray-600">WO updated</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-green-700">{awoSummary.compositionsInserted}</p><p className="text-xs text-gray-600">Compositions</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-yellow-700">{awoSummary.rowsSkipped}</p><p className="text-xs text-gray-600">Rows skipped</p></div>
                                    </div>
                                    {awoSummary.errors?.length > 0 && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                            <p className="text-xs font-semibold text-red-700 mb-1">{awoSummary.errors.length} error(s):</p>
                                            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside max-h-32 overflow-y-auto">
                                                {awoSummary.errors.map((e, i) => <li key={i}><span className="font-mono">{e.workOrderNo}</span>: {e.message}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DWO Summary */}
                            {dwoSummary && (
                                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                                    <h3 className="text-sm font-bold text-teal-800 mb-3">🧪 D.W.O Summary</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-teal-700">{dwoSummary.workOrdersCreated}</p><p className="text-xs text-gray-600">WO created</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-indigo-700">{dwoSummary.workOrdersUpdated}</p><p className="text-xs text-gray-600">WO updated</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-green-700">{dwoSummary.compositionsInserted}</p><p className="text-xs text-gray-600">Compositions</p></div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm"><p className="text-2xl font-bold text-yellow-700">{dwoSummary.rowsSkipped}</p><p className="text-xs text-gray-600">Rows skipped</p></div>
                                    </div>
                                    {dwoSummary.errors?.length > 0 && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                            <p className="text-xs font-semibold text-red-700 mb-1">{dwoSummary.errors.length} error(s):</p>
                                            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside max-h-32 overflow-y-auto">
                                                {dwoSummary.errors.map((e, i) => <li key={i}><span className="font-mono">{e.workOrderNo}</span>: {e.message}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AOP DEL. & RCVD Summary */}
                            {aopDelSummary && (
                                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                                    <h3 className="text-sm font-bold text-indigo-800 mb-3">🚚 AOP DEL. & RCVD Summary</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm">
                                            <p className="text-2xl font-bold text-indigo-700">{aopDelSummary.deliveriesCreated}</p>
                                            <p className="text-xs text-gray-600">Deliveries created</p>
                                        </div>
                                        <div className="p-3 bg-white rounded-lg text-center shadow-sm">
                                            <p className="text-2xl font-bold text-yellow-700">{aopDelSummary.rowsSkipped}</p>
                                            <p className="text-xs text-gray-600">Rows skipped</p>
                                        </div>
                                    </div>
                                    {aopDelSummary.errors?.length > 0 && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                            <p className="text-xs font-semibold text-red-700 mb-1">{aopDelSummary.errors.length} error(s):</p>
                                            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside max-h-32 overflow-y-auto">
                                                {aopDelSummary.errors.map((e, i) => (
                                                    <li key={i}>
                                                        <span className="font-mono">Challan {e.challanNo} ({e.deliveryType})</span>: {e.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UploadFile;