// 'use client';

// import { useState, useCallback, useEffect } from 'react';
// import { FaUpload, FaFileCsv, FaCheckCircle, FaTimesCircle, FaSpinner, FaCloudUploadAlt, FaList, FaSync } from 'react-icons/fa';

// export default function BulkUpload({ onUploadComplete }) {
//     const [files, setFiles] = useState([]);
//     const [batchId, setBatchId] = useState(null);
//     const [batchStatus, setBatchStatus] = useState(null);
//     const [isUploading, setIsUploading] = useState(false);
//     const [isProcessing, setIsProcessing] = useState(false);
//     const [error, setError] = useState(null);
//     const [uploadProgress, setUploadProgress] = useState(0);
//     const [selectedFiles, setSelectedFiles] = useState([]);
//     const [dragActive, setDragActive] = useState(false);

//     // Poll for batch status when processing
//     useEffect(() => {
//         if (!batchId || batchStatus?.status === 'COMPLETED' || batchStatus?.status === 'FAILED' || batchStatus?.status === 'PARTIAL') {
//             return;
//         }

//         const pollInterval = setInterval(async () => {
//             try {
//                 const response = await fetch(`http://localhost:3001/api/upload/bulk/${batchId}/status`);
//                 const data = await response.json();

//                 if (data.success) {
//                     setBatchStatus(data.data);

//                     if (['COMPLETED', 'FAILED', 'PARTIAL'].includes(data.data.status)) {
//                         setIsProcessing(false);
//                         if (onUploadComplete) {
//                             onUploadComplete(data.data);
//                         }
//                     }
//                 }
//             } catch (err) {
//                 console.error('Error polling batch status:', err);
//             }
//         }, 2000); // Poll every 2 seconds

//         return () => clearInterval(pollInterval);
//     }, [batchId, batchStatus?.status, onUploadComplete]);

//     const handleFilesSelect = useCallback((e) => {
//         const selected = Array.from(e.target.files).filter(f => f.name.endsWith('.csv'));

//         if (selected.length === 0) {
//             setError('Please select CSV files only');
//             return;
//         }

//         if (selected.length > 500) {
//             setError('Maximum 500 files per upload');
//             return;
//         }

//         setSelectedFiles(selected);
//         setError(null);
//     }, []);

//     const handleDrag = useCallback((e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         if (e.type === 'dragenter' || e.type === 'dragover') {
//             setDragActive(true);
//         } else if (e.type === 'dragleave') {
//             setDragActive(false);
//         }
//     }, []);

//     const handleDrop = useCallback((e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         setDragActive(false);

//         if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
//             const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
//             handleFilesSelect({ target: { files: dropped } });
//         }
//     }, [handleFilesSelect]);

//     const uploadToMinIO = async (file, presignedUrl) => {
//         const response = await fetch(presignedUrl, {
//             method: 'PUT',
//             body: file,
//             headers: {
//                 'Content-Type': 'text/csv',
//             },
//         });

//         if (!response.ok) {
//             throw new Error(`Failed to upload ${file.name}`);
//         }
//     };

//     const handleUpload = async () => {
//         if (selectedFiles.length === 0) {
//             setError('Please select files first');
//             return;
//         }

//         setIsUploading(true);
//         setUploadProgress(0);
//         setError(null);
//         setBatchStatus(null);

//         try {
//             // Step 1: Get presigned URLs
//             const presignResponse = await fetch('http://localhost:3001/api/upload/bulk/presign', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     files: selectedFiles.map(f => ({ name: f.name, size: f.size }))
//                 })
//             });

//             const presignData = await presignResponse.json();

//             if (!presignData.success) {
//                 throw new Error(presignData.error || 'Failed to get upload URLs');
//             }

//             // Step 2: Upload files to MinIO
//             const totalFiles = presignData.data.files.length;
//             let uploadedCount = 0;

//             for (const fileInfo of presignData.data.files) {
//                 if (fileInfo.uploadUrl) {
//                     const file = selectedFiles.find(f => f.name === fileInfo.fileName);
//                     if (file) {
//                         await uploadToMinIO(file, fileInfo.uploadUrl);
//                     }
//                 }
//                 uploadedCount++;
//                 setUploadProgress((uploadedCount / totalFiles) * 50); // First 50% for upload
//             }

