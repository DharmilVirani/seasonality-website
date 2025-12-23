'use client';

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Bulk upload - get presigned URLs
export const getBulkUploadPresignedUrls = (files) => {
  return api.post('/api/upload/bulk/presign', { files });
};

// Bulk upload - start processing
export const startBulkProcessing = (batchId, objectKeys, fileNames) => {
  return api.post('/api/upload/bulk/process', { batchId, objectKeys, fileNames });
};

// Get batch status
export const getBatchStatus = (batchId) => {
  return api.get(`/api/upload/bulk/${batchId}/status`);
};

// Get all batches
export const getBatches = (params = {}) => {
  return api.get('/api/upload/bulk', { params });
};

// Retry failed files in batch
export const retryBatch = (batchId) => {
  return api.post(`/api/upload/bulk/${batchId}/retry`);
};

export const getTickers = () => {
  return api.get('/api/data/tickers');
};

export const getSeasonalityData = (tickerId, params = {}) => {
  return api.get(`/api/data/ticker/${tickerId}`, { params });
};

export const getAggregateData = (params = {}) => {
  return api.get('/api/data/aggregate', { params });
};

export const checkHealth = () => {
  return api.get('/api/health');
};

export const login = (email, password) => {
  return api.post('/api/auth/login', { email, password });
};

export const register = (userData) => {
  return api.post('/api/auth/register', userData);
};

export const getUsers = () => {
  return api.get('/api/users');
};

export const createUser = (userData) => {
  return api.post('/api/users', userData);
};

export const updateUser = (userId, userData) => {
  return api.put(`/api/users/${userId}`, userData);
};

export const deleteUser = (userId) => {
  return api.delete(`/api/users/${userId}`);
};

export default api;