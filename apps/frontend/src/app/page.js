'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { toast } from 'react-toastify'
import DataVisualization from '../components/DataVisualization'
import TickerSelector from '../components/TickerSelector'
import DateRangePicker from '../components/DateRangePicker'

export default function Home() {
    const [tickers, setTickers] = useState([])
    const [selectedTicker, setSelectedTicker] = useState(null)
    const [dateRange, setDateRange] = useState([null, null])
    const [seasonalityData, setSeasonalityData] = useState([])
    const [isLoading, setIsLoading] = useState(false)
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

    return (
        <div className='container mx-auto px-4 py-8'>
            <h1 className='text-3xl font-bold text-gray-800 mb-8'>Seasonality Analysis Dashboard</h1>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                {/* File Upload Section */}
                <div className='lg:col-span-1'>
                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h2 className='text-xl font-semibold text-gray-700 mb-4'>Upload CSV File</h2>
                        <p className='text-sm text-gray-500 mt-4'>
                            Upload your Seasonality.csv file. The system will process and store the data automatically.
                        </p>
                    </div>
                </div>

                {/* Data Controls Section */}
                <div className='lg:col-span-2'>
                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h2 className='text-xl font-semibold text-gray-700 mb-4'>Analysis Controls</h2>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
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
                        </div>

                        {isLoading ? (
                            <div className='flex justify-center items-center h-32'>
                                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                            </div>
                        ) : seasonalityData.length > 0 ? (
                            <DataVisualization data={seasonalityData} />
                        ) : (
                            <div className='text-center py-8 text-gray-500'>
                                {selectedTicker
                                    ? 'No data available for selected criteria'
                                    : 'Select a ticker to view data'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
