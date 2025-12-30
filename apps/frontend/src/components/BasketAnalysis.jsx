'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, TrendingDown, Target, Shield, DollarSign } from 'lucide-react';

export default function BasketAnalysis({ tickers, isLoading }) {
  const [selectedBasket, setSelectedBasket] = useState('all');
  const [basketData, setBasketData] = useState(null);
  const [basketComposition, setBasketComposition] = useState([]);

  // Sample basket definitions
  const baskets = {
    'all': { name: 'All Tickers', tickers: tickers.map(t => t.symbol) },
    'indices': { name: 'Indices', tickers: ['NIFTY', 'BANKNIFTY', 'SENSEX'] },
    'fno': { name: 'F&O Stocks', tickers: ['RELIANCE', 'INFY', 'HDFCBANK', 'ICICIBANK'] },
    'tech': { name: 'Technology', tickers: ['INFY', 'TCS', 'WIPRO', 'TECHM'] },
    'banking': { name: 'Banking', tickers: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK'] },
    'energy': { name: 'Energy', tickers: ['RELIANCE', 'ONGC', 'BPCL', 'IOC'] },
  };

  useEffect(() => {
    if (tickers.length > 0) {
      generateBasketData();
    }
  }, [tickers, selectedBasket]);

  const generateBasketData = () => {
    // Generate sample data for demonstration
    const data = [];
    const composition = [];
    
    const selectedTickers = baskets[selectedBasket]?.tickers || tickers.map(t => t.symbol);
    
    // Generate time series data
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      
      const dailyReturns = selectedTickers.map(ticker => {
        // Generate random returns for demonstration
        const returnVal = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5%
        return { ticker, return: returnVal };
      });
      
      const basketReturn = dailyReturns.reduce((sum, r) => sum + r.return, 0) / dailyReturns.length;
      
      data.push({
        date: date.toISOString().split('T')[0],
        return: basketReturn * 100, // Convert to percentage
        volume: Math.random() * 1000000,
      });
    }

    // Generate composition data
    selectedTickers.forEach((ticker, index) => {
      composition.push({
        name: ticker,
        weight: Math.random() * 100,
        return: (Math.random() - 0.5) * 10, // -5% to +5%
        color: `hsl(${index * 45}, 70%, 50%)`,
      });
    });

    const totalWeight = composition.reduce((sum, c) => sum + c.weight, 0);
    const normalizedComposition = composition.map(c => ({
      ...c,
      weight: (c.weight / totalWeight) * 100,
    }));

    setBasketData(data);
    setBasketComposition(normalizedComposition);
  };

  const getBasketStats = () => {
    if (!basketData || basketData.length === 0) return null;

    const totalReturn = basketData.reduce((sum, d) => sum + d.return, 0);
    const avgReturn = totalReturn / basketData.length;
    const positiveDays = basketData.filter(d => d.return > 0).length;
    const negativeDays = basketData.filter(d => d.return < 0).length;
    const winRate = (positiveDays / basketData.length) * 100;
    
    const volatility = Math.sqrt(
      basketData.reduce((sum, d) => sum + Math.pow(d.return - avgReturn, 2), 0) / basketData.length
    );

    return {
      totalReturn,
      avgReturn,
      positiveDays,
      negativeDays,
      winRate,
      volatility,
      maxReturn: Math.max(...basketData.map(d => d.return)),
      minReturn: Math.min(...basketData.map(d => d.return)),
    };
  };

  const stats = getBasketStats();

  const renderBasketOverview = () => {
    if (!basketData) {
      return (
        <div className="text-center py-8 text-gray-500">
          Select a basket to view analysis
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Basket Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Return</p>
                  <p className={`text-lg font-bold ${stats.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}%
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
                  <p className="text-sm text-gray-600">Avg Daily Return</p>
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
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Volatility</p>
                  <p className="text-lg font-bold text-orange-600">{stats.volatility.toFixed(2)}%</p>
                </div>
                <Shield className="h-8 w-8 text-orange-500" />
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
                <DollarSign className="h-8 w-8 text-green-500" />
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{baskets[selectedBasket]?.name} Performance</CardTitle>
              <CardDescription>Basket return over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={basketData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="return" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Volume Analysis</CardTitle>
              <CardDescription>Trading volume over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={basketData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="volume" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Composition */}
        <Card>
          <CardHeader>
            <CardTitle>Basket Composition</CardTitle>
            <CardDescription>Weight distribution across components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={basketComposition}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, weight }) => `${name}: ${weight.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="weight"
                  >
                    {basketComposition.map((entry, index) => (
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

  const renderCorrelationAnalysis = () => {
    if (!basketComposition) {
      return (
        <div className="text-center py-8 text-gray-500">
          No correlation data available
        </div>
      );
    }

    const correlations = basketComposition.map((comp1, i) => 
      basketComposition.map((comp2, j) => ({
        ticker1: comp1.name,
        ticker2: comp2.name,
        correlation: i === j ? 1 : (Math.random() * 0.8 - 0.4), // -0.4 to 0.4 for different tickers
      }))
    ).flat();

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {basketComposition.map((comp) => (
            <Card key={comp.name}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ticker</p>
                    <p className="text-lg font-bold">{comp.name}</p>
                    <p className="text-xs text-gray-500">Weight: {comp.weight.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Return</p>
                    <p className={`text-lg font-bold ${comp.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {comp.return >= 0 ? '+' : ''}{comp.return.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Correlation Matrix</CardTitle>
            <CardDescription>Relationships between basket components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={correlations.filter(c => c.ticker1 !== c.ticker2)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ticker1" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="correlation" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderRiskAnalysis = () => {
    if (!stats) {
      return (
        <div className="text-center py-8 text-gray-500">
          No risk analysis data available
        </div>
      );
    }

    const riskMetrics = [
      { name: 'Sharpe Ratio', value: (stats.avgReturn / stats.volatility).toFixed(2), color: 'text-blue-600' },
      { name: 'Sortino Ratio', value: (stats.avgReturn / Math.max(0, stats.minReturn)).toFixed(2), color: 'text-green-600' },
      { name: 'Max Drawdown', value: `${Math.abs(stats.minReturn).toFixed(2)}%`, color: 'text-red-600' },
      { name: 'VaR (95%)', value: `${(stats.avgReturn - 1.645 * stats.volatility).toFixed(2)}%`, color: 'text-orange-600' },
      { name: 'Beta (vs Market)', value: '1.00', color: 'text-purple-600' },
      { name: 'Alpha', value: '0.00%', color: 'text-gray-600' },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riskMetrics.map((metric) => (
            <Card key={metric.name}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{metric.name}</p>
                    <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
                  </div>
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Probability distribution of returns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={basketData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="return" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="volatility" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
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
          <h2 className="text-2xl font-bold text-gray-900">Basket Analysis</h2>
          <p className="text-gray-600">Analyze performance of symbol baskets</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Selected Basket</p>
          <p className="text-lg font-semibold">{baskets[selectedBasket]?.name || 'N/A'}</p>
        </div>
      </div>

      {/* Basket Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
        {Object.entries(baskets).map(([key, basket]) => (
          <button
            key={key}
            onClick={() => setSelectedBasket(key)}
            className={`p-3 rounded-lg border-2 transition-colors ${
              selectedBasket === key 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{basket.name}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{basket.tickers.length} symbols</p>
          </button>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderBasketOverview()}
        </TabsContent>

        <TabsContent value="correlation">
          {renderCorrelationAnalysis()}
        </TabsContent>

        <TabsContent value="risk">
          {renderRiskAnalysis()}
        </TabsContent>
      </Tabs>
    </div>
  );
}