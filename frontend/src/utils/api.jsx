const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const apiFetch = async (endpoint, options = {}) => {
  const opts = {
    ...options,
    credentials: 'include', // Always send cookies
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
    },
  };
  const response = await fetch(endpoint, opts);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API error');
  }
  return data;
};

const api = {
  get: (endpoint) => apiFetch(`${API_BASE_URL}/api${endpoint}`, { method: 'GET' }),
  post: (endpoint, body) => apiFetch(`${API_BASE_URL}/api${endpoint}`, { method: 'POST', body }),
  put: (endpoint, body) => apiFetch(`${API_BASE_URL}/api${endpoint}`, { method: 'PUT', body }),
  patch: (endpoint, body) => apiFetch(`${API_BASE_URL}/api${endpoint}`, { method: 'PATCH', body }),
  delete: (endpoint) => apiFetch(`${API_BASE_URL}/api${endpoint}`, { method: 'DELETE' }),
};

export default api;
