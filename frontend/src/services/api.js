import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://attendance-3-se0c.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get a 401 on an admin route, purge token
      if (!window.location.pathname.includes('/kiosk') && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login-json', { username, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  registerFace: async (id, images) => {
    const response = await api.post(`/users/${id}/face/register`, { images });
    return response.data;
  },
  deleteFace: async (id) => {
    const response = await api.delete(`/users/${id}/face`);
    return response.data;
  },
};

export const attendanceService = {
  getAttendance: async (params = {}) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },
  getToday: async () => {
    const response = await api.get('/attendance/today');
    return response.data;
  },
  getUserHistory: async (userId) => {
    const response = await api.get(`/attendance/user/${userId}`);
    return response.data;
  },
  manualMark: async (data) => {
    const response = await api.post('/attendance/manual', data);
    return response.data;
  },
  deleteRecord: async (id) => {
    const response = await api.delete(`/attendance/${id}`);
    return response.data;
  },
};

export const recognitionService = {
  verify: async (image, livenessDone = true) => {
    const response = await api.post('/recognition/verify', {
      image,
      liveness_action_done: livenessDone,
    });
    return response.data;
  },
  getLivenessChallenge: async () => {
    const response = await api.get('/recognition/liveness-challenge');
    return response.data;
  },
  verifyLiveness: async (challengeId, image) => {
    const response = await api.post('/recognition/liveness-verify', {
      challenge_id: challengeId,
      image,
    });
    return response.data;
  },
};

export const dashboardService = {
  getStatistics: async () => {
    const response = await api.get('/dashboard/statistics');
    return response.data;
  },
};

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  getPublicSettings: async () => {
    const response = await api.get('/settings/public');
    return response.data;
  },
  updateSettings: async (settingsData) => {
    const response = await api.put('/settings', settingsData);
    return response.data;
  },
};

export default api;
