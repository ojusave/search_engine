/**
 * Authentication service
 * Handles signup, login, logout
 */
import api from './api';

export const authService = {
  /**
   * Sign up new user
   */
  signup: async (email, password) => {
    const response = await api.post('/auth/signup', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  /**
   * Login existing user
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  /**
   * Logout current user
   */
  logout: () => {
    localStorage.removeItem('token');
  },
};
