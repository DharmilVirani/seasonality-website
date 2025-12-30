'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    Filler,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { Line, Bar, Radar } from 'react-chartjs-2'
import {
    FaChartLine,
    FaChartBar,
    FaCalculator,
    FaCalendarAlt,
    FaGlobe,
    FaSpinner,
    FaTrendingUp,
    FaTrendingDown,
    FaBalanceScale,
    FaClock,
} from 'react-icons/fa'

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    Filler
)

export default function AdvancedSeasonalityAnalysis() {
    const [selectedTicker, setSelectedTicker] = useState(null)
    const [tickers, setTickers] = useState([])
    const [timeFrame, setTimeFrame] = useState('DAILY')
    const [analysisType, setAnalysisType] = useState('patterns')
    const [isLoading, setIsLoading] = useState(false)
    const [data, setData] = useState(null)
    const [patterns, setPatterns] = useState([])
    const [statistics, setStatistics] = useState(null)
    const [politicalData, setPoliticalData] = useState([])
    const [specialDays, setSpecialDays] = useState([])

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    // Fetch tickers on component mount
    useEffect(() => {
        const fetchTickers = async () => {
            try {
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
            }
        }
        fetchTickers()
    }, [])

    // Fetch analysis data when ticker or analysis type changes
    useEffect(() => {
        if (!selectedTicker) return

        const fetchAnalysisData = async () => {
            setIsLoading(true)
            try {
                switch (analysisType) {
                    case 'patterns':
                        await fetchSeasonalityPatterns()
                        break
                    case 'statistics':
                        await fetchStatistics()
                        break
                    case 'political':
                        await fetchPoliticalAnalysis()
                        break
                    case 'risk':
                        await fetchRiskAnalysis()
                        break
                    case 'comparison':
                        await fetchComparisonData()
                        break
                }
            } catch (error) {
                console.error('Error fetching analysis data:', error)
                toast.error('Failed to fetch analysis data')
            } finally {
                setIsLoading(false)
            }
        }

        fetchAnalysisData()
    }, [selectedTicker, analysisType])

    const fetchSeasonalityPatterns = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/analysis/patterns/${selectedTicker}`)
            if (response.data.success) {
                setPatterns(response.data.data.patterns)
            }
        } catch (error) {
            throw error
        }
    }

    const fetchStatistics = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/analysis/statistics/${selectedTicker}`)
            if (response.data.success) {
                setStatistics(response.data.data.statistics)
            }
        } catch (error) {
            throw error
        }
    }

    const fetchPoliticalAnalysis = async () => {
        try {
            const [cyclesResponse, specialDaysResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/analysis/political-cycles`),
                axios.get(`${API_BASE_URL}/api/analysis/special-days?startDate=2024-01-01&endDate=2025-12-31`),
            ])

            if (cyclesResponse.data.success) {
                setPoliticalData(cyclesResponse.data.data.cycles)
            }

            if (specialDaysResponse.data.success) {
                setSpecialDays(specialDaysResponse.data.data.specialDays)
            }
        } catch (error) {
            throw error
        }
    }

    const fetchRiskAnalysis = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/analysis/risk/${selectedTicker}`)
            if (response.data.success) {
                setStatistics(response.data.data.riskMetrics)
            }
        } catch (error) {
            throw error
        }
    }

    const fetchComparisonData = async () => {
        try {
            const tickerIds = tickers.slice(0, 5).map((t) => t.id)
            const response = await axios.post(`${API_BASE_URL}/api/analysis/compare`, {
                tickerIds,
                metrics: ['returns', 'risk', 'performance'],
            })
            if (response.data.success) {
                setData(response.data.data)
            }
        } catch (error) {
            throw error
        }
    }

    // Process patterns data for chart visualization
    const getPatternsChartData = () => {
        if (!patterns || patterns.length === 0) return null

        const monthlyPatterns = patterns.filter((p) => p.patternType === 'MONTHLY_SEASONAL')
        const weeklyPatterns = patterns.filter((p) => p.patternType === 'WEEKLY_SEASONAL')

        const labels = monthlyPatterns.map((p) => {
            const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            return months[p.period] || `Month ${p.period}`
        })

        return {
            labels,
            datasets: [
                {
                    label: 'Average Return (%)',
                    data: monthlyPatterns.map((p) => p.avgReturn),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1,
                },
                {
                    label: 'Win Rate (%)',
                    data: monthlyPatterns.map((p) => p.winRate * 100),
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.1,
                },
            ],
        }
    }

    // Process statistics data for radar chart
    const getStatisticsRadarData = () => {
        if (!statistics || !statistics.risk) return null

        const risk = statistics.risk

        return {
            labels: ['Volatility', 'Sharpe Ratio', 'Sortino Ratio', 'Max Drawdown', 'Win Rate'],
            datasets: [
                {
                    label: 'Risk Metrics',
                    data: [
                        risk.volatility || 0,
                        Math.abs(risk.sharpeRatio || 0) * 10,
                        Math.abs(risk.sortinoRatio || 0) * 10,
                        (risk.maxDrawdown || 0) / 10,
                        (statistics.returns?.positiveRatio || 0) * 100,
                    ],
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                },
            ],
        }
    }

    const renderPatternsAnalysis = () => {
        const chartData = getPatternsChartData()
        if (!chartData) {
            return <div className='text-center py-8 text-gray-500'>No pattern data available</div>
        }

        return (
            <div className='space-y-6'>
                <div className='bg-white rounded-lg shadow-md p-6'>
                    <h3 className='text-lg font-semibold mb-4'>Monthly Seasonality Patterns</h3>
                    <div className='h-96'>
                        <Line
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' },
                                    title: { display: true, text: 'Seasonality Analysis by Month' },
                                },
                                scales: {
                                    y: { beginAtZero: true },
                                },
                            }}
                        />
                    </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h4 className='text-md font-semibold mb-4'>Best Performing Months</h4>
                        <div className='space-y-2'>
                            {patterns
                                .filter((p) => p.patternType === 'MONTHLY_SEASONAL')
                                .sort((a, b) => b.avgReturn - a.avgReturn)
                                .slice(0, 3)
                                .map((pattern, index) => (
                                    <div
                                        key={pattern.id}
                                        className='flex justify-between items-center p-2 bg-green-50 rounded'
                                    >
                                        <span className='font-medium'>Month {pattern.period}</span>
                                        <span className='text-green-600 font-bold'>
                                            +{pattern.avgReturn.toFixed(2)}%
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>

                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h4 className='text-md font-semibold mb-4'>Worst Performing Months</h4>
                        <div className='space-y-2'>
                            {patterns
                                .filter((p) => p.patternType === 'MONTHLY_SEASONAL')
                                .sort((a, b) => a.avgReturn - b.avgReturn)
                                .slice(0, 3)
                                .map((pattern, index) => (
                                    <div
                                        key={pattern.id}
                                        className='flex justify-between items-center p-2 bg-red-50 rounded'
                                    >
                                        <span className='font-medium'>Month {pattern.period}</span>
                                        <span className='text-red-600 font-bold'>{pattern.avgReturn.toFixed(2)}%</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const renderStatisticsAnalysis = () => {
        if (!statistics) {
            return <div className='text-center py-8 text-gray-500'>No statistics data available</div>
        }

        const radarData = getStatisticsRadarData()

        return (
            <div className='space-y-6'>
                {radarData && (
                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h3 className='text-lg font-semibold mb-4'>Risk Metrics Overview</h3>
                        <div className='h-96'>
                            <Radar
                                data={radarData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'top' },
                                    },
                                }}
                            />
                        </div>
                    </div>
                )}

                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h4 className='text-md font-semibold mb-4 flex items-center'>
                            <FaTrendingUp className='mr-2 text-green-500' />
                            Returns
                        </h4>
                        <div className='space-y-2'>
                            <div className='flex justify-between'>
                                <span>Average Return:</span>
                                <span className='font-bold'>{(statistics.returns?.mean || 0).toFixed(2)}%</span>
                            </div>
                            <div className='flex justify-between'>
                                <span>Best Day:</span>
                                <span className='font-bold text-green-600'>
                                    {(statistics.returns?.maximum || 0).toFixed(2)}%
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span>Worst Day:</span>
                                <span className='font-bold text-red-600'>
                                    {(statistics.returns?.minimum || 0).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h4 className='text-md font-semibold mb-4 flex items-center'>
                            <FaBalanceScale className='mr-2 text-blue-500' />
                            Risk
                        </h4>
                        <div className='space-y-2'>
                            <div className='flex justify-between'>
                                <span>Volatility:</span>
                                <span className='font-bold'>{(statistics.risk?.volatility || 0).toFixed(2)}%</span>
                            </div>
                            <div className='flex justify-between'>
                                <span>Sharpe Ratio:</span>
                                <span className='font-bold'>{(statistics.risk?.sharpeRatio || 0).toFixed(2)}</span>
                            </div>
                            <div className='flex justify-between'>
                                <span>Max Drawdown:</span>
                                <span className='font-bold text-red-600'>
                                    {(statistics.risk?.maxDrawdown || 0).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h4 className='text-md font-semibold mb-4 flex items-center'>
                            <FaClock className='mr-2 text-purple-500' />
                            Performance
                        </h4>
                        <div className='space-y-2'>
                            <div className='flex justify-between'>
                                <span>Win Rate:</span>
                                <span className='font-bold'>
                                    {(statistics.returns?.positiveRatio || 0 * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span>Total Observations:</span>
                                <span className='font-bold'>{statistics.totalObservations || 0}</span>
                            </div>
                            <div className='flex justify-between'>
                                <span>Data Range:</span>
                                <span className='font-bold text-sm'>
                                    {statistics.dateRange?.start
                                        ? new Date(statistics.dateRange.start).getFullYear()
                                        : 'N/A'}{' '}
                                    -
                                    {statistics.dateRange?.end
                                        ? new Date(statistics.dateRange.end).getFullYear()
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const renderPoliticalAnalysis = () => {
        return (
            <div className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h3 className='text-lg font-semibold mb-4'>Political Cycles</h3>
                        <div className='space-y-3'>
                            {politicalData.slice(0, 5).map((cycle, index) => (
                                <div key={cycle.id} className='p-3 bg-gray-50 rounded-lg'>
                                    <div className='font-medium'>{cycle.name}</div>
                                    <div className='text-sm text-gray-600'>
                                        {cycle.country} - {cycle.cycleType}
                                    </div>
                                    <div className='text-sm'>
                                        {new Date(cycle.startDate).toLocaleDateString()}
                                        {cycle.endDate &&
                                            cycle.endDate !== cycle.startDate &&
                                            ` - ${new Date(cycle.endDate).toLocaleDateString()}`}
                                    </div>
                                    <div className='text-sm font-medium'>
                                        Impact Score: {(cycle.impactScore || 0).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className='bg-white rounded-lg shadow-md p-6'>
                        <h3 className='text-lg font-semibold mb-4'>Upcoming Special Days</h3>
                        <div className='space-y-3'>
                            {specialDays.slice(0, 5).map((day, index) => (
                                <div key={day.id} className='p-3 bg-blue-50 rounded-lg'>
                                    <div className='font-medium'>{day.name}</div>
                                    <div className='text-sm text-gray-600'>
                                        {day.type} - {day.country}
                                    </div>
                                    <div className='text-sm'>{new Date(day.date).toLocaleDateString()}</div>
                                    <div className='text-sm font-medium'>Importance: {day.importance}/5</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const renderAnalysisContent = () => {
        switch (analysisType) {
            case 'patterns':
                return renderPatternsAnalysis()
            case 'statistics':
                return renderStatisticsAnalysis()
            case 'political':
                return renderPoliticalAnalysis()
            default:
                return <div className='text-center py-8 text-gray-500'>Select an analysis type</div>
        }
    }

    return (
        <div className='space-y-6'>
            {/* Controls */}
            <div className='bg-white rounded-lg shadow-md p-6'>
                <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Select Ticker</label>
                        <select
                            value={selectedTicker || ''}
                            onChange={(e) => setSelectedTicker(parseInt(e.target.value))}
                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        >
                            {tickers.map((ticker) => (
                                <option key={ticker.id} value={ticker.id}>
                                    {ticker.symbol}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Analysis Type</label>
                        <select
                            value={analysisType}
                            onChange={(e) => setAnalysisType(e.target.value)}
                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        >
                            <option value='patterns'>Seasonality Patterns</option>
                            <option value='statistics'>Statistical Analysis</option>
                            <option value='political'>Political Cycles</option>
                            <option value='risk'>Risk Analysis</option>
                            <option value='comparison'>Multi-Ticker Comparison</option>
                        </select>
                    </div>

                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Time Frame</label>
                        <select
                            value={timeFrame}
                            onChange={(e) => setTimeFrame(e.target.value)}
                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        >
                            <option value='DAILY'>Daily</option>
                            <option value='MONDAY_WEEKLY'>Monday Weekly</option>
                            <option value='EXPIRY_WEEKLY'>Expiry Weekly</option>
                            <option value='MONTHLY'>Monthly</option>
                            <option value='YEARLY'>Yearly</option>
                        </select>
                    </div>

                    <div className='flex items-end'>
                        <button
                            onClick={() => setAnalysisType(analysisType)}
                            className='w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                            disabled={isLoading || !selectedTicker}
                        >
                            {isLoading ? (
                                <FaSpinner className='animate-spin inline mr-2' />
                            ) : (
                                <FaCalculator className='inline mr-2' />
                            )}
                            Analyze
                        </button>
                    </div>
                </div>
            </div>

            {/* Analysis Content */}
            {isLoading ? (
                <div className='bg-white rounded-lg shadow-md p-8'>
                    <div className='flex justify-center items-center h-32'>
                        <FaSpinner className='animate-spin text-2xl text-blue-500' />
                        <span className='ml-3 text-lg text-gray-600'>Analyzing data...</span>
                    </div>
                </div>
            ) : (
                renderAnalysisContent()
            )}
        </div>
    )
}
