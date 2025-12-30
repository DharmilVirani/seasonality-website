'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';

export default function MultiTimeframeAnalysis({ selectedTicker, data, isLoading }) {
  const timeframes = ['daily', 'weekly', 'monthly', 'yearly'];

  const getChartData = (timeframe) => {
    if (!data[timeframe]) return [];
    
    return data[timeframe].map(item => ({
      name: item.date || item.week || item.month || item.year,
      value: item.returnPercentage || item.returnPoints || 0,
      volume: item.volume || 0,
    }));
  };

  const getSummaryStats = (timeframe) => {
    const chartData = getChartData(timeframe);
    if (chartData.length === 0) return null;

    const totalReturns = chartData.reduce((sum, item) => sum + item.value, 0);
    const avgReturn = totalReturns / chartData.length;
    const positiveDays = chartData.filter(item => item.value > 0).length;
    const negativeDays = chartData.filter(item => item.value < 0).length;
    const winRate = (positiveDays / chartData.length) * 100;

    return {
      totalReturns,
      avgReturn,
      positiveDays,
      negativeDays,
      winRate,
      maxReturn: Math.max(...chartData.map(item => item.value)),
      minReturn: Math.min(...chartData.map(item => item.value)),
    };
  };

  const renderTimeframeContent = (timeframe) => {
    const chartData = getChartData(timeframe);
    const stats = getSummaryStats(timeframe);

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!chartData || chartData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No data available for {timeframe} timeframe
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Return</p>
                    <p className={`text-lg font-bold ${stats.totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.totalReturns >= 0 ? '+' : ''}{stats.totalReturns.toFixed(2)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Return</p>
                    <p className={`text-lg font-bold ${stats.avgReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(2)}%
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Win Rate</p>
                    <p className="text-lg font-bold text-blue-600">{stats.winRate.toFixed(1)}%</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Positive</p>
                    <p className="text-lg font-bold text-green-600">{stats.positiveDays}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Max Return</p>
                    <p className="text-lg font-bold text-green-600">{stats.maxReturn.toFixed(2)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Min Return</p>
                    <p className="text-lg font-bold text-red-600">{stats.minReturn.toFixed(2)}%</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Returns</CardTitle>
              <CardDescription>Performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Volume</CardTitle>
              <CardDescription>Trading volume analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="volume" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Return Distribution</CardTitle>
            <CardDescription>Positive vs Negative returns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Positive', value: stats?.positiveDays || 0, color: '#10b981' },
                      { name: 'Negative', value: stats?.negativeDays || 0, color: '#ef4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Positive', value: stats?.positiveDays || 0, color: '#10b981' },
                      { name: 'Negative', value: stats?.negativeDays || 0, color: '#ef4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Multi-Timeframe Analysis</h2>
          <p className="text-gray-600">Compare performance across different timeframes</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Selected Ticker</p>
          <p className="text-lg font-semibold">{selectedTicker || 'N/A'}</p>
        </div>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="grid grid-cols-4">
          {timeframes.map((timeframe) => (
            <TabsTrigger key={timeframe} value={timeframe}>
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {timeframes.map((timeframe) => (
          <TabsContent key={timeframe} value={timeframe}>
            {renderTimeframeContent(timeframe)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}