//             // Step 3: Trigger async processing
//             const processResponse = await fetch('http://localhost:3001/api/upload/bulk/process', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     batchId: presignData.data.batchId,
//                     objectKeys: presignData.data.files.map(f => f.objectKey),
//                     fileNames: presignData.data.files.map(f => f.fileName)
//                 })
//             });

//             const processData = await processResponse.json();

//             if (!processData.success) {
//                 throw new Error(processData.error || 'Failed to start processing');
//             }

//             setBatchId(processData.data.batchId);
//             setIsUploading(false);
//             setIsProcessing(true);
//             setUploadProgress(50);

//         } catch (err) {
//             setIsUploading(false);
//             setError(err.message || 'Upload failed');
//         }
//     };

//     const resetUpload = () => {
//         setSelectedFiles([]);
//         setBatchId(null);
//         setBatchStatus(null);
//         setIsUploading(false);
//         setIsProcessing(false);
//         setUploadProgress(0);
//         setError(null);
//     };

//     const formatFileSize = (bytes) => {
//         if (bytes < 1024) return bytes + ' B';
//         if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
//         return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
//     };

//     const formatTime = (dateString) => {
//         if (!dateString) return '-';
//         return new Date(dateString).toLocaleString();
//     };

//     const getStatusBadge = (status) => {
//         const badges = {
//             PENDING: 'bg-yellow-100 text-yellow-800',
//             PROCESSING: 'bg-blue-100 text-blue-800',
//             COMPLETED: 'bg-green-100 text-green-800',
//             FAILED: 'bg-red-100 text-red-800',
//             PARTIAL: 'bg-orange-100 text-orange-800',
//         };
//         return badges[status] || 'bg-gray-100 text-gray-800';
//     };

//     const getFileStatusIcon = (status) => {
//         switch (status) {
//             case 'COMPLETED': return <FaCheckCircle className="text-green-500" />;
//             case 'FAILED': return <FaTimesCircle className="text-red-500" />;
//             case 'PROCESSING': return <FaSpinner className="text-blue-500 animate-spin" />;
//             default: return <FaClock className="text-gray-400" />;
//         }
//     };

//     return (
//         <div className="space-y-6">
//             {/* File Selection Area */}
//             <div
//                 className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
//                     dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-300'
//                 } ${error ? 'border-red-300 bg-red-50' : ''}`}
//                 onDragEnter={handleDrag}
//                 onDragLeave={handleDrag}
//                 onDragOver={handleDrag}
//                 onDrop={handleDrop}
//             >
//                 <input
//                     type="file"
//                     multiple
//                     accept=".csv"
//                     onChange={handleFilesSelect}
//                     className="hidden"
//                     id="bulk-file-upload"
//                     disabled={isUploading || isProcessing}
//                 />

//                 {!batchStatus ? (
//                     <div className="space-y-4">
//                         <FaCloudUploadAlt className={`mx-auto text-5xl ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />

//                         <div>
//                             <label
//                                 htmlFor="bulk-file-upload"
//                                 className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
//                             >
//                                 Click to browse or drag and drop
//                             </label>
//                             <p className="text-sm text-gray-500 mt-1">Select multiple CSV files (max 500)</p>
//                         </div>

//                         {selectedFiles.length > 0 && (
//                             <div className="text-left max-h-48 overflow-y-auto">
//                                 <div className="flex items-center justify-between mb-2">
//                                     <span className="font-medium text-gray-700">
//                                         {selectedFiles.length} files selected
//                                     </span>
//                                     <button
//                                         onClick={() => setSelectedFiles([])}
//                                         className="text-sm text-red-600 hover:text-red-800"
//                                     >
//                                         Clear all
//                                     </button>
//                                 </div>
//                                 <ul className="space-y-1 text-sm text-gray-600">
//                                     {selectedFiles.slice(0, 10).map((file, i) => (
//                                         <li key={i} className="flex items-center justify-between">
//                                             <span className="truncate flex-1">{file.name}</span>
//                                             <span className="text-gray-400 ml-2">{formatFileSize(file.size)}</span>
//                                         </li>
//                                     ))}
//                                     {selectedFiles.length > 10 && (
//                                         <li className="text-gray-400 italic">
//                                             ... and {selectedFiles.length - 10} more files
//                                         </li>
//                                     )}
//                                 </ul>
//                             </div>
//                         )}

