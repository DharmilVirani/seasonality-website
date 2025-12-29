import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import DataVisualization from '../components/DataVisualization';
import TickerSelector from '../components/TickerSelector';
import DateRangePicker from '../components/DateRangePicker';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Analysis state
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [timeframe, setTimeframe] = useState('DAILY');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date()
  });
  
  // Analysis results
  const [analysisData, setAnalysisData] = useState(null);
  const [statistics, setStatistics] = useState(null);

  // Timeframe options
  const timeframeOptions = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'MONDAY_WEEKLY', label: 'Monday Weekly' },
    { value: 'EXPIRY_WEEKLY', label: 'Expiry Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' }
  ];

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
          startDate: dateRange.startDate.toISOString().split('T')[0],
          endDate: dateRange.endDate.toISOString().split('T')[0]
        }
      });

      setAnalysisData(response.data.data);
      setStatistics(response.data.statistics);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching analysis data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    // Auto-trigger analysis when timeframe changes
    handleAnalysis();
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <h1 className="mb-4">Seasonality Analysis Dashboard</h1>
          
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}
        </Col>
      </Row>

      {/* Control Panel */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Select Symbol</Form.Label>
                <TickerSelector
                  value={selectedSymbol}
                  onChange={setSelectedSymbol}
                  onAnalysis={handleAnalysis}
                />
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label>Select Timeframe</Form.Label>
                <Form.Select
                  value={timeframe}
                  onChange={(e) => handleTimeframeChange(e.target.value)}
                >
                  {timeframeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>Select Date Range</Form.Label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                />
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label>Actions</Form.Label>
                <div className="d-grid">
                  <Button 
                    onClick={handleAnalysis}
                    disabled={loading}
                    variant="primary"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Analyzing...
                      </>
                    ) : (
                      'Analyze Data'
                    )}
                  </Button>
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Statistics Overview */}
      {statistics && (
        <Row className="mb-4">
          <Col md={2}>
            <Card>
              <Card.Body>
                <Card.Title className="text-center">Total Records</Card.Title>
                <h3 className="text-center text-primary">{statistics.totalRecords || 0}</h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card>
              <Card.Body>
                <Card.Title className="text-center">Average Return</Card.Title>
                <h3 className="text-center text-success">
                  {statistics.averageReturn ? `${statistics.averageReturn.toFixed(2)}%` : 'N/A'}
                </h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card>
              <Card.Body>
                <Card.Title className="text-center">Win Rate</Card.Title>
                <h3 className="text-center text-info">
                  {statistics.winRate ? `${statistics.winRate.toFixed(1)}%` : 'N/A'}
                </h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card>
              <Card.Body>
                <Card.Title className="text-center">Max Gain</Card.Title>
                <h3 className="text-center text-success">
                  {statistics.maxGain ? `${statistics.maxGain.toFixed(2)}%` : 'N/A'}
                </h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card>
              <Card.Body>
                <Card.Title className="text-center">Max Loss</Card.Title>
                <h3 className="text-center text-danger">
                  {statistics.maxLoss ? `${statistics.maxLoss.toFixed(2)}%` : 'N/A'}
                </h3>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2}>
            <Card>
              <Card.Body>
                <Card.Title className="text-center">Current Symbol</Card.Title>
                <h3 className="text-center text-warning">{selectedSymbol}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Data Visualization */}
      <Row>
        <Col>
          <DataVisualization
            data={analysisData}
            timeframe={timeframe}
            symbol={selectedSymbol}
            statistics={statistics}
            loading={loading}
          />
        </Col>
      </Row>

      {/* Timeframe Comparison */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Timeframe Comparison</Card.Title>
              <p className="text-muted">
                Compare analysis results across different timeframes for {selectedSymbol}
              </p>
              <Row>
                {timeframeOptions.map(option => (
                  <Col md={2} key={option.value} className="mb-3">
                    <Button
                      variant={timeframe === option.value ? 'primary' : 'outline-primary'}
                      onClick={() => handleTimeframeChange(option.value)}
                      className="w-100"
                    >
                      {option.label}
                    </Button>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      {user?.role === 'admin' && (
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Body>
                <Card.Title>Admin Actions</Card.Title>
                <Row>
                  <Col md={3}>
                    <Button 
                      href="/admin" 
                      variant="warning" 
                      className="w-100"
                    >
                      Go to Admin Panel
                    </Button>
                  </Col>
                  <Col md={3}>
                    <Button 
                      variant="info" 
                      className="w-100"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Data
                    </Button>
                  </Col>
                  <Col md={3}>
                    <Button 
                      variant="secondary" 
                      className="w-100"
                      onClick={() => {
                        setSelectedSymbol('RELIANCE');
                        setTimeframe('DAILY');
                        setDateRange({
                          startDate: new Date(new Date().getFullYear(), 0, 1),
                          endDate: new Date()
                        });
                        setAnalysisData(null);
                        setStatistics(null);
                      }}
                    >
                      Reset Filters
                    </Button>
                  </Col>
                  <Col md={3}>
                    <Button 
                      variant="success" 
                      className="w-100"
                      onClick={handleAnalysis}
                    >
                      Re-analyze
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}