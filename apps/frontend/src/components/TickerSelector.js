'use client';

import React, { useState, useEffect } from 'react';
import { Form, Spinner, Alert } from 'react-bootstrap';
import { api } from '../lib/api';

export default function TickerSelector({ value, onChange, onAnalysis }) {
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTickers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/tickers');
        setTickers(response.data.tickers || []);
      } catch (error) {
        console.error('Error fetching tickers:', error);
        setError('Failed to load tickers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTickers();
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (onAnalysis) {
      // Debounce the analysis call to avoid too many requests
      setTimeout(() => onAnalysis(), 100);
    }
  };

  return (
    <div>
      {error && (
        <Alert variant="warning" className="mb-2">
          {error}
        </Alert>
      )}

      <Form.Select
        value={value}
        onChange={handleChange}
        disabled={loading}
        className="form-select-lg"
      >
        {loading ? (
          <option>Loading tickers...</option>
        ) : tickers.length === 0 ? (
          <option>No tickers available</option>
        ) : (
          <>
            <option value="">Select a symbol...</option>
            {tickers.map(ticker => (
              <option key={ticker.id} value={ticker.symbol}>
                {ticker.symbol}
              </option>
            ))}
          </>
        )}
      </Form.Select>

      {loading && (
        <div className="text-center mt-2">
          <Spinner size="sm" />
          <span className="ms-2 text-muted">Loading...</span>
        </div>
      )}
    </div>
  );
}