//                         <div className="flex justify-center space-x-3">
//                             <button
//                                 onClick={handleUpload}
//                                 disabled={isUploading || selectedFiles.length === 0}
//                                 className={`px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 ${
//                                     isUploading || selectedFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
//                                 }`}
//                             >
//                                 {isUploading ? (
//                                     <>
//                                         <FaSpinner className="inline mr-2 animate-spin" />
//                                         Uploading...
//                                     </>
//                                 ) : (
//                                     <>
//                                         <FaUpload className="inline mr-2" />
//                                         Upload & Process
//                                     </>
//                                 )}
//                             </button>

//                             {selectedFiles.length > 0 && !isUploading && (
//                                 <button
//                                     onClick={resetUpload}
//                                     className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
//                                 >
//                                     Cancel
//                                 </button>
//                             )}
//                         </div>
//                     </div>
//                 ) : (
//                     /* Processing Status Display */
//                     <div className="space-y-4">
//                         <div className="flex items-center justify-between">
//                             <h3 className="text-lg font-medium text-gray-800">Batch Processing</h3>
//                             <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(batchStatus.status)}`}>
//                                 {batchStatus.status}
//                             </span>
//                         </div>

//                         {/* Overall Progress */}
//                         <div>
//                             <div className="flex justify-between text-sm text-gray-600 mb-1">
//                                 <span>Progress</span>
//                                 <span>{batchStatus.progress.toFixed(1)}%</span>
//                             </div>
//                             <div className="w-full bg-gray-200 rounded-full h-4">
//                                 <div
//                                     className={`h-4 rounded-full transition-all duration-500 ${
//                                         batchStatus.status === 'FAILED' ? 'bg-red-500' :
//                                         batchStatus.status === 'COMPLETED' ? 'bg-green-500' :
//                                         'bg-blue-500'
//                                     }`}
//                                     style={{ width: `${batchStatus.progress}%` }}
//                                 ></div>
//                             </div>
//                         </div>

//                         {/* Stats */}
//                         <div className="grid grid-cols-4 gap-4 text-center">
//                             <div className="bg-gray-50 rounded-lg p-3">
//                                 <div className="text-2xl font-bold text-gray-800">{batchStatus.totalFiles}</div>
//                                 <div className="text-xs text-gray-500">Total Files</div>
//                             </div>
//                             <div className="bg-green-50 rounded-lg p-3">
//                                 <div className="text-2xl font-bold text-green-600">{batchStatus.processedFiles}</div>
//                                 <div className="text-xs text-gray-500">Processed</div>
//                             </div>
//                             <div className="bg-red-50 rounded-lg p-3">
//                                 <div className="text-2xl font-bold text-red-600">{batchStatus.failedFiles}</div>
//                                 <div className="text-xs text-gray-500">Failed</div>
//                             </div>
//                             <div className="bg-blue-50 rounded-lg p-3">
//                                 <div className="text-2xl font-bold text-blue-600">{batchStatus.pendingFiles}</div>
//                                 <div className="text-xs text-gray-500">Pending</div>
//                             </div>
//                         </div>

