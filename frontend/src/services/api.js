const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Helper to make API requests with automatic Authorization Bearer token header.
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('mw_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMessage = data?.detail || `Error ${response.status}: ${response.statusText}`;
    throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
  }

  return data;
}

export const authService = {
  async login(usernameOrEmail, password) {
    const data = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username_or_email: usernameOrEmail,
        password,
      }),
    });
    if (data.access_token) {
      localStorage.setItem('mw_token', data.access_token);
      localStorage.setItem('mw_user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(userData) {
    const data = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return data;
  },

  async getCurrentUser() {
    return await apiRequest('/api/v1/auth/me', {
      method: 'GET',
    });
  },

  async updateProfile(profileData) {
    const data = await apiRequest('/api/v1/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    if (data) {
      localStorage.setItem('mw_user', JSON.stringify(data));
    }
    return data;
  },

  logout() {
    localStorage.removeItem('mw_token');
    localStorage.removeItem('mw_user');
  },

  getSavedUser() {
    const userStr = localStorage.getItem('mw_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('mw_token');
  },
};
