const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Store token in memory for immediate access
let authToken = localStorage.getItem('token');

// Function to update the auth token
const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

const handleResponse = async (response) => {
  // Handle 401 Unauthorized
  if (response.status === 401) {
    // Clear token and redirect to login if we get unauthorized
    setAuthToken(null);
    window.location.href = '/login';
    throw new Error('Your session has expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `API request failed with status ${response.status}`
    }));
    const error = new Error(errorData.message || 'An unknown error occurred');
    error.status = response.status;
    throw error;
  }

  // Handle 204 No Content response
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const _request = async (endpoint, options = {}) => {
  const headers = {
    'Accept': 'application/json',
    ...options.headers,
  };

  // Only add Authorization header if we have a token
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Handle FormData vs JSON body
  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      ...options,
      headers,
      body,
      credentials: 'include',
    });

    const data = await handleResponse(response);
    
    // If this was a login/signup request, update the token
    if ((endpoint === '/auth/login' || endpoint === '/auth/register') && data?.token) {
      setAuthToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

const api = {
  get: (endpoint) => _request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => _request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => _request(endpoint, { method: 'PUT', body }),
  patch: (endpoint, body) => _request(endpoint, { method: 'PATCH', body }),
  delete: (endpoint) => _request(endpoint, { method: 'DELETE' }),
  setAuthToken, // Export the setAuthToken function
};

export default api;
