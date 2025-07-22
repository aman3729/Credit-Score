import axios from 'axios';
import { getCsrfToken, fetchCsrfToken } from '../services/csrfService';

// Base API URL - defaults to the Vite proxy in development
export const API_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Helper function to generate a unique request ID
const generateRequestId = () => {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Default headers for all requests
const defaultHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Default retry configuration
const MAX_RETRIES = 2; // Reduced from 3 to 2 to prevent too many retries
const RETRY_DELAY = 3000; // Increased from 2s to 3s for initial retry
const MAX_RETRY_DELAY = 10000; // 10 seconds maximum delay
const RATE_LIMIT_WINDOW = 60; // 60 seconds rate limit window

// API base URL configuration
const API_BASE_URL = import.meta.env.DEV 
  ? '/api/v1'  // Using Vite proxy to /api/v1
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1');

console.log('API Base URL:', API_BASE_URL); // Debug log

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: defaultHeaders,
  timeout: 30000, // Increased from 15s to 30s
  withCredentials: true,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  validateStatus: function (status) {
    return status < 500; // Resolve only if status code is less than 500
  },
  paramsSerializer: function(params) {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null) {
        searchParams.append(key, params[key]);
      }
    }
    return searchParams.toString();
  }
});

// Request interceptor for adding request ID (no Authorization header)
api.interceptors.request.use(
  async (config) => {
    console.log('API Interceptor running for', config.url, 'method:', config.method);
    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId();

    // Add CSRF token for state-changing requests
    if (['post', 'put', 'patch', 'delete'].includes((config.method || '').toLowerCase())) {
      let csrfToken = getCsrfToken();
      if (!csrfToken) {
        csrfToken = await fetchCsrfToken();
      }
      console.log('Interceptor adding CSRF token:', csrfToken, 'for method', config.method);
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    // Initialize retry metadata if it doesn't exist
    if (!config.metadata) {
      config.metadata = { retryCount: 0 };
    }

    // Log request in development mode
    if (import.meta.env.MODE === 'development') {
      const logData = {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
        headers: { ...config.headers }
      };
      console.log(`[API] Request: ${logData.method} ${config.url}`, logData);
    }

    return config;
  },
  (error) => {
    console.error('[API] Request Error:', error);
    return Promise.reject(error);
  }
);

// Unified response interceptor
api.interceptors.response.use(
  response => {
    // Log successful responses in development
    if (import.meta.env.MODE === 'development') {
      console.log(`[API] Response ${response.status} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  async error => {
    const originalRequest = error.config;
    
    // Log error in development
    if (import.meta.env.MODE === 'development') {
      if (error.response) {
        console.error('[API] Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          url: originalRequest.url,
          method: originalRequest.method,
          data: error.response.data
        });
      } else if (error.request) {
        console.error('[API] No response received:', error.message);
      } else {
        console.error('[API] Request setup error:', error.message);
      }
    }

    // Handle network errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timeout. Please check your internet connection.';
      } else {
        error.message = 'Network error. Please check your internet connection.';
      }
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response.status === 401) {
      console.warn('Authentication required');
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Check if we should retry the request
    const isRetryable = 
      // Network errors
      !error.response || 
      // Server errors (5xx)
      (error.response.status >= 500 && error.response.status < 600) ||
      // Rate limiting (429)
      error.response.status === 429;
    
    // Check retry count
    const canRetry = originalRequest?.metadata?.retryCount < MAX_RETRIES;

    // Handle 429 Too Many Requests
    if (error.response.status === 429) {
      // If we've already retried too many times, reject
      if (!canRetry) {
        console.error('Max retries reached for rate-limited request');
        return Promise.reject(error);
      }
      
      // Get retry-after header or use default backoff
      let retryAfter = parseInt(error.response.headers['retry-after']) || 
                      Math.min(
                        Math.pow(2, originalRequest.metadata.retryCount) * RETRY_DELAY / 1000, 
                        RATE_LIMIT_WINDOW
                      );
      
      console.warn(`Rate limited. Retrying after ${retryAfter} seconds...`);
      
      // Increment retry count
      originalRequest.metadata.retryCount++;
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000; // up to 1 second jitter
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 + jitter));
      
      return api(originalRequest);
    }

    // Handle other retryable errors
    if (isRetryable && canRetry) {
      // Initialize metadata if needed
      originalRequest.metadata = originalRequest.metadata || { retryCount: 0 };
      
      // Calculate delay with exponential backoff plus jitter
      const baseDelay = Math.min(
        Math.pow(2, originalRequest.metadata.retryCount) * RETRY_DELAY,
        MAX_RETRY_DELAY
      );
      const jitter = Math.random() * 2000; // up to 2 seconds jitter
      const delay = Math.min(baseDelay + jitter, MAX_RETRY_DELAY);
      
      // Increment retry count
      originalRequest.metadata.retryCount++;
      
      console.warn(`Retrying ${originalRequest.method?.toUpperCase()} ${originalRequest.url} (${originalRequest.metadata.retryCount}/${MAX_RETRIES}) in ${Math.round(delay/1000)}s...`);
      
      // Wait for the calculated delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      return api(originalRequest);
    }

    // For other errors, reject the promise
    return Promise.reject(error);
  }
);

// Export the configured axios instance
export default api;