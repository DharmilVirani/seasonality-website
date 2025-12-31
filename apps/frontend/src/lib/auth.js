'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import jwtDecode from 'jwt-decode';

export const checkAuth = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    return !!token;
  }
  return false;
};

export const getUserRole = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        return decoded.role || 'user';
      } catch (error) {
        console.error('Error decoding token:', error);
        return 'user';
      }
    }
  }
  return 'user';
};

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

export const withAuth = (Component) => {
  return function ProtectedRoute(props) {
    const router = useRouter();

    useEffect(() => {
      if (!checkAuth()) {
        router.push('/login');
      }
    }, []);

    if (!checkAuth()) {
      return null;
    }

    return <Component {...props} />;
  };
};

export const AdminRoute = (Component) => {
  return function AdminProtectedRoute(props) {
    const router = useRouter();

    useEffect(() => {
      if (!checkAuth() || getUserRole() !== 'admin') {
        router.push('/login');
      }
    }, []);

    if (!checkAuth() || getUserRole() !== 'admin') {
      return null;
    }

    return <Component {...props} />;
  };
};