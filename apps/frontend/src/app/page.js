'use client';

import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Button, Select, DatePicker, Alert, Spinner } from 'antd';
import { LineChart, BarChart, PieChart } from '@ant-design/charts';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

const { Option } = Select;

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Analysis state
  const [selectedSymbol, setSelectedSymbol] = useState('BSE');
  const [timeframe, setTimeframe] = useState('DAILY');
  const [dateRange, setDateRange] = useState([
    new Date('2020-01-01'),
    new Date('2024-12-31')
  ]);

  // Analysis results
  const [analysisData, setAnalysisData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [tickers, setTickers] = useState([]);

  // Timeframe options
  const timeframeOptions = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'MONDAY_WEEKLY', label: 'Monday Weekly' },
    { value: 'EXPIRY_WEEKLY', label: 'Expiry Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' }
  ];

  // Fetch tickers on mount
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const response = await api.get('/tickers');
        setTickers(response.data.tickers || []);
      } catch (err) {
        console.error('Error fetching tickers:', err);
      }
    };
    fetchTickers();
  }, []);

  const handleAnalysis = async () => {
    if (!selectedSymbol) {
      setError('Please select a symbol');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/analysis/seasonality', {
        params: {
          symbol: selectedSymbol,
          timeframe: timeframe.toLowerCase(),
          startDate: dateRange[0].toISOString().split('T')[0],
          endDate: dateRange[1].toISOString().split('T')[0]
        }
      });

      setAnalysisData(response.data.data || []);
      setStatistics(response.data.statistics);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching analysis data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    handleAnalysis();
  };

  // Chart configurations
  const lineConfig = {
    data: analysisData,
    xField: 'date',
    yField: 'close',
    smooth: true,
    point: {
      size: 3,
      shape: 'circle',
    },
    lineStyle: {
      stroke: '#1890ff',
      lineWidth: 2,
    },
    height: 400,
    autoFit: true,
  };

  const volumeConfig = {
    data: analysisData.slice(0, 50),
    xField: 'date',
    yField: 'volume',
    color: '#52c41a',
    height: 300,
    autoFit: true,
  };

  const returnConfig = {
    data: analysisData.slice(0, 30),
    xField: 'date',
    yField: 'returnPercentage',
    color: ({ returnPercentage }) => returnPercentage > 0 ? '#52c41a' : '#ff4d4f',
    height: 300,
    autoFit: true,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <Container className="py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Seasonality Analysis Dashboard</h1>
              <p className="text-gray-600 mt-1">Modern seasonality analysis platform</p>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome, {user.username}</p>
                <p className="text-xs text-gray-500">Role: {user.role}</p>
              </div>
            )}
          </div>
        </Container>
      </div>

      <Container className="py-6">
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* Control Panel */}
        <Card className="mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Symbol</label>
              <Select
                value={selectedSymbol}
                onChange={setSelectedSymbol}
                style={{ width: '100%' }}
                placeholder="Select a symbol"
                loading={tickers.length === 0}
              >
                {tickers.map(ticker => (
                  <Option key={ticker.id} value={ticker.symbol}>
                    {ticker.symbol}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Timeframe</label>
              <Select
                value={timeframe}
                onChange={handleTimeframeChange}
                style={{ width: '100%' }}
              >
                {timeframeOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <DatePicker.RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%' }}
              />
            </div>

            <div className="flex items-end">
              <Button
                type="primary"
                onClick={handleAnalysis}
                loading={loading}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Analyzing...' : 'Analyze Data'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Statistics Overview */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <Card className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalRecords || 0}</div>
              <div className="text-sm text-gray-600">Total Records</div>
            </Card>
            <Card className="text-center">
              <div className={`text-2xl font-bold ${statistics.averageReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {statistics.averageReturn ? `${statistics.averageReturn.toFixed(2)}%` : '0.00%'}
              </div>
              <div className="text-sm text-gray-600">Avg Return</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {statistics.winRate ? `${statistics.winRate.toFixed(1)}%` : '0.0%'}
              </div>
              <div className="text-sm text-gray-600">Win Rate</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {statistics.maxGain ? `${statistics.maxGain.toFixed(2)}%` : '0.00%'}
              </div>
              <div className="text-sm text-gray-600">Max Gain</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {statistics.maxLoss ? `${statistics.maxLoss.toFixed(2)}%` : '0.00%'}
              </div>
              <div className="text-sm text-gray-600">Max Loss</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold text-orange-600">{selectedSymbol}</div>
              <div className="text-sm text-gray-600">Current Symbol</div>
            </Card>
          </div>
        )}

        {/* Data Visualization */}
        <Card className="mb-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Price Chart */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">{selectedSymbol} - Price Movement</h3>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Spinner />
                </div>
              ) : analysisData.length > 0 ? (
                <LineChart {...lineConfig} />
              ) : (
                <div className="text-center text-gray-500 py-8">No data available</div>
              )}
            </div>

            {/* Volume Chart */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Volume Analysis</h3>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Spinner />
                </div>
              ) : analysisData.length > 0 ? (
                <BarChart {...volumeConfig} />
              ) : (
                <div className="text-center text-gray-500 py-8">No data available</div>
              )}
            </div>
          </div>
        </Card>

        {/* Additional Charts */}
        <Card className="mb-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Return Distribution */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Return Distribution</h3>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Spinner />
                </div>
              ) : analysisData.length > 0 ? (
                <BarChart {...returnConfig} />
              ) : (
                <div className="text-center text-gray-500 py-8">No data available</div>
              )}
            </div>

            {/* Statistics Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Key Statistics</h3>
              {statistics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Positive Days</div>
                      <div className="text-2xl font-bold text-green-600">
                        {statistics.positiveDays || 0}
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-sm text-red-600 font-medium">Negative Days</div>
                      <div className="text-2xl font-bold text-red-600">
                        {statistics.negativeDays || 0}
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">Total Return</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {statistics.totalReturn ? `${statistics.totalReturn.toFixed(2)}%` : '0.00%'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No statistics available</div>
              )}
            </div>
          </div>
        </Card>

        {/* Timeframe Comparison */}
        <Card className="mb-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Timeframe Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {timeframeOptions.map(option => (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all ${timeframe === option.value ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                  }`}
                onClick={() => handleTimeframeChange(option.value)}
              >
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{option.label}</div>
                  <div className="text-2xl font-bold text-blue-600 mt-2">
                    {statistics?.averageReturn ? `${statistics.averageReturn.toFixed(2)}%` : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Avg Return</div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Admin Actions */}
        {user?.role === 'admin' && (
          <Card className="shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Admin Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button href="/admin" type="warning" className="w-full">
                Go to Admin Panel
              </Button>
              <Button onClick={() => window.location.reload()} className="w-full">
                Refresh Data
              </Button>
              <Button
                onClick={() => {
                  setSelectedSymbol('BSE');
                  setTimeframe('DAILY');
                  setDateRange([new Date('2020-01-01'), new Date('2024-12-31')]);
                  setAnalysisData([]);
                  setStatistics(null);
                }}
                className="w-full"
              >
                Reset Filters
              </Button>
              <Button onClick={handleAnalysis} type="primary" className="w-full">
                Re-analyze
              </Button>
            </div>
          </Card>
        )}
      </Container>
    </div>
  );
}