//                         {/* File List */}
//                         {batchStatus.files && batchStatus.files.length > 0 && (
//                             <div className="max-h-64 overflow-y-auto">
//                                 <table className="w-full text-sm">
//                                     <thead className="bg-gray-100 sticky top-0">
//                                         <tr>
//                                             <th className="text-left p-2">File</th>
//                                             <th className="text-left p-2">Status</th>
//                                             <th className="text-left p-2">Records</th>
//                                             <th className="text-left p-2">Time</th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         {batchStatus.files.map((file, i) => (
//                                             <tr key={i} className="border-b border-gray-100">
//                                                 <td className="p-2 truncate max-w-xs" title={file.fileName}>
//                                                     {file.fileName}
//                                                 </td>
//                                                 <td className="p-2">
//                                                     <span className={`inline-flex items-center ${getStatusBadge(file.status)} px-2 py-0.5 rounded text-xs`}>
//                                                         {getFileStatusIcon(file.status)}
//                                                         <span className="ml-1">{file.status}</span>
//                                                     </span>
//                                                 </td>
//                                                 <td className="p-2">{file.recordsProcessed || '-'}</td>
//                                                 <td className="p-2 text-gray-500">{formatTime(file.processedAt)}</td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                 </table>
//                             </div>
//                         )}

//                         {/* Actions */}
//                         {['COMPLETED', 'FAILED', 'PARTIAL'].includes(batchStatus.status) && (
//                             <div className="flex justify-center space-x-3 pt-4 border-t">
//                                 <button
//                                     onClick={resetUpload}
//                                     className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
//                                 >
//                                     <FaUpload className="inline mr-2" />
//                                     Upload More Files
//                                 </button>

//                                 {batchStatus.status === 'PARTIAL' && (
//                                     <a
//                                         href={`/api/upload/bulk/${batchId}/retry`}
//                                         method="POST"
//                                         className="px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors duration-200"
//                                     >
//                                         <FaSync className="inline mr-2" />
//                                         Retry Failed
//                                     </a>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>

//             {/* Error Display */}
//             {error && (
//                 <div className="flex items-center p-4 bg-red-100 border border-red-200 rounded-lg">
//                     <FaTimesCircle className="text-red-600 mr-3" />
//                     <span className="text-red-700">{error}</span>
//                 </div>
//             )}

//             {/* Requirements Info */}
//             <div className="p-4 bg-gray-50 rounded-lg text-sm">
//                 <h4 className="font-medium text-gray-800 mb-2">File Requirements:</h4>
//                 <ul className="list-disc list-inside space-y-1 text-gray-600">
//                     <li>File format: CSV (.csv)</li>
//                     <li>Maximum 500 files per upload batch</li>
//                     <li>Required columns: Date, Ticker, Close</li>
//                     <li>Optional columns: Open, High, Low, Volume, OpenInterest</li>
//                     <li>Date format: YYYY-MM-DD</li>
//                     <li>Processing happens asynchronously - you can leave this page</li>
//                 </ul>
//             </div>
//         </div>
//     );
// }

// // Helper component for clock icon
// function FaClock({ className }) {
//     return (
//         <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" width="1em" height="1em">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//         </svg>
//     );
// }



'use client';

import { useState, useCallback, useEffect } from 'react';
import { FaUpload, FaFileCsv, FaCheckCircle, FaTimesCircle, FaSpinner, FaCloudUploadAlt, FaList, FaSync } from 'react-icons/fa';

