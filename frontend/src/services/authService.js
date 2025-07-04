// Authentication service for handling user authentication
import api from '../utils/api';

// Get the authentication token from localStorage
const getToken = () => {
  return localStorage.getItem('token') || null;
};

// Set the authentication token in localStorage
const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    // Also set the default Authorization header for axios
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Remove the authentication token from localStorage
const removeToken = () => {
  localStorage.removeItem('token');
  // Remove the Authorization header
  delete api.defaults.headers.common['Authorization'];
};

// Check if user is authenticated
const isAuthenticated = () => {
  return !!getToken();
};

// Login user
const login = async (identifier, password) => {
  try {
    console.log('=== AUTH SERVICE LOGIN ===');
    console.log('Logging in with identifier:', identifier);
    
    // The base URL already includes /api/v1, so we just need the endpoint path
    const response = await api.post('/auth/login', { identifier, password });
    
    console.log('Login response status:', response.status);
    console.log('Full request URL:', response.config.baseURL + response.config.url); // Debug log

    // Extract token and user data from the response
    const { token, user: userData } = response.data;
    
    console.log('Login response data:', response.data);
    console.log('Extracted user from response:', userData);
    console.log('Extracted token from response:', !!token);

    // Store the token if it exists in the response
    if (token) {
      console.log('Storing token in localStorage');
      setToken(token);
    } else {
      console.warn('No token received in login response');
    }

    // Ensure user data is properly formatted
    const formattedUser = userData ? {
      id: userData._id || userData.id,
      email: userData.email,
      name: userData.name || userData.username,
      role: userData.role || 'user',
      ...userData
    } : {};

    console.log('Formatted user data:', formattedUser);

    // Return both the user data and token
    return {
      user: formattedUser,
      token: token || null
    };
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error.response?.data?.message || 
                       error.response?.data?.error?.message || 
                       error.message || 
                       'An error occurred during authentication. Please try again.';
    
    // Create a new error with a more descriptive message
    const authError = new Error(errorMessage);
    authError.response = error.response;
    
    throw authError;
  }
};

// Verify token with server
const verifyToken = async () => {
  const token = getToken();
  console.log('=== VERIFYING TOKEN ===');
  console.log('Token exists:', !!token);
  
  if (!token) {
    console.log('No token found, returning not valid');
    return { valid: false };
  }

  try {
    console.log('Sending token verification request...');
    const response = await api.get('/auth/verify-token');
    
    console.log('Token verification response:', {
      status: response.status,
      data: response.data
    });

    // Handle both response formats
    let userData;
    if (response.data.data && response.data.data.user) {
      userData = response.data.data.user; // Nested format
    } else if (response.data.user) {
      userData = response.data.user; // Direct format
    } else if (response.data) {
      userData = response.data; // Direct user data
    }
    
    if (!userData) {
      console.error('No user data in response');
      return { valid: false };
    }
    
    // Format user data consistently
    const formattedUser = {
      id: userData._id || userData.id,
      email: userData.email,
      name: userData.name || userData.username,
      role: userData.role || 'user',
      ...userData
    };

    return {
      valid: true,
      user: formattedUser
    };
  } catch (error) {
    console.error('Token verification error:', error);
    
    // Remove token if verification fails
    if (error.response?.status === 401) {
      console.log('Token invalid, removing from storage');
      removeToken();
    } else {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
    }
    
    return { valid: false };
  }
};

// Logout user
const logout = async () => {
  try {
    // Optionally call backend logout endpoint if needed
    // await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always remove token from storage
    removeToken();
  }
};

// Get auth headers for API requests
const getAuthHeaders = () => {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
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
        ...getAuthHeaders(),
        ...options.headers,
      },
    });
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    
    // Auto-logout on 401 Unauthorized
    if (error.response?.status === 401) {
      console.log('Authentication failed, logging out');
      removeToken();
    }
    
    throw error;
  }
};

// Register user
const register = async (userData) => {
  try {
    console.log('=== AUTH SERVICE REGISTER ===');
    console.log('Registering with data:', { ...userData, password: '[HIDDEN]' });
    
    const response = await api.post('/auth/register', userData);
    
    console.log('Register response status:', response.status);
    console.log('Register response data:', response.data);

    // Extract token and user data from the response
    const { token, user: responseUserData } = response.data;
    
    // Store the token if it exists in the response
    if (token) {
      console.log('Storing token in localStorage');
      setToken(token);
    } else {
      console.warn('No token received in register response');
    }

    // Ensure user data is properly formatted
    const formattedUser = responseUserData ? {
      id: responseUserData._id || responseUserData.id,
      email: responseUserData.email,
      name: responseUserData.name || responseUserData.username,
      role: responseUserData.role || 'user',
      ...responseUserData
    } : {};

    console.log('Formatted user data:', formattedUser);

    // Return both the user data and token
    return {
      user: formattedUser,
      token: token || null
    };
  } catch (error) {
    console.error('Register error:', error);
    const errorMessage = error.response?.data?.message || 
                       error.response?.data?.error?.message || 
                       error.message || 
                       'An error occurred during registration. Please try again.';
    
    // Create a new error with a more descriptive message
    const authError = new Error(errorMessage);
    authError.response = error.response;
    
    throw authError;
  }
};

export {
  login,
  logout,
  register,
  verifyToken,
  isAuthenticated,
  getToken,
  getAuthHeaders,
  authFetch,
  setToken,
  removeToken,
};