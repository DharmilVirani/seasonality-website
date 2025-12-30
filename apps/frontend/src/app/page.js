'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { toast } from 'react-toastify'
import FileUpload from '../components/FileUpload'
import DataVisualization from '../components/DataVisualization'
import AdvancedSeasonalityAnalysis from '../components/AdvancedSeasonalityAnalysis'
import TickerSelector from '../components/TickerSelector'
import DateRangePicker from '../components/DateRangePicker'
import BulkUpload from '../components/BulkUpload'
import CustomDateRangePicker from '../components/CustomDateRangePicker'
import AnalysisSettings from '../components/AnalysisSettings'
import MultiTimeframeAnalysis from '../components/MultiTimeframeAnalysis'
import PoliticalCycleAnalysis from '../components/PoliticalCycleAnalysis'
import StatisticalAnalysis from '../components/StatisticalAnalysis'
import BasketAnalysis from '../components/BasketAnalysis'

export default function Home() {
    const [tickers, setTickers] = useState([])
    const [selectedTicker, setSelectedTicker] = useState(null)
    const [dateRange, setDateRange] = useState([null, null])
    const [seasonalityData, setSeasonalityData] = useState([])
    const [multiTimeframeData, setMultiTimeframeData] = useState({})
    const [politicalCycleData, setPoliticalCycleData] = useState(null)
    const [statisticalAnalysisData, setStatisticalAnalysisData] = useState(null)
    const [electionYearData, setElectionYearData] = useState(null)
    const [batchProcessingResults, setBatchProcessingResults] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [analysisSettings, setAnalysisSettings] = useState({
        timeframe: 'daily',
        includePoliticalCycles: true,
        includeSpecialDays: true,
        statisticalTests: ['shapiro', 'jarque', 'anderson'],
        electionCountries: ['USA', 'INDIA'],
        significanceLevel: 0.05,
    })
    const router = useRouter()

    // API base URL - should match your backend
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    // Fetch tickers on component mount
    useEffect(() => {
        const fetchTickers = async () => {
            try {
                setIsLoading(true)
                const response = await axios.get(`${API_BASE_URL}/api/data/tickers`)
                if (response.data.success) {
                    setTickers(response.data.data)
                    if (response.data.data.length > 0) {
                        setSelectedTicker(response.data.data[0].id)
                    }
                }
            } catch (error) {
                console.error('Error fetching tickers:', error)
                toast.error('Failed to fetch ticker data')
            } finally {
                setIsLoading(false)
            }
        }

        fetchTickers()
    }, [])

    // Fetch seasonality data when ticker or date range changes
    useEffect(() => {
        if (!selectedTicker) return

        const fetchSeasonalityData = async () => {
            try {
                setIsLoading(true)
                const params = new URLSearchParams()
                if (dateRange[0]) params.append('startDate', dateRange[0].toISOString())
                if (dateRange[1]) params.append('endDate', dateRange[1].toISOString())

                const response = await axios.get(
                    `${API_BASE_URL}/api/data/ticker/${selectedTicker}?${params.toString()}`
                )

                if (response.data.success) {
                    setSeasonalityData(response.data.data.records)
                }
            } catch (error) {
                console.error('Error fetching seasonality data:', error)
                toast.error('Failed to fetch seasonality data')
            } finally {
                setIsLoading(false)
            }
        }

        fetchSeasonalityData()
    }, [selectedTicker, dateRange])

    // Fetch multi-timeframe data
    useEffect(() => {
        if (!selectedTicker) return

        const fetchMultiTimeframeData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/analysis/multi-timeframe/${selectedTicker}`)

                if (response.data.success) {
                    setMultiTimeframeData(response.data.data)
                }
            } catch (error) {
                console.error('Error fetching multi-timeframe data:', error)
            }
        }

        fetchMultiTimeframeData()
    }, [selectedTicker])

    // Fetch political cycle data
    useEffect(() => {
        if (!selectedTicker) return

        const fetchPoliticalCycleData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/analysis/political-cycle/${selectedTicker}`, {
                    params: {
                        countries: analysisSettings.electionCountries.join(','),
                        includeSpecialDays: analysisSettings.includeSpecialDays,
                    },
                })

                if (response.data.success) {
                    setPoliticalCycleData(response.data.data.cycleAnalysis)
                    setElectionYearData(response.data.data.electionYearAnalysis)
                }
            } catch (error) {
                console.error('Error fetching political cycle data:', error)
            }
        }

        if (analysisSettings.includePoliticalCycles) {
            fetchPoliticalCycleData()
        }
    }, [selectedTicker, analysisSettings])

    // Fetch statistical analysis data
    useEffect(() => {
        if (!selectedTicker || seasonalityData.length === 0) return

        const fetchStatisticalData = async () => {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/analysis/statistical`, {
                    tickerId: selectedTicker,
                    data: seasonalityData,
                    tests: analysisSettings.statisticalTests,
                    significanceLevel: analysisSettings.significanceLevel,
                })

                if (response.data.success) {
                    setStatisticalAnalysisData(response.data.data)
                }
            } catch (error) {
                console.error('Error fetching statistical data:', error)
            }
        }

        fetchStatisticalData()
    }, [selectedTicker, seasonalityData, analysisSettings])

    const handleFileUpload = async (file) => {
        try {
            setIsLoading(true)
            const formData = new FormData()
            formData.append('file', file)

            const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            if (response.data.success) {
                toast.success(`File uploaded successfully! ${response.data.data.recordsProcessed} records processed.`)
                // Refresh ticker data after upload
                const tickerResponse = await axios.get(`${API_BASE_URL}/api/data/tickers`)
                if (tickerResponse.data.success) {
                    setTickers(tickerResponse.data.data)
                }
            }
        } catch (error) {
            console.error('Error uploading file:', error)
            const errorMessage = error.response?.data?.message || 'Failed to upload file'
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const handleBatchUpload = async (files) => {
        try {
            setIsLoading(true)
            const formData = new FormData()
            files.forEach((file) => {
                formData.append('files', file)
            })

            const response = await axios.post(`${API_BASE_URL}/api/upload/batch`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            if (response.data.success) {
                setBatchProcessingResults(response.data.data)
                toast.success(
                    `Batch upload completed! ${response.data.data.successfulUploads} files processed successfully.`
                )
                // Refresh ticker data after upload
                const tickerResponse = await axios.get(`${API_BASE_URL}/api/data/tickers`)
                if (tickerResponse.data.success) {
                    setTickers(tickerResponse.data.data)
                }
            }
        } catch (error) {
            console.error('Error uploading batch files:', error)
            const errorMessage = error.response?.data?.message || 'Failed to upload batch files'
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAnalysisSettingsChange = (newSettings) => {
        setAnalysisSettings((prevSettings) => ({
            ...prevSettings,
            ...newSettings,
        }))
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className='space-y-8'>
                        {/* Quick Actions */}
                        <div className='bg-white rounded-lg shadow-md p-6'>
                            <h2 className='text-xl font-semibold text-gray-700 mb-4'>Quick Actions</h2>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className='p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors'
                                >
                                    <div className='text-center'>
                                        <svg
                                            className='mx-auto h-8 w-8 text-gray-400'
                                            fill='none'
                                            viewBox='0 0 24 24'
                                            stroke='currentColor'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                                            />
                                        </svg>
                                        <p className='mt-2 text-sm font-medium text-gray-600'>Upload Data</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('visualization')}
                                    className='p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors'
                                >
                                    <div className='text-center'>
                                        <svg
                                            className='mx-auto h-8 w-8 text-gray-400'
                                            fill='none'
                                            viewBox='0 0 24 24'
                                            stroke='currentColor'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                                            />
                                        </svg>
                                        <p className='mt-2 text-sm font-medium text-gray-600'>Visualize Data</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('analysis')}
                                    className='p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors'
                                >
                                    <div className='text-center'>
                                        <svg
                                            className='mx-auto h-8 w-8 text-gray-400'
                                            fill='none'
                                            viewBox='0 0 24 24'
                                            stroke='currentColor'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
                                            />
                                        </svg>
                                        <p className='mt-2 text-sm font-medium text-gray-600'>Advanced Analysis</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Data Summary */}
                        {tickers.length > 0 && (
                            <div className='bg-white rounded-lg shadow-md p-6'>
                                <h2 className='text-xl font-semibold text-gray-700 mb-4'>Data Summary</h2>
                                <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                                    <div className='text-center p-4 bg-blue-50 rounded-lg'>
                                        <p className='text-2xl font-bold text-blue-600'>{tickers.length}</p>
                                        <p className='text-sm text-gray-600'>Total Tickers</p>
                                    </div>
                                    <div className='text-center p-4 bg-green-50 rounded-lg'>
                                        <p className='text-2xl font-bold text-green-600'>{seasonalityData.length}</p>
                                        <p className='text-sm text-gray-600'>Data Points</p>
                                    </div>
                                    <div className='text-center p-4 bg-purple-50 rounded-lg'>
                                        <p className='text-2xl font-bold text-purple-600'>
                                            {Object.keys(multiTimeframeData).length}
                                        </p>
                                        <p className='text-sm text-gray-600'>Timeframes</p>
                                    </div>
                                    <div className='text-center p-4 bg-orange-50 rounded-lg'>
                                        <p className='text-2xl font-bold text-orange-600'>
                                            {politicalCycleData ? 'Yes' : 'No'}
                                        </p>
                                        <p className='text-sm text-gray-600'>Political Data</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )

            case 'upload':
                return (
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                        {/* Single File Upload */}
                        <div className='bg-white rounded-lg shadow-md p-6'>
                            <h2 className='text-xl font-semibold text-gray-700 mb-4'>Single File Upload</h2>
                            <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
                            <p className='text-sm text-gray-500 mt-4'>
                                Upload a single Seasonality.csv file. The system will process and store the data
                                automatically.
                            </p>
                        </div>

                        {/* Batch Upload */}
                        <div className='bg-white rounded-lg shadow-md p-6'>
                            <h2 className='text-xl font-semibold text-gray-700 mb-4'>Batch Upload</h2>
                            <BulkUpload onBatchUpload={handleBatchUpload} isLoading={isLoading} />
                            <p className='text-sm text-gray-500 mt-4'>
                                Upload multiple CSV files at once for bulk processing.
                            </p>
                        </div>

                        {/* Batch Results */}
                        {batchProcessingResults && (
                            <div className='lg:col-span-2 bg-white rounded-lg shadow-md p-6'>
                                <h2 className='text-xl font-semibold text-gray-700 mb-4'>Batch Processing Results</h2>
                                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                    <div className='text-center p-4 bg-green-50 rounded-lg'>
                                        <p className='text-2xl font-bold text-green-600'>
                                            {batchProcessingResults.successfulUploads}
                                        </p>
                                        <p className='text-sm text-gray-600'>Successful</p>
                                    </div>
                                    <div className='text-center p-4 bg-red-50 rounded-lg'>
                                        <p className='text-2xl font-bold text-red-600'>
                                            {batchProcessingResults.failedUploads}
                                        </p>
                                        <p className='text-sm text-gray-600'>Failed</p>
                                    </div>
                                    <div className='text-center p-4 bg-blue-50 rounded-lg'>
                                        <p className='text-2xl font-bold text-blue-600'>
                                            {batchProcessingResults.totalRecordsProcessed}
                                        </p>
                                        <p className='text-sm text-gray-600'>Records Processed</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )

            case 'visualization':
                return (
                    <div className='space-y-8'>
                        {/* Controls */}
                        <div className='bg-white rounded-lg shadow-md p-6'>
                            <h2 className='text-xl font-semibold text-gray-700 mb-4'>Visualization Controls</h2>
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
                                <TickerSelector
                                    tickers={tickers}
                                    selectedTicker={selectedTicker}
                                    onTickerChange={setSelectedTicker}
                                    isLoading={isLoading}
                                />
                                <DateRangePicker
                                    dateRange={dateRange}
                                    onDateRangeChange={setDateRange}
                                    isLoading={isLoading}
                                />
                                <CustomDateRangePicker
                                    dateRange={dateRange}
                                    onDateRangeChange={setDateRange}
                                    isLoading={isLoading}
                                />
                                <AnalysisSettings
                                    settings={analysisSettings}
                                    onSettingsChange={handleAnalysisSettingsChange}
                                />
                            </div>
                        </div>

                        {/* Data Visualization */}
                        <div className='bg-white rounded-lg shadow-md p-6'>
                            <h2 className='text-xl font-semibold text-gray-700 mb-4'>Data Visualization</h2>
                            {isLoading ? (
                                <div className='flex justify-center items-center h-32'>
                                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                                </div>
                            ) : seasonalityData.length > 0 ? (
                                <DataVisualization data={seasonalityData} settings={analysisSettings} />
                            ) : (
                                <div className='text-center py-8 text-gray-500'>
                                    {selectedTicker
                                        ? 'No data available for selected criteria'
                                        : 'Select a ticker to view data'}
                                </div>
                            )}
                        </div>
                    </div>
                )

            case 'analysis':
                return (
                    <AdvancedSeasonalityAnalysis
                        selectedTicker={selectedTicker}
                        seasonalityData={seasonalityData}
                        multiTimeframeData={multiTimeframeData}
                        politicalCycleData={politicalCycleData}
                        statisticalAnalysisData={statisticalAnalysisData}
                        electionYearData={electionYearData}
                        analysisSettings={analysisSettings}
                        onSettingsChange={handleAnalysisSettingsChange}
                    />
                )

            case 'multi-timeframe':
                return (
                    <MultiTimeframeAnalysis
                        selectedTicker={selectedTicker}
                        data={multiTimeframeData}
                        isLoading={isLoading}
                    />
                )

            case 'political-cycle':
                return (
                    <PoliticalCycleAnalysis
                        selectedTicker={selectedTicker}
                        cycleData={politicalCycleData}
                        electionYearData={electionYearData}
                        settings={analysisSettings}
                        onSettingsChange={handleAnalysisSettingsChange}
                        isLoading={isLoading}
                    />
                )

            case 'statistical':
                return (
                    <StatisticalAnalysis
                        data={statisticalAnalysisData}
                        settings={analysisSettings}
                        onSettingsChange={handleAnalysisSettingsChange}
                        isLoading={isLoading}
                    />
                )

            case 'basket':
                return <BasketAnalysis tickers={tickers} isLoading={isLoading} />

            default:
                return null
        }
    }

    return (
        <div className='container mx-auto px-4 py-8'>
            <h1 className='text-3xl font-bold text-gray-800 mb-8'>Advanced Seasonality Analysis Dashboard</h1>

            {/* Tab Navigation */}
            <div className='mb-8'>
                <div className='border-b border-gray-200'>
                    <nav className='-mb-px flex space-x-8 overflow-x-auto'>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'overview'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'upload'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Upload Data
                        </button>
                        <button
                            onClick={() => setActiveTab('visualization')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'visualization'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Visualization
                        </button>
                        <button
                            onClick={() => setActiveTab('analysis')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'analysis'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Advanced Analysis
                        </button>
                        <button
                            onClick={() => setActiveTab('multi-timeframe')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'multi-timeframe'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Multi-Timeframe
                        </button>
                        <button
                            onClick={() => setActiveTab('political-cycle')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'political-cycle'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Political Cycle
                        </button>
                        <button
                            onClick={() => setActiveTab('statistical')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'statistical'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Statistical Analysis
                        </button>
                        <button
                            onClick={() => setActiveTab('basket')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                                activeTab === 'basket'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Basket Analysis
                        </button>
                        <button
                            onClick={() => router.push('/admin')}
                            className='py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm whitespace-nowrap'
                        >
                            Admin Panel
                        </button>
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            {renderTabContent()}
        </div>
    )
}