export default function BulkUpload({ onUploadComplete }) {
    const [files, setFiles] = useState([]);
    const [batchId, setBatchId] = useState(null);
    const [batchStatus, setBatchStatus] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);

    // Poll for batch status when processing
    useEffect(() => {
        if (!batchId || batchStatus?.status === 'COMPLETED' || batchStatus?.status === 'FAILED' || batchStatus?.status === 'PARTIAL') {
            return;
        }

        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`http://localhost:3001/api/upload/bulk/${batchId}/status`);
                const data = await response.json();

                if (data.success) {
                    setBatchStatus(data.data);

                    if (['COMPLETED', 'FAILED', 'PARTIAL'].includes(data.data.status)) {
                        setIsProcessing(false);
                        if (onUploadComplete) {
                            onUploadComplete(data.data);
                        }
                    }
                }
            } catch (err) {
                console.error('Error polling batch status:', err);
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(pollInterval);
    }, [batchId, batchStatus?.status, onUploadComplete]);

    const handleFilesSelect = useCallback((e) => {
        const selected = Array.from(e.target.files).filter(f => f.name.endsWith('.csv'));

        if (selected.length === 0) {
            setError('Please select CSV files only');
            return;
        }

        if (selected.length > 500) {
            setError('Maximum 500 files per upload');
            return;
        }

        setSelectedFiles(selected);
        setError(null);
    }, []);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
            handleFilesSelect({ target: { files: dropped } });
        }
    }, [handleFilesSelect]);

    const uploadToMinIO = async (file, presignedUrl) => {
        const response = await fetch(presignedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': 'text/csv',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            setError('Please select files first');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setError(null);
        setBatchStatus(null);

        try {
            // Step 1: Get presigned URLs
            const presignResponse = await fetch('http://localhost:3001/api/upload/bulk/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: selectedFiles.map(f => ({ name: f.name, size: f.size }))
                })
            });

            const presignData = await presignResponse.json();

            if (!presignData.success) {
                throw new Error(presignData.error || 'Failed to get upload URLs');
            }

            // Step 2: Upload files to MinIO
            const totalFiles = presignData.data.files.length;
            let uploadedCount = 0;

            for (const fileInfo of presignData.data.files) {
                if (fileInfo.uploadUrl) {
                    const file = selectedFiles.find(f => f.name === fileInfo.fileName);
                    if (file) {
                        await uploadToMinIO(file, fileInfo.uploadUrl);
                    }
                }
                uploadedCount++;
                setUploadProgress((uploadedCount / totalFiles) * 50); // First 50% for upload
            }

            // Step 3: Trigger async processing
            const processResponse = await fetch('http://localhost:3001/api/upload/bulk/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batchId: presignData.data.batchId,
                    objectKeys: presignData.data.files.map(f => f.objectKey),
                    fileNames: presignData.data.files.map(f => f.fileName)
                })
            });

            const processData = await processResponse.json();

            if (!processData.success) {
                throw new Error(processData.error || 'Failed to start processing');
            }

            setBatchId(processData.data.batchId);
            setIsUploading(false);
            setIsProcessing(true);
            setUploadProgress(50);

        } catch (err) {
            setIsUploading(false);
            setError(err.message || 'Upload failed');
        }
    };

    const resetUpload = () => {
        setSelectedFiles([]);
        setBatchId(null);
        setBatchStatus(null);
        setIsUploading(false);
        setIsProcessing(false);
        setUploadProgress(0);
        setError(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            PROCESSING: 'bg-blue-100 text-blue-800',
            COMPLETED: 'bg-green-100 text-green-800',
            FAILED: 'bg-red-100 text-red-800',
            PARTIAL: 'bg-orange-100 text-orange-800',
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    };

    const getFileStatusIcon = (status) => {
        switch (status) {
            case 'COMPLETED': return <FaCheckCircle className="text-green-500" />;
            case 'FAILED': return <FaTimesCircle className="text-red-500" />;
            case 'PROCESSING': return <FaSpinner className="text-blue-500 animate-spin" />;
            default: return <FaClock className="text-gray-400" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* File Selection Area */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-300'
                    } ${error ? 'border-red-300 bg-red-50' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    multiple
                    accept=".csv"
                    onChange={handleFilesSelect}
                    className="hidden"
                    id="bulk-file-upload"
                    disabled={isUploading || isProcessing}
                />

                {!batchStatus ? (
                    <div className="space-y-4">
                        <FaCloudUploadAlt className={`mx-auto text-5xl ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />

                        <div>
                            <label
                                htmlFor="bulk-file-upload"
                                className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Click to browse or drag and drop
                            </label>
                            <p className="text-sm text-gray-500 mt-1">Select multiple CSV files (max 500)</p>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="text-left max-h-48 overflow-y-auto">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-700">
                                        {selectedFiles.length} files selected
                                    </span>
                                    <button
                                        onClick={() => setSelectedFiles([])}
                                        className="text-sm text-red-600 hover:text-red-800"
                                    >
                                        Clear all
                                    </button>
                                </div>
                                <ul className="space-y-1 text-sm text-gray-600">
                                    {selectedFiles.slice(0, 10).map((file, i) => (
                                        <li key={i} className="flex items-center justify-between">
                                            <span className="truncate flex-1">{file.name}</span>
                                            <span className="text-gray-400 ml-2">{formatFileSize(file.size)}</span>
                                        </li>
                                    ))}
                                    {selectedFiles.length > 10 && (
                                        <li className="text-gray-400 italic">
                                            ... and {selectedFiles.length - 10} more files
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-center space-x-3">
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || selectedFiles.length === 0}
                                className={`px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 ${isUploading || selectedFiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                            >
                                {isUploading ? (
                                    <>
                                        <FaSpinner className="inline mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <FaUpload className="inline mr-2" />
                                        Upload & Process
                                    </>
                                )}
                            </button>

                            {selectedFiles.length > 0 && !isUploading && (
                                <button
                                    onClick={resetUpload}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Processing Status Display */
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-800">Batch Processing</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(batchStatus.status)}`}>
                                {batchStatus.status}
                            </span>
                        </div>

                        {/* Overall Progress */}
                        <div>
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>{batchStatus.progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className={`h-4 rounded-full transition-all duration-500 ${batchStatus.status === 'FAILED' ? 'bg-red-500' :
                                        batchStatus.status === 'COMPLETED' ? 'bg-green-500' :
                                            'bg-blue-500'
                                        }`}
                                    style={{ width: `${batchStatus.progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-gray-800">{batchStatus.totalFiles}</div>
                                <div className="text-xs text-gray-500">Total Files</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-green-600">{batchStatus.processedFiles}</div>
                                <div className="text-xs text-gray-500">Processed</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-red-600">{batchStatus.failedFiles}</div>
                                <div className="text-xs text-gray-500">Failed</div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-blue-600">{batchStatus.pendingFiles}</div>
                                <div className="text-xs text-gray-500">Pending</div>
                            </div>
                        </div>

                        {/* File List */}
                        {batchStatus.files && batchStatus.files.length > 0 && (
                            <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="text-left p-2">File</th>
                                            <th className="text-left p-2">Status</th>
                                            <th className="text-left p-2">Records</th>
                                            <th className="text-left p-2">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batchStatus.files.map((file, i) => (
                                            <tr key={i} className="border-b border-gray-100">
                                                <td className="p-2 truncate max-w-xs" title={file.fileName}>
                                                    {file.fileName}
                                                </td>
                                                <td className="p-2">
                                                    <span className={`inline-flex items-center ${getStatusBadge(file.status)} px-2 py-0.5 rounded text-xs`}>
                                                        {getFileStatusIcon(file.status)}
                                                        <span className="ml-1">{file.status}</span>
                                                    </span>
                                                </td>
                                                <td className="p-2">{file.recordsProcessed || '-'}</td>
                                                <td className="p-2 text-gray-500">{formatTime(file.processedAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Actions */}
                        {['COMPLETED', 'FAILED', 'PARTIAL'].includes(batchStatus.status) && (
                            <div className="flex justify-center space-x-3 pt-4 border-t">
                                <button
                                    onClick={resetUpload}
                                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                                >
                                    <FaUpload className="inline mr-2" />
                                    Upload More Files
                                </button>

                                {batchStatus.status === 'PARTIAL' && (
                                    <a
                                        href={`/api/upload/bulk/${batchId}/retry`}
                                        method="POST"
                                        className="px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors duration-200"
                                    >
                                        <FaSync className="inline mr-2" />
                                        Retry Failed
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex items-center p-4 bg-red-100 border border-red-200 rounded-lg">
                    <FaTimesCircle className="text-red-600 mr-3" />
                    <span className="text-red-700">{error}</span>
                </div>
            )}

            {/* Requirements Info */}
            <div className="p-4 bg-gray-50 rounded-lg text-sm">
                <h4 className="font-medium text-gray-800 mb-2">File Requirements:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>File format: CSV (.csv)</li>
                    <li>Maximum 500 files per upload batch</li>
                    <li>Required columns: Date, Ticker, Close</li>
                    <li>Optional columns: Open, High, Low, Volume, OpenInterest</li>
                    <li>Date format: YYYY-MM-DD</li>
                    <li>Processing happens asynchronously - you can leave this page</li>
                </ul>
            </div>
        </div>
    );
}

// Helper component for clock icon
function FaClock({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" width="1em" height="1em">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}