'use client';

import React from 'react';

export default function LineChart({ data, xKey, yKey, height = 300, color = '#007bff' }) {
    if (!data || data.length === 0) {
        return (
            <div style={{ height, border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                    No data available
                </div>
            </div>
        );
    }

    // Simple line chart implementation using SVG
    const width = 600;
    const padding = 40;

    // Extract values for chart
    const values = data.map(d => d[yKey]).filter(v => v != null);
    const dates = data.map(d => d[xKey]);

    if (values.length === 0) {
        return (
            <div style={{ height, border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                    No values available
                </div>
            </div>
        );
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Calculate SVG path for line
    const points = data
        .filter(d => d[yKey] != null)
        .map((d, index) => {
            const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
            const y = height - padding - ((d[yKey] - minValue) / valueRange) * (height - 2 * padding);
            return `${x},${y}`;
        });

    const pathData = `M ${points.join(' L ')}`;

    return (
        <div style={{ position: 'relative' }}>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                {/* Grid lines */}
                <g stroke="#e9ecef" strokeWidth="1">
                    {[0, 1, 2, 3, 4].map(i => (
                        <line
                            key={i}
                            x1={padding}
                            y1={padding + (i * (height - 2 * padding)) / 4}
                            x2={width - padding}
                            y2={padding + (i * (height - 2 * padding)) / 4}
                        />
                    ))}
                </g>

                {/* Axes */}
                <g stroke="#6c757d" strokeWidth="2">
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
                    <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
                </g>

                {/* Line */}
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Data points */}
                {data.filter(d => d[yKey] != null).map((d, index) => {
                    const x = padding + (index * (width - 2 * padding)) / (data.length - 1);
                    const y = height - padding - ((d[yKey] - minValue) / valueRange) * (height - 2 * padding);

                    return (
                        <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="3"
                            fill={color}
                            stroke="white"
                            strokeWidth="1"
                        />
                    );
                })}
            </svg>

            {/* Y-axis labels */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px' }}>
                <div style={{
                    position: 'absolute',
                    top: '0',
                    bottom: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#6c757d'
                }}>
                    <span>{maxValue.toFixed(2)}</span>
                    <span>{((maxValue + minValue) / 2).toFixed(2)}</span>
                    <span>{minValue.toFixed(2)}</span>
                </div>
            </div>

            {/* X-axis labels (first and last only) */}
            <div style={{
                position: 'absolute',
                bottom: '0',
                left: padding,
                right: padding,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#6c757d'
            }}>
                <span>{dates[0]}</span>
                <span>{dates[dates.length - 1]}</span>
            </div>
        </div>
    );
}