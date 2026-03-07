const API_BASE_URL = 'http://localhost:5000/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Create headers with authentication
const createHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: createHeaders(options.auth !== false),
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Order API functions
export const orderAPI = {
  // Get all orders
  getOrders: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/orders${queryString ? `?${queryString}` : ''}`);
  },

  // Get single order
  getOrder: (id) => apiRequest(`/orders/${id}`),

  // Create order
  createOrder: (orderData) => apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  }),

  // Update order
  updateOrder: (id, orderData) => apiRequest(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(orderData)
  }),

  // Delete order
  deleteOrder: (id) => apiRequest(`/orders/${id}`, {
    method: 'DELETE'
  })
};

// Auth API functions
export const authAPI = {
  // Login
  login: (email, password) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    auth: false
  }),

  // Register
  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
    auth: false
  }),

  // Get current user
  getMe: () => apiRequest('/auth/me'),

  // Logout
  logout: () => apiRequest('/auth/logout', {
    method: 'POST'
  })
};

export default apiRequest;