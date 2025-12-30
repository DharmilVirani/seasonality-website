'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Users, TrendingUp, TrendingDown, Globe } from 'lucide-react';

export default function PoliticalCycleAnalysis({ selectedTicker, cycleData, electionYearData, settings, onSettingsChange, isLoading }) {
  const renderElectionYearAnalysis = () => {
    if (!electionYearData) {
      return (
        <div className="text-center py-8 text-gray-500">
          No election year data available
        </div>
      );
    }

    const chartData = Object.entries(electionYearData).map(([year, data]) => ({
      year,
      return: data.averageReturn,
      volume: data.averageVolume,
      volatility: data.volatility,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Election Year Return</p>
                  <p className={`text-lg font-bold ${electionYearData.averageReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {electionYearData.averageReturn >= 0 ? '+' : ''}{electionYearData.averageReturn.toFixed(2)}%
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
                  <p className="text-sm text-gray-600">Average Volatility</p>
                  <p className="text-lg font-bold text-purple-600">{electionYearData.volatility.toFixed(2)}%</p>
                </div>
                <TrendingDown className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Data Points</p>
                  <p className="text-lg font-bold text-green-600">{electionYearData.dataPoints}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Election Year Performance</CardTitle>
            <CardDescription>Historical performance during election years</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="return" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCycleAnalysis = () => {
    if (!cycleData) {
      return (
        <div className="text-center py-8 text-gray-500">
          No political cycle data available
        </div>
      );
    }

    const cycleChartData = Object.entries(cycleData).map(([cycle, data]) => ({
      cycle,
      return: data.averageReturn,
      significance: data.significance,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(cycleData).map(([cycle, data]) => (
            <Card key={cycle}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{cycle}</p>
                    <p className={`text-lg font-bold ${data.averageReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.averageReturn >= 0 ? '+' : ''}{data.averageReturn.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500">Significance: {data.significance.toFixed(3)}</p>
                  </div>
                  <Globe className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Political Cycle Performance</CardTitle>
              <CardDescription>Average returns by political cycle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cycleChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cycle" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="return" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Significance Analysis</CardTitle>
              <CardDescription>Statistical significance of political cycles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cycleChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cycle, significance }) => `${cycle}: ${significance.toFixed(3)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="significance"
                    >
                      {cycleChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.return >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Political Cycle Settings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Include Political Cycles</label>
            <input
              type="checkbox"
              checked={settings.includePoliticalCycles}
              onChange={(e) => onSettingsChange({ includePoliticalCycles: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Include Special Days</label>
            <input
              type="checkbox"
              checked={settings.includeSpecialDays}
              onChange={(e) => onSettingsChange({ includeSpecialDays: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Election Countries</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {['USA', 'INDIA', 'UK', 'GERMANY', 'FRANCE'].map((country) => (
              <label key={country} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.electionCountries.includes(country)}
                  onChange={(e) => {
                    const currentCountries = settings.electionCountries;
                    const newCountries = e.target.checked
                      ? [...currentCountries, country]
                      : currentCountries.filter(c => c !== country);
                    onSettingsChange({ electionCountries: newCountries });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{country}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Political Cycle Analysis</h2>
          <p className="text-gray-600">Analyze market performance during political events</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Selected Ticker</p>
          <p className="text-lg font-semibold">{selectedTicker || 'N/A'}</p>
        </div>
      </div>

      <Tabs defaultValue="election-year" className="space-y-4">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="election-year">Election Year</TabsTrigger>
          <TabsTrigger value="cycle-analysis">Cycle Analysis</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="election-year">
          {renderElectionYearAnalysis()}
        </TabsContent>

        <TabsContent value="cycle-analysis">
          {renderCycleAnalysis()}
        </TabsContent>

        <TabsContent value="settings">
          {renderSettings()}
        </TabsContent>
      </Tabs>
    </div>
  );
}