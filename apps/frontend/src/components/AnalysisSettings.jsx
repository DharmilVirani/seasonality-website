'use client';

import React from 'react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Settings, BarChart2, TrendingUp, Calendar, Users } from 'lucide-react';

export default function AnalysisSettings({ settings, onSettingsChange }) {
  const statisticalTests = [
    { id: 'shapiro', name: 'Shapiro-Wilk Test' },
    { id: 'jarque', name: 'Jarque-Bera Test' },
    { id: 'anderson', name: 'Anderson-Darling Test' },
    { id: 'kolmogorov', name: 'Kolmogorov-Smirnov Test' },
  ];

  const electionCountries = [
    { id: 'USA', name: 'United States' },
    { id: 'INDIA', name: 'India' },
    { id: 'UK', name: 'United Kingdom' },
    { id: 'GERMANY', name: 'Germany' },
    { id: 'FRANCE', name: 'France' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Analysis Settings</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Timeframe Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart2 className="h-4 w-4 text-blue-500" />
            <Label htmlFor="timeframe" className="text-sm font-medium">Timeframe</Label>
          </div>
          <Select value={settings.timeframe} onValueChange={(value) => onSettingsChange({ timeframe: value })}>
            <SelectTrigger id="timeframe" className="w-full">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Significance Level */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <Label htmlFor="significance" className="text-sm font-medium">Significance Level</Label>
          </div>
          <Select 
            value={settings.significanceLevel.toString()} 
            onValueChange={(value) => onSettingsChange({ significanceLevel: parseFloat(value) })}
          >
            <SelectTrigger id="significance" className="w-full">
              <SelectValue placeholder="Select significance level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.01">0.01 (99% confidence)</SelectItem>
              <SelectItem value="0.05">0.05 (95% confidence)</SelectItem>
              <SelectItem value="0.10">0.10 (90% confidence)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">Features</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Switch
                id="political-cycles"
                checked={settings.includePoliticalCycles}
                onCheckedChange={(checked) => onSettingsChange({ includePoliticalCycles: checked })}
              />
              <div>
                <Label htmlFor="political-cycles" className="text-sm font-medium">Political Cycles</Label>
                <p className="text-xs text-gray-500">Include election and political event analysis</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Switch
                id="special-days"
                checked={settings.includeSpecialDays}
                onCheckedChange={(checked) => onSettingsChange({ includeSpecialDays: checked })}
              />
              <div>
                <Label htmlFor="special-days" className="text-sm font-medium">Special Days</Label>
                <p className="text-xs text-gray-500">Include holidays and special trading days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistical Tests */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium text-gray-700">Statistical Tests</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {statisticalTests.map((test) => (
            <div key={test.id} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg">
              <Checkbox
                id={test.id}
                checked={settings.statisticalTests.includes(test.id)}
                onCheckedChange={(checked) => {
                  const currentTests = settings.statisticalTests;
                  const newTests = checked
                    ? [...currentTests, test.id]
                    : currentTests.filter(t => t !== test.id);
                  onSettingsChange({ statisticalTests: newTests });
                }}
              />
              <Label htmlFor={test.id} className="text-sm">{test.name}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Election Countries */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-gray-700">Election Countries</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {electionCountries.map((country) => (
            <div key={country.id} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg">
              <Checkbox
                id={`country-${country.id}`}
                checked={settings.electionCountries.includes(country.id)}
                onCheckedChange={(checked) => {
                  const currentCountries = settings.electionCountries;
                  const newCountries = checked
                    ? [...currentCountries, country.id]
                    : currentCountries.filter(c => c !== country.id);
                  onSettingsChange({ electionCountries: newCountries });
                }}
              />
              <Label htmlFor={`country-${country.id}`} className="text-sm">{country.name}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Timeframe: <span className="font-medium">{settings.timeframe}</span></div>
          <div>Significance Level: <span className="font-medium">{settings.significanceLevel}</span></div>
          <div>Political Cycles: <span className="font-medium">{settings.includePoliticalCycles ? 'Enabled' : 'Disabled'}</span></div>
          <div>Special Days: <span className="font-medium">{settings.includeSpecialDays ? 'Enabled' : 'Disabled'}</span></div>
          <div>Statistical Tests: <span className="font-medium">{settings.statisticalTests.join(', ')}</span></div>
          <div>Election Countries: <span className="font-medium">{settings.electionCountries.join(', ')}</span></div>
        </div>
      </div>
    </div>
  );
}