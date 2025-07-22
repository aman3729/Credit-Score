// Authentication service for handling user authentication
import api from '../utils/api';
import { fetchCsrfToken, getCsrfToken } from './csrfService';

// Login user
const login = async (identifier, password) => {
  const response = await api.post('/auth/login', { identifier, password });
  // New backend response: { status, data: { user } }
  return response.data.data.user;
};

// Verify token with server
const verifyToken = async () => {
  try {
    const response = await api.get('/auth/verify-token');
    return response.data.valid;
  } catch {
    return false;
  }
};

// Logout user
const logout = async () => {
  await api.post('/auth/logout');
};

// Make an authenticated API request
const authFetch = async (url, options = {}) => {
  try {
    const response = await api({
      url,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Register user
const register = async (userData) => {
  // Ensure CSRF token is present and fresh
  let csrfToken = getCsrfToken();
  if (!csrfToken) {
    csrfToken = await fetchCsrfToken();
  }
  // No need to set headers here; the interceptor will handle it
  const response = await api.post('/auth/register', userData);
  return response.data.data.user;
};

export default {
  login,
  logout,
  register,
  verifyToken,
  authFetch,
};