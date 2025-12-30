'use client'

import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
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
    ArcElement,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import {
    FaChartLine,
    FaChartBar,
    FaDownload,
    FaCalendarAlt,
    FaCalculator,
    FaPercentage,
    FaFilter,
    FaExpand,
    FaCompress,
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
    Filler,
    ArcElement
)

export default function DataVisualization({ data, ticker, enhancedData }) {
    const [chartType, setChartType] = useState('line')
    const [timeFrame, setTimeFrame] = useState('all')
    const [showSeasonality, setShowSeasonality] = useState(true)
    const [showStatistics, setShowStatistics] = useState(true)
    const [showPoliticalCycles, setShowPoliticalCycles] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [exportFormat, setExportFormat] = useState('png')
    const [seasonalityData, setSeasonalityData] = useState(null)
    const [statisticalAnalysis, setStatisticalAnalysis] = useState(null)
    const [politicalCycleData, setPoliticalCycleData] = useState(null)

    // Load enhanced data when available
    useEffect(() => {
        if (enhancedData) {
            setSeasonalityData(enhancedData.seasonality || null)
            setStatisticalAnalysis(enhancedData.statistics || null)
            setPoliticalCycleData(enhancedData.politicalCycles || null)
        }
    }, [enhancedData])

    // Filter data based on time frame with enhanced options
    const filteredData = () => {
        if (timeFrame === 'all') return data

        const now = new Date()
        const pastDate = new Date()

        switch (timeFrame) {
            case '1m':
                pastDate.setMonth(now.getMonth() - 1)
                break
            case '3m':
                pastDate.setMonth(now.getMonth() - 3)
                break
            case '6m':
                pastDate.setMonth(now.getMonth() - 6)
                break
            case '1y':
                pastDate.setFullYear(now.getFullYear() - 1)
                break
            case '2y':
                pastDate.setFullYear(now.getFullYear() - 2)
                break
            case '5y':
                pastDate.setFullYear(now.getFullYear() - 5)
                break
            default:
                return data
        }

        return data.filter((item) => new Date(item.date) >= pastDate)
    }

    const chartData = filteredData()

    // Calculate seasonal patterns from historical data
    const calculateSeasonalPatterns = () => {
        if (chartData.length === 0) return null

        const monthlyReturns = {}
        const monthlyVolumes = {}

        chartData.forEach((item) => {
            const date = new Date(item.date)
            const month = date.getMonth()
            const year = date.getFullYear()

            if (!monthlyReturns[month]) {
                monthlyReturns[month] = []
                monthlyVolumes[month] = []
            }

            // Calculate monthly return if we have previous month data
            if (year > 2000) {
                // Ensure we have enough historical data
                monthlyReturns[month].push(item.close)
                monthlyVolumes[month].push(item.volume)
            }
        })

        // Calculate average returns and volumes by month
        const seasonalPatterns = Object.keys(monthlyReturns).map((month) => {
            const avgReturn = monthlyReturns[month].reduce((a, b) => a + b, 0) / monthlyReturns[month].length
            const avgVolume = monthlyVolumes[month].reduce((a, b) => a + b, 0) / monthlyVolumes[month].length

            return {
                month: parseInt(month),
                avgReturn,
                avgVolume,
                dataPoints: monthlyReturns[month].length,
            }
        })

        return seasonalPatterns
    }

    // Enhanced chart data preparation
    const getChartData = () => {
        if (chartData.length === 0) return null

        const labels = chartData.map((item) => new Date(item.date))
        const closePrices = chartData.map((item) => item.close)
        const volumes = chartData.map((item) => item.volume)
        const highPrices = chartData.map((item) => item.high)
        const lowPrices = chartData.map((item) => item.low)

        const datasets = [
            {
                label: 'Close Price',
                data: closePrices,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.1,
                fill: chartType === 'line' && showSeasonality ? true : false,
                yAxisID: 'y',
            },
            {
                label: 'Volume',
                data: volumes,
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                type: 'bar',
                yAxisID: 'y1',
            },
        ]

        // Add high/low range if showing statistics
        if (showStatistics) {
            datasets.push({
                label: 'High',
                data: highPrices,
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.1,
                fill: false,
                yAxisID: 'y',
            })

            datasets.push({
                label: 'Low',
                data: lowPrices,
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.1,
                fill: false,
                yAxisID: 'y',
            })
        }

        // Add seasonal overlay if available
        if (showSeasonality && seasonalityData) {
            const seasonalPattern = calculateSeasonalPatterns()
            if (seasonalPattern) {
                const seasonalOverlay = labels.map((label) => {
                    const month = new Date(label).getMonth()
                    const pattern = seasonalPattern.find((p) => p.month === month)
                    return pattern ? pattern.avgReturn : null
                })

                datasets.push({
                    label: 'Seasonal Pattern',
                    data: seasonalOverlay,
                    borderColor: 'rgb(168, 85, 247)',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.1,
                    fill: false,
                    yAxisID: 'y',
                })
            }
        }

        return { labels, datasets }
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: getTimeUnit(),
                    tooltipFormat: 'PPP',
                },
                title: {
                    display: true,
                    text: 'Date',
                },
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Price',
                },
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Volume',
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: `${ticker?.symbol || 'Ticker'} - Advanced Seasonality Analysis`,
                font: {
                    size: 16,
                },
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        if (context.dataset.yAxisID === 'y1') {
                            return `Volume: ${context.raw.toLocaleString()}`
                        }
                        return `${context.dataset.label}: ${context.raw.toFixed(2)}`
                    },
                },
            },
        },
    }

    const getTimeUnit = () => {
        if (chartData.length <= 30) return 'day'
        if (chartData.length <= 90) return 'week'
        if (chartData.length <= 365) return 'month'
        return 'quarter'
    }

    const renderChart = () => {
        const data = getChartData()
        if (!data) return <div className='text-center py-8'>No data available</div>

        switch (chartType) {
            case 'line':
                return <Line data={data} options={chartOptions} />
            case 'bar':
                return <Bar data={data} options={chartOptions} />
            case 'doughnut':
                return <Doughnut data={getDoughnutData()} options={getDoughnutOptions()} />
            default:
                return <Line data={data} options={chartOptions} />
        }
    }

    // Additional chart types
    const getDoughnutData = () => {
        if (!seasonalityData) return null

        const seasonalPattern = calculateSeasonalPatterns()
        if (!seasonalPattern) return null

        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    data: seasonalPattern.map((p) => p.avgReturn),
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40',
                        '#FF6384',
                        '#C9CBCF',
                        '#4BC0C0',
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                    ],
                },
            ],
        }
    }

    const getDoughnutOptions = () => ({
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'Monthly Seasonal Patterns',
            },
        },
    })

    // Export functionality
    const exportChart = () => {
        const chart = ChartJS.getChart(`chart-${ticker?.symbol || 'default'}`)
        if (chart) {
            const url = chart.toBase64Image()
            const link = document.createElement('a')
            link.download = `${ticker?.symbol || 'chart'}.${exportFormat}`
            link.href = url
            link.click()
        }
    }

    // Calculate advanced statistics
    const calculateAdvancedStats = () => {
        if (chartData.length === 0) return {}

        const prices = chartData.map((item) => item.close)
        const returns = []

        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
        }

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
        const stdDev = Math.sqrt(variance)
        const sharpeRatio = mean / stdDev
        const maxDrawdown = calculateMaxDrawdown(prices)

        return {
            meanReturn: mean,
            volatility: stdDev,
            sharpeRatio,
            maxDrawdown,
            totalReturn: (prices[prices.length - 1] - prices[0]) / prices[0],
            dataPoints: chartData.length,
        }
    }

    const calculateMaxDrawdown = (prices) => {
        let maxDrawdown = 0
        let peak = prices[0]

        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > peak) {
                peak = prices[i]
            }
            const drawdown = (peak - prices[i]) / peak
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown
            }
        }

        return maxDrawdown
    }

    const stats = calculateAdvancedStats()
    const seasonalPattern = calculateSeasonalPatterns()

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6' : 'mt-6'}`}>
            {/* Enhanced Controls */}
            <div className='flex flex-wrap gap-4 mb-6'>
                <div className='flex items-center gap-2'>
                    <FaChartLine className='text-blue-500' />
                    <span className='font-medium text-gray-700'>Chart Type:</span>
                    <select
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value)}
                        className='px-3 py-1 border border-gray-300 rounded-md text-sm'
                    >
                        <option value='line'>Line Chart</option>
                        <option value='bar'>Bar Chart</option>
                        <option value='doughnut'>Seasonal Overview</option>
                    </select>
                </div>

                <div className='flex items-center gap-2'>
                    <FaCalendarAlt className='text-green-500' />
                    <span className='font-medium text-gray-700'>Time Frame:</span>
                    <select
                        value={timeFrame}
                        onChange={(e) => setTimeFrame(e.target.value)}
                        className='px-3 py-1 border border-gray-300 rounded-md text-sm'
                    >
                        <option value='all'>All Time</option>
                        <option value='5y'>5 Years</option>
                        <option value='2y'>2 Years</option>
                        <option value='1y'>1 Year</option>
                        <option value='6m'>6 Months</option>
                        <option value='3m'>3 Months</option>
                        <option value='1m'>1 Month</option>
                    </select>
                </div>

                {/* Enhanced Feature Toggles */}
                <div className='flex items-center gap-2'>
                    <FaFilter className='text-purple-500' />
                    <label className='flex items-center gap-1 text-sm'>
                        <input
                            type='checkbox'
                            checked={showSeasonality}
                            onChange={(e) => setShowSeasonality(e.target.checked)}
                            className='rounded'
                        />
                        Seasonality
                    </label>
                </div>

                <div className='flex items-center gap-2'>
                    <FaCalculator className='text-orange-500' />
                    <label className='flex items-center gap-1 text-sm'>
                        <input
                            type='checkbox'
                            checked={showStatistics}
                            onChange={(e) => setShowStatistics(e.target.checked)}
                            className='rounded'
                        />
                        Statistics
                    </label>
                </div>

                <div className='flex items-center gap-2'>
                    <FaPercentage className='text-red-500' />
                    <label className='flex items-center gap-1 text-sm'>
                        <input
                            type='checkbox'
                            checked={showPoliticalCycles}
                            onChange={(e) => setShowPoliticalCycles(e.target.checked)}
                            className='rounded'
                        />
                        Political Cycles
                    </label>
                </div>

                {/* Export Controls */}
                <div className='flex items-center gap-2 ml-auto'>
                    <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className='px-2 py-1 border border-gray-300 rounded-md text-xs'
                    >
                        <option value='png'>PNG</option>
                        <option value='jpg'>JPG</option>
                        <option value='svg'>SVG</option>
                    </select>
                    <button
                        onClick={exportChart}
                        className='flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600'
                    >
                        <FaDownload /> Export
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className='flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600'
                    >
                        {isFullscreen ? <FaCompress /> : <FaExpand />}
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </button>
                </div>
            </div>

            {/* Main Chart */}
            <div
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${isFullscreen ? 'h-[80vh]' : 'h-96'}`}
            >
                <div className={isFullscreen ? 'h-full' : 'h-96'}>{renderChart()}</div>
            </div>

            {/* Enhanced Statistics Panel */}
            {showStatistics && chartData.length > 0 && (
                <div className='mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
                    <div className='bg-blue-50 rounded-lg p-4 text-center'>
                        <div className='text-2xl font-bold text-blue-600'>
                            ${chartData[chartData.length - 1].close.toFixed(2)}
                        </div>
                        <div className='text-sm text-gray-600 mt-1'>Current Price</div>
                    </div>

                    <div className='bg-green-50 rounded-lg p-4 text-center'>
                        <div className='text-2xl font-bold text-green-600'>
                            ${Math.max(...chartData.map((item) => item.high)).toFixed(2)}
                        </div>
                        <div className='text-sm text-gray-600 mt-1'>Period High</div>
                    </div>

                    <div className='bg-red-50 rounded-lg p-4 text-center'>
                        <div className='text-2xl font-bold text-red-600'>
                            ${Math.min(...chartData.map((item) => item.low)).toFixed(2)}
                        </div>
                        <div className='text-sm text-gray-600 mt-1'>Period Low</div>
                    </div>

                    <div className='bg-purple-50 rounded-lg p-4 text-center'>
                        <div className='text-2xl font-bold text-purple-600'>
                            {((stats.totalReturn || 0) * 100).toFixed(1)}%
                        </div>
                        <div className='text-sm text-gray-600 mt-1'>Total Return</div>
                    </div>

                    <div className='bg-orange-50 rounded-lg p-4 text-center'>
                        <div className='text-2xl font-bold text-orange-600'>{(stats.sharpeRatio || 0).toFixed(2)}</div>
                        <div className='text-sm text-gray-600 mt-1'>Sharpe Ratio</div>
                    </div>

                    <div className='bg-gray-50 rounded-lg p-4 text-center'>
                        <div className='text-2xl font-bold text-gray-600'>{chartData.length}</div>
                        <div className='text-sm text-gray-600 mt-1'>Data Points</div>
                    </div>
                </div>
            )}

            {/* Seasonal Analysis Panel */}
            {showSeasonality && seasonalPattern && (
                <div className='mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6'>
                    <h3 className='text-lg font-semibold mb-4 text-gray-800'>Seasonal Analysis</h3>
                    <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
                        {seasonalPattern.map((pattern, index) => {
                            const monthNames = [
                                'Jan',
                                'Feb',
                                'Mar',
                                'Apr',
                                'May',
                                'Jun',
                                'Jul',
                                'Aug',
                                'Sep',
                                'Oct',
                                'Nov',
                                'Dec',
                            ]
                            return (
                                <div key={index} className='bg-white rounded-lg p-3 text-center shadow-sm'>
                                    <div className='font-medium text-gray-700'>{monthNames[pattern.month]}</div>
                                    <div
                                        className={`text-lg font-bold ${pattern.avgReturn > 0 ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                        {pattern.avgReturn > 0 ? '+' : ''}
                                        {(pattern.avgReturn * 100).toFixed(1)}%
                                    </div>
                                    <div className='text-xs text-gray-500'>{pattern.dataPoints} samples</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Political Cycles Panel */}
            {showPoliticalCycles && politicalCycleData && (
                <div className='mt-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6'>
                    <h3 className='text-lg font-semibold mb-4 text-gray-800'>Political Cycle Impact</h3>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {politicalCycleData.map((cycle, index) => (
                            <div key={index} className='bg-white rounded-lg p-4 shadow-sm'>
                                <div className='font-medium text-gray-700'>{cycle.cycle}</div>
                                <div className='text-sm text-gray-600 mt-1'>{cycle.description}</div>
                                <div
                                    className={`text-lg font-bold mt-2 ${cycle.impact > 0 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                    {cycle.impact > 0 ? '+' : ''}
                                    {(cycle.impact * 100).toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
