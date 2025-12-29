'use client';

import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { LineChart, BarChart } from './charts';

export default function DataVisualization({ data, timeframe, symbol, statistics, loading }) {
    if (loading) {
        return (
            <Card>
                <Card.Body className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">Loading analysis data...</p>
                </Card.Body>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <Card.Body className="text-center py-5">
                    <h5 className="text-muted">No data available</h5>
                    <p className="text-muted">
                        Please select a symbol and timeframe to view analysis
                    </p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card>
            <Card.Body>
                <Card.Title className="mb-4">
                    {symbol} - {timeframe} Analysis
                </Card.Title>

                <Row>
                    {/* Price Chart */}
                    <Col md={8}>
                        <div className="mb-4">
                            <h6>Price Movement</h6>
                            <LineChart
                                data={data}
                                xKey="date"
                                yKey="close"
                                height={400}
                                color="#007bff"
                            />
                        </div>
                    </Col>

                    {/* Volume Chart */}
                    <Col md={4}>
                        <div className="mb-4">
                            <h6>Volume Analysis</h6>
                            <BarChart
                                data={data.slice(0, 20)} // Show last 20 data points for volume
                                xKey="date"
                                yKey="volume"
                                height={400}
                                color="#28a745"
                            />
                        </div>
                    </Col>
                </Row>

                <Row>
                    {/* Return Distribution */}
                    <Col md={6}>
                        <div className="mb-4">
                            <h6>Return Distribution</h6>
                            <BarChart
                                data={data.slice(0, 30)} // Show last 30 data points
                                xKey="date"
                                yKey="returnPercentage"
                                height={300}
                                color="#17a2b8"
                            />
                        </div>
                    </Col>

                    {/* Statistics Summary */}
                    <Col md={6}>
                        <div className="mb-4">
                            <h6>Key Statistics</h6>
                            <div className="row text-center">
                                <div className="col-6 mb-3">
                                    <div className="p-3 bg-primary bg-opacity-10 rounded">
                                        <h5 className="text-primary mb-1">
                                            {statistics?.averageReturn?.toFixed(2) || '0.00'}%
                                        </h5>
                                        <small className="text-muted">Avg Return</small>
                                    </div>
                                </div>
                                <div className="col-6 mb-3">
                                    <div className="p-3 bg-success bg-opacity-10 rounded">
                                        <h5 className="text-success mb-1">
                                            {statistics?.winRate?.toFixed(1) || '0.0'}%
                                        </h5>
                                        <small className="text-muted">Win Rate</small>
                                    </div>
                                </div>
                                <div className="col-6 mb-3">
                                    <div className="p-3 bg-info bg-opacity-10 rounded">
                                        <h5 className="text-info mb-1">
                                            {statistics?.maxGain?.toFixed(2) || '0.00'}%
                                        </h5>
                                        <small className="text-muted">Max Gain</small>
                                    </div>
                                </div>
                                <div className="col-6 mb-3">
                                    <div className="p-3 bg-danger bg-opacity-10 rounded">
                                        <h5 className="text-danger mb-1">
                                            {statistics?.maxLoss?.toFixed(2) || '0.00'}%
                                        </h5>
                                        <small className="text-muted">Max Loss</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
}
