'use client';

import React from 'react';
import { DatePicker } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, Clock, TrendingUp, TrendingDown } from 'lucide-react';

export default function CustomDateRangePicker({ dateRange, onDateRangeChange, isLoading }) {
  const [startDate, endDate] = dateRange;

  const predefinedRanges = [
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'Last 6 Months', days: 180 },
    { label: 'Last 1 Year', days: 365 },
    { label: 'Last 5 Years', days: 1825 },
  ];

  const handlePredefinedRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    onDateRangeChange([start, end]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Custom Date Range</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <DatePicker
            selected={startDate}
            onChange={(date) => onDateRangeChange([date, endDate])}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Start date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            dateFormat="yyyy-MM-dd"
          />
        </div>
        
        <div className="relative">
          <DatePicker
            selected={endDate}
            onChange={(date) => onDateRangeChange([startDate, date])}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            placeholderText="End date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            dateFormat="yyyy-MM-dd"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {predefinedRanges.map((range) => (
          <button
            key={range.days}
            onClick={() => handlePredefinedRange(range.days)}
            disabled={isLoading}
            className="px-3 py-2 text-xs bg-gray-100 hover:bg-blue-100 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span>Positive</span>
          </span>
          <span className="flex items-center space-x-1">
            <TrendingDown className="h-3 w-3 text-red-500" />
            <span>Negative</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-3 w-3" />
          <span>Real-time updates</span>
        </div>
      </div>
    </div>
  );
}