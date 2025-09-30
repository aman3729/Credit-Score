import axios from 'axios';
import { toast } from '../hooks/use-toast';
import { getCsrfToken, fetchCsrfToken } from '../services/csrfService';

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

// Add a request interceptor to attach CSRF token to mutating requests
api.interceptors.request.use(
  async (config) => {
    // Attach CSRF token for mutating requests
    const method = config.method && config.method.toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      let csrfToken = getCsrfToken();
      if (!csrfToken) {
        csrfToken = await fetchCsrfToken();
      }
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor to add auth token to requests
// Removed Bearer token injection. We rely on httpOnly auth cookies set by the server.

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
    // For cookie-based auth, simply redirect to login on 401
    logoutUser();
    return Promise.reject(error);
  }
);

// Helper function to handle user logout
const logoutUser = () => {
  // Tokens are stored in httpOnly cookies by the server.
  // Just navigate to login; server will clear cookies on logout endpoint if needed.
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

// Mapping Profile API
export async function createMappingProfile(profile) {
  // Update to correct endpoint if needed
  return await api.post('/schema-mapping/create', profile);
}
export async function getMappingProfiles(partnerId) {
  // Use the correct backend endpoint for partner mappings
  return await api.get(`/schema-mapping/partner/${partnerId}`);
}
export async function getMappingProfile(id) {
  // If a get-by-id endpoint exists, update here; otherwise, remove or adjust as needed
  return await api.get(`/schema-mapping/${id}`);
}
export async function updateMappingProfile(id, updates) {
  // If an update endpoint exists, update here; otherwise, remove or adjust as needed
  return await api.put(`/schema-mapping/${id}`, updates);
}
export async function deleteMappingProfile(id) {
  // If a delete endpoint exists, update here; otherwise, remove or adjust as needed
  return await api.delete(`/schema-mapping/${id}`);
}

// Fetch admin stats
export async function fetchAdminStats() {
  const response = await fetch("/api/v1/admin/stats", {
    method: "GET",
    headers: {
      "accept": "application/json"
    },
    credentials: "include" // Only if your API requires cookies/session
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch admin stats: ${response.status}`);
  }
  return await response.json();
}
