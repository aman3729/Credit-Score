import axios from 'axios';
import { toast } from '../hooks/use-toast';

// Create axios instance with base URL
const api = axios.create({
  baseURL: '/api/v1', // Use relative URL to leverage Vite proxy
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending cookies with CORS
  timeout: 10000 // 10 second timeout
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { response } = error;

    // If error is not 401, reject immediately
    if (!response || response.status !== 401) {
      showErrorToast(error);
      return Promise.reject(error);
    }

    // If we're already refreshing the token, add to queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      }).catch(err => {
        return Promise.reject(err);
      });
    }

    // If this is a refresh token request or we don't have a refresh token, logout
    if (originalRequest.url.includes('/auth/refresh-token') || !localStorage.getItem('refreshToken')) {
      logoutUser();
      return Promise.reject(error);
    }

    // Try to refresh the token
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${api.defaults.baseURL}/auth/refresh-token`,
        { refreshToken: localStorage.getItem('refreshToken') },
        { withCredentials: true }
      );

      // Update tokens
      localStorage.setItem('token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Update the original request with new token
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

      // Process any queued requests
      processQueue(null, data.accessToken);
      isRefreshing = false;

      // Retry the original request
      return api(originalRequest);
    } catch (refreshError) {
      // If refresh fails, clear tokens and redirect to login
      processQueue(refreshError, null);
      logoutUser();
      return Promise.reject(refreshError);
    }
  }
);

// Helper function to handle user logout
const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  // Redirect to login page
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Helper function to show error toasts
const showErrorToast = (error) => {
  const { response } = error;
  
  // Don't show toasts for 401 errors (handled by interceptor)
  if (response && response.status === 401) return;
  
  let title = 'Error';
  let message = 'An unexpected error occurred. Please try again.';
  
  if (response) {
    if (response.data && response.data.message) {
      message = response.data.message;
    } else if (response.status === 403) {
      title = 'Access Denied';
      message = 'You do not have permission to perform this action.';
    } else if (response.status === 404) {
      title = 'Not Found';
      message = 'The requested resource was not found.';
    } else if (response.status >= 500) {
      title = 'Server Error';
      message = 'A server error occurred. Please try again later.';
    }
  } else if (error.message === 'Network Error') {
    title = 'Network Error';
    message = 'Unable to connect to the server. Please check your internet connection.';
  }
  
  toast({
    title,
    description: message,
    variant: 'destructive',
  });
};

// Export as default
export default api;

// Also export as named export for flexibility
export { api };
