import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global HTTP Interceptor for Authentication & Active Business Context
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const token = localStorage.getItem('vyapar_token');
  const activeBizId = localStorage.getItem('vyapar_active_biz_id');

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (activeBizId && !headers.has('x-business-id')) {
    headers.set('x-business-id', activeBizId);
  }

  const response = await originalFetch(url, { ...options, headers });
  if (response.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/me')) {
    localStorage.removeItem('vyapar_token');
    localStorage.removeItem('vyapar_user');
  }
  return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
