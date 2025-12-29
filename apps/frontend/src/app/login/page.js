'use client';

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = isLogin
        ? await login(formData.username, formData.password)
        : await register(formData.username, formData.email, formData.password);

      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || (isLogin ? 'Login failed' : 'Registration failed'));
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100">
      <Col md={6} lg={4}>
        <Card>
          <Card.Body>
            <Card.Title className="text-center mb-4">
              {isLogin ? 'Login' : 'Register'}
            </Card.Title>

            {error && (
              <Alert variant="danger" onClose={() => setError('')} dismissible>
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              {!isLogin && (
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    required={!isLogin}
                    placeholder="Enter your email"
                  />
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter username"
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter password"
                />
              </Form.Group>

              <Button
                type="submit"
                className="w-100 mb-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    {isLogin ? 'Logging in...' : 'Registering...'}
                  </>
                ) : (
                  isLogin ? 'Login' : 'Register'
                )}
              </Button>
            </Form>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData(isLogin ? { username: '', password: '' } : { username: '', email: '', password: '' });
                }}
              >
                {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Container>
  );
}