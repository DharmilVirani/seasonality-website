'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';
import { api } from '../lib/api';

export default function TimeframeComparison({ symbol, dateRange, selectedTimeframe }) {
    const [comparisonData, setComparisonData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const timeframeOptions = [
        { value: 'DAILY', label: 'Daily' },
        { value: 'MONDAY_WEEKLY', label: 'Monday Weekly' },
        { value: 'EXPIRY_WEEKLY', label: 'Expiry Weekly' },
        { value: 'MONTHLY', label: 'Monthly' },
        { value: 'YEARLY', label: 'Yearly' }
    ];

    useEffect(() => {
        const fetchComparisonData = async () => {
            setLoading(true);
            setError(null);

            const promises = timeframeOptions.map(option =>
                api.get('/analysis/seasonality', {
                    params: {
                        symbol,
                        timeframe: option.value.toLowerCase(),
                        startDate: dateRange.startDate.toISOString().split('T')[0],
                        endDate: dateRange.endDate.toISOString().split('T')[0]
                    }
                }).catch(error => ({
                    error: true,
                    timeframe: option.value,
                    message: error.response?.data?.message || 'Failed to fetch data'
                }))
            );

            try {
                const responses = await Promise.all(promises);
                const data = {};

                responses.forEach((response, index) => {
                    const option = timeframeOptions[index];
                    if (response.error) {
                        data[option.value] = { error: response.message };
                    } else {
                        data[option.value] = response.data.statistics || {};
                    }
                });

                setComparisonData(data);
            } catch (error) {
                console.error('Error fetching comparison data:', error);
                setError('Failed to fetch comparison data');
            } finally {
                setLoading(false);
            }
        };

        if (symbol && dateRange.startDate && dateRange.endDate) {
            fetchComparisonData();
        }
    }, [symbol, dateRange]);

    const getStatColor = (value) => {
        if (value > 0) return 'success';
        if (value < 0) return 'danger';
        return 'secondary';
    };

    const formatPercentage = (value) => {
        if (value == null) return 'N/A';
        return `${value.toFixed(2)}%`;
    };

    return (
        <Card>
            <Card.Body>
                <Card.Title>Timeframe Comparison</Card.Title>
                <p className="text-muted mb-4">
                    Compare analysis results across different timeframes for {symbol}
                </p>

                {error && (
                    <Alert variant="warning" className="mb-3">
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" />
                        <p className="mt-2 text-muted">Loading comparison data...</p>
                    </div>
                ) : (
                    <Row>
                        {timeframeOptions.map(option => {
                            const stats = comparisonData[option.value];
                            const isSelected = selectedTimeframe === option.value;

                            return (
                                <Col md={2} key={option.value} className="mb-3">
                                    <Card
                                        className={`h-100 ${isSelected ? 'border-primary shadow' : 'border-light'}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => window.location.href = `/?timeframe=${option.value}`}
                                    >
                                        <Card.Body className="p-3">
                                            <Card.Title className="text-center mb-3">
                                                <span className={`badge ${isSelected ? 'bg-primary' : 'bg-light text-dark'}`}>
                                                    {option.label}
                                                </span>
                                            </Card.Title>

                                            {stats?.error ? (
                                                <div className="text-center text-danger small">
                                                    Error loading data
                                                </div>
                                            ) : stats ? (
                                                <div className="text-center">
                                                    <div className="mb-2">
                                                        <strong className={`text-${getStatColor(stats.averageReturn)}`}>
                                                            {formatPercentage(stats.averageReturn)}
                                                        </strong>
                                                        <div className="text-muted small">Avg Return</div>
                                                    </div>

                                                    <div className="mb-2">
                                                        <strong className="text-info">
                                                            {formatPercentage(stats.winRate)}
                                                        </strong>
                                                        <div className="text-muted small">Win Rate</div>
                                                    </div>

                                                    <div className="row text-center small">
                                                        <div className="col-6">
                                                            <span className="text-success">
                                                                {formatPercentage(stats.maxGain)}
                                                            </span>
                                                            <div className="text-muted">Max Gain</div>
                                                        </div>
                                                        <div className="col-6">
                                                            <span className="text-danger">
                                                                {formatPercentage(stats.maxLoss)}
                                                            </span>
                                                            <div className="text-muted">Max Loss</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-muted small">
                                                    No data available
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                )}
            </Card.Body>
        </Card>
    );
}