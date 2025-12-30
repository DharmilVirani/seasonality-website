'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { TrendingUp, TrendingDown, Calculator, FileText, AlertTriangle } from 'lucide-react';

export default function StatisticalAnalysis({ data, settings, onSettingsChange, isLoading }) {
  const renderNormalityTests = () => {
    if (!data?.normalityTests) {
      return (
        <div className="text-center py-8 text-gray-500">
          No normality test data available
        </div>
      );
    }

    const testResults = Object.entries(data.normalityTests).map(([test, result]) => ({
      test: test.replace(/([A-Z])/g, ' $1').trim(),
      statistic: result.statistic,
      pValue: result.pValue,
      isNormal: result.pValue > (settings.significanceLevel || 0.05),
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testResults.map((result) => (
            <Card key={result.test}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{result.test}</p>
                    <p className="text-lg font-bold">{result.statistic.toFixed(4)}</p>
                    <p className={`text-xs ${result.isNormal ? 'text-green-600' : 'text-red-600'}`}>
                      {result.isNormal ? 'Normal Distribution' : 'Not Normal'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">p-value</p>
                    <p className="text-lg font-bold">{result.pValue.toFixed(4)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Normality Test Results</CardTitle>
            <CardDescription>Statistical tests for normal distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testResults}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="test" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="statistic" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDistributionAnalysis = () => {
    if (!data?.distributionAnalysis) {
      return (
        <div className="text-center py-8 text-gray-500">
          No distribution analysis data available
        </div>
      );
    }

    const { skewness, kurtosis, mean, median, stdDev } = data.distributionAnalysis;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Mean</p>
                  <p className="text-lg font-bold">{mean.toFixed(4)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Median</p>
                  <p className="text-lg font-bold">{median.toFixed(4)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Std Dev</p>
                  <p className="text-lg font-bold">{stdDev.toFixed(4)}</p>
                </div>
                <Calculator className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Skewness</p>
                  <p className={`text-lg font-bold ${Math.abs(skewness) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                    {skewness.toFixed(4)}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Kurtosis</p>
                  <p className={`text-lg font-bold ${Math.abs(kurtosis) > 3 ? 'text-red-600' : 'text-green-600'}`}>
                    {kurtosis.toFixed(4)}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Return Distribution</CardTitle>
              <CardDescription>Statistical distribution of returns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Mean', value: Math.abs(mean), color: '#3b82f6' },
                        { name: 'Std Dev', value: stdDev, color: '#10b981' },
                        { name: 'Skewness', value: Math.abs(skewness), color: '#f59e0b' },
                        { name: 'Kurtosis', value: Math.abs(kurtosis), color: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(2)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Mean', value: Math.abs(mean), color: '#3b82f6' },
                        { name: 'Std Dev', value: stdDev, color: '#10b981' },
                        { name: 'Skewness', value: Math.abs(skewness), color: '#f59e0b' },
                        { name: 'Kurtosis', value: Math.abs(kurtosis), color: '#ef4444' }
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

          <Card>
            <CardHeader>
              <CardTitle>Volatility Analysis</CardTitle>
              <CardDescription>Standard deviation over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.volatilityData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="volatility" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderCorrelationAnalysis = () => {
    if (!data?.correlationAnalysis) {
      return (
        <div className="text-center py-8 text-gray-500">
          No correlation analysis data available
        </div>
      );
    }

    const correlations = Object.entries(data.correlationAnalysis).map(([pair, correlation]) => ({
      pair,
      correlation: correlation.value,
      significance: correlation.pValue,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {correlations.map((corr) => (
            <Card key={corr.pair}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Correlation</p>
                    <p className="text-lg font-bold">{corr.pair}</p>
                    <p className={`text-xs ${Math.abs(corr.correlation) > 0.5 ? 'text-green-600' : 'text-gray-600'}`}>
                      {corr.correlation.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Significance</p>
                    <p className="text-lg font-bold">{corr.significance.toFixed(4)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Correlation Matrix</CardTitle>
            <CardDescription>Relationships between different timeframes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={correlations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="correlation" />
                  <YAxis dataKey="significance" />
                  <ZAxis dataKey="correlation" scale="sqrt" range={[4, 64]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Correlations" data={correlations} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Calculator className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Statistical Analysis Settings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Significance Level</label>
            <select
              value={settings.significanceLevel}
              onChange={(e) => onSettingsChange({ significanceLevel: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0.01">0.01 (99% confidence)</option>
              <option value="0.05">0.05 (95% confidence)</option>
              <option value="0.10">0.10 (90% confidence)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Statistical Tests</label>
            <div className="space-y-2">
              {['shapiro', 'jarque', 'anderson', 'kolmogorov'].map((test) => (
                <label key={test} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.statisticalTests.includes(test)}
                    onChange={(e) => {
                      const currentTests = settings.statisticalTests;
                      const newTests = e.target.checked
                        ? [...currentTests, test]
                        : currentTests.filter(t => t !== test);
                      onSettingsChange({ statisticalTests: newTests });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm capitalize">{test}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Statistical Analysis</h2>
          <p className="text-gray-600">Advanced statistical analysis of market data</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Significance Level</p>
          <p className="text-lg font-semibold">{settings.significanceLevel}</p>
        </div>
      </div>

      <Tabs defaultValue="normality" className="space-y-4">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="normality">Normality Tests</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="normality">
          {renderNormalityTests()}
        </TabsContent>

        <TabsContent value="distribution">
          {renderDistributionAnalysis()}
        </TabsContent>

        <TabsContent value="correlation">
          {renderCorrelationAnalysis()}
        </TabsContent>

        <TabsContent value="settings">
          {renderSettings()}
        </TabsContent>
      </Tabs>
    </div>
  );
}