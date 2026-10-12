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

export const doctorService = {
  async getDoctors(params = {}) {
    const query = new URLSearchParams();
    if (params.specialization && params.specialization !== 'all') {
      query.append('specialization', params.specialization);
    }
    if (params.search) {
      query.append('search', params.search);
    }
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest(`/api/v1/doctors${queryString}`);
  },
};

export const appointmentService = {
  async getAppointments(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.doctor && params.doctor !== 'all') query.append('doctor', params.doctor);
    if (params.type && params.type !== 'all') query.append('type', params.type);
    if (params.patient_id) query.append('patient_id', params.patient_id);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest(`/api/v1/appointments${queryString}`);
  },

  async createAppointment(appointmentData) {
    return await apiRequest('/api/v1/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  },

  async updateAppointment(id, updateData) {
    return await apiRequest(`/api/v1/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  async deleteAppointment(id) {
    return await apiRequest(`/api/v1/appointments/${id}`, {
      method: 'DELETE',
    });
  },

  async getStats() {
    return await apiRequest('/api/v1/appointments/stats');
  },

  async checkAvailability(doctor, datetime, excludeId = null) {
    const query = new URLSearchParams({
      doctor,
      datetime,
    });
    if (excludeId) query.append('exclude_appointment_id', excludeId);
    return await apiRequest(`/api/v1/appointments/check-availability?${query.toString()}`);
  },
};

export const userService = {
  async getUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.role && params.role !== 'all') query.append('role', params.role);
    if (params.search) query.append('search', params.search);
    if (params.is_active !== undefined) query.append('is_active', params.is_active);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return await apiRequest(`/api/v1/users${queryString}`);
  },

  async updateUserRole(userId, newRole) {
    return await apiRequest(`/api/v1/users/${userId}/role?new_role=${newRole}`, {
      method: 'PUT',
    });
  },

  async toggleUserStatus(userId, isActive) {
    return await apiRequest(`/api/v1/users/${userId}/status?is_active=${isActive}`, {
      method: 'PUT',
    });
  },
};

