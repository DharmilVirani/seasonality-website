'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { FaTrash, FaSyncAlt, FaDownload, FaSearch, FaUpload, FaFolderOpen } from 'react-icons/fa'
import BulkUpload from '../BulkUpload'

export default function DataManagement() {
    const [tickData, setTickData] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedTicker, setSelectedTicker] = useState(null)
    const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'browse'
    const [batches, setBatches] = useState([])
    const [isLoadingBatches, setIsLoadingBatches] = useState(false)

    // API base URL
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    // Fetch ticker data
    const fetchData = async () => {
        try {
            setIsLoading(true)
            const response = await axios.get(`${API_BASE_URL}/api/data/tickers`)
            if (response.data.success) {
                setTickData(response.data.data)
            }
        } catch (error) {
            console.error('Error fetching ticker data:', error)
            toast.error('Failed to fetch ticker data')
        } finally {
            setIsLoading(false)
        }
    }

    // Initial fetch and setup polling
    useEffect(() => {
        fetchData()

        // Set up polling every 30 seconds
        const intervalId = setInterval(fetchData, 30000)

        return () => clearInterval(intervalId)
    }, [])

    // Fetch batches when browse tab is active
    useEffect(() => {
        if (activeTab === 'browse') {
            fetchBatches()
        }
    }, [activeTab])

    const fetchBatches = async () => {
        try {
            setIsLoadingBatches(true)
            const response = await axios.get(`${API_BASE_URL}/api/upload/bulk`)
            if (response.data.success) {
                setBatches(response.data.data.batches)
            }
        } catch (error) {
            console.error('Error fetching batches:', error)
        } finally {
            setIsLoadingBatches(false)
        }
    }

    const filteredData = tickData.filter((ticker) => ticker.symbol.toLowerCase().includes(searchTerm.toLowerCase()))

    const handleRefresh = async () => {
        try {
            setIsLoading(true)
            const response = await axios.get(`${API_BASE_URL}/api/data/tickers`)
            if (response.data.success) {
                setTickData(response.data.data)
                toast.success('Data refreshed successfully')
            }
        } catch (error) {
            console.error('Error refreshing data:', error)
            toast.error('Failed to refresh data')
        } finally {
            setIsLoading(false)
        }
    }

    const handleExport = () => {
        // This would be implemented with actual export functionality
        toast.info('Export functionality would be implemented here')
    }

    const handleUploadComplete = (batchData) => {
        toast.success(`Batch ${batchData.batchId} completed! ${batchData.processedFiles} files processed.`)
        if (batchData.failedFiles > 0) {
            toast.warn(`${batchData.failedFiles} files failed.`)
        }
        // No need to manually refresh - polling will handle it automatically
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString()
    }

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            PROCESSING: 'bg-blue-100 text-blue-800',
            COMPLETED: 'bg-green-100 text-green-800',
            FAILED: 'bg-red-100 text-red-800',
            PARTIAL: 'bg-orange-100 text-orange-800',
        }
        return badges[status] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div>
            {/* Tab Navigation */}
            <div className='flex border-b border-gray-200 mb-6'>
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex items-center px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'upload'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FaUpload className='mr-2' />
                    Upload Data
                </button>
                <button
                    onClick={() => setActiveTab('browse')}
                    className={`flex items-center px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'browse'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <FaFolderOpen className='mr-2' />
                    Browse Data
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'upload' ? (
                <div>
                    <BulkUpload onUploadComplete={handleUploadComplete} />
                </div>
            ) : (
                <div>
                    {/* Header */}
                    <div className='flex flex-wrap justify-between items-center mb-6'>
                        <h3 className='text-xl font-semibold text-gray-700'>Data Management</h3>
                        <div className='flex space-x-2'>
                            <button
                                onClick={handleRefresh}
                                className='btn-secondary flex items-center'
                                disabled={isLoading}
                            >
                                <FaSyncAlt className='mr-2' />
                                Refresh
                            </button>
                            <button onClick={handleExport} className='btn-secondary flex items-center'>
                                <FaDownload className='mr-2' />
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className='mb-4'>
                        <div className='relative'>
                            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                                <FaSearch className='text-gray-400' />
                            </div>
                            <input
                                type='text'
                                placeholder='Search tickers...'
                                className='form-input pl-10'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className='overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200'>
                        <table className='w-full'>
                            <thead className='bg-gray-50'>
                                <tr>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Ticker Symbol
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Data Points
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Last Updated
                                    </th>
                                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='bg-white divide-y divide-gray-200'>
                                {filteredData.length > 0 ? (
                                    filteredData.map((ticker) => (
                                        <tr key={ticker.id}>
                                            <td className='px-6 py-4 whitespace-nowrap'>
                                                <div className='text-sm font-medium text-gray-900'>{ticker.symbol}</div>
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap'>
                                                <div className='text-sm text-gray-500'>-</div>
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap'>
                                                <div className='text-sm text-gray-500'>
                                                    {formatDate(ticker.updatedAt)}
                                                </div>
                                            </td>
                                            <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                                                <button
                                                    onClick={() => setSelectedTicker(ticker)}
                                                    className='text-blue-600 hover:text-blue-900'
                                                >
                                                    View
                                                </button>
                                                <button className='text-red-600 hover:text-red-900'>
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan='4' className='px-6 py-4 text-center text-gray-500'>
                                            {isLoading ? 'Loading...' : 'No ticker data found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Ticker Details Modal */}
            {selectedTicker && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl'>
                        <div className='flex justify-between items-center mb-4'>
                            <h3 className='text-lg font-semibold text-gray-800'>
                                Ticker Details: {selectedTicker.symbol}
                            </h3>
                            <button
                                onClick={() => setSelectedTicker(null)}
                                className='text-gray-400 hover:text-gray-600'
                            >
                                <span className='text-xl'>&times;</span>
                            </button>
                        </div>

                        <div className='space-y-4'>
                            <div>
                                <h4 className='font-medium text-gray-700 mb-2'>Ticker Information</h4>
                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <div className='text-sm text-gray-500'>Symbol</div>
                                        <div className='font-medium'>{selectedTicker.symbol}</div>
                                    </div>
                                    <div>
                                        <div className='text-sm text-gray-500'>ID</div>
                                        <div className='font-medium'>{selectedTicker.id}</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className='font-medium text-gray-700 mb-2'>Data Statistics</h4>
                                <p className='text-gray-500'>Detailed statistics would be displayed here</p>
                            </div>
                        </div>

                        <div className='flex justify-end mt-6'>
                            <button onClick={() => setSelectedTicker(null)} className='btn-secondary'>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
