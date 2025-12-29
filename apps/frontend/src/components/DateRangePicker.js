'use client';

import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';

export default function DateRangePicker({ value, onChange }) {
  const handleStartDateChange = (e) => {
    const newStartDate = new Date(e.target.value);
    onChange({
      ...value,
      startDate: newStartDate
    });
  };

  const handleEndDateChange = (e) => {
    const newEndDate = new Date(e.target.value);
    onChange({
      ...value,
      endDate: newEndDate
    });
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <Row>
      <Col>
        <Form.Group className="mb-2">
          <Form.Label>Start Date</Form.Label>
          <Form.Control
            type="date"
            value={formatDateForInput(value.startDate)}
            onChange={handleStartDateChange}
            max={formatDateForInput(value.endDate)}
          />
        </Form.Group>
      </Col>
      <Col>
        <Form.Group className="mb-2">
          <Form.Label>End Date</Form.Label>
          <Form.Control
            type="date"
            value={formatDateForInput(value.endDate)}
            onChange={handleEndDateChange}
            min={formatDateForInput(value.startDate)}
          />
        </Form.Group>
      </Col>
    </Row>
  );
}