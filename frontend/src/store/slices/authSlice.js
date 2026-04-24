import { createSlice } from '@reduxjs/toolkit';

// Lê o token do armazenamento correto
const getStoredToken = () =>
  localStorage.getItem('relmdesk_token') ||
  sessionStorage.getItem('relmdesk_token');

const getStoredUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem('relmdesk_user') ||
      sessionStorage.getItem('relmdesk_user') ||
      'null'
    );
  } catch {
    return null;
  }
};

const token = getStoredToken();
const user = getStoredUser();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: token || null,
    user: user || null,
    isAuthenticated: !!token,
    rememberMe: !!localStorage.getItem('relmdesk_token'),
    loading: false,
    error: null,
    sessionExpiredAt: null,
  },
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      const { token, user, rememberMe } = action.payload;
      state.loading = false;
      state.token = token;
      state.user = user;
      state.isAuthenticated = true;
      state.rememberMe = !!rememberMe;
      state.sessionExpiredAt = null;

      // Persistir conforme escolha do usuário
      if (rememberMe) {
        localStorage.setItem('relmdesk_token', token);
        localStorage.setItem('relmdesk_user', JSON.stringify(user));
        sessionStorage.removeItem('relmdesk_token');
        sessionStorage.removeItem('relmdesk_user');
      } else {
        sessionStorage.setItem('relmdesk_token', token);
        sessionStorage.setItem('relmdesk_user', JSON.stringify(user));
        localStorage.removeItem('relmdesk_token');
        localStorage.removeItem('relmdesk_user');
      }
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.sessionExpiredAt = null;
      localStorage.removeItem('relmdesk_token');
      localStorage.removeItem('relmdesk_user');
      sessionStorage.removeItem('relmdesk_token');
      sessionStorage.removeItem('relmdesk_user');
    },
    sessionExpired: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.sessionExpiredAt = Date.now();
      localStorage.removeItem('relmdesk_token');
      localStorage.removeItem('relmdesk_user');
      sessionStorage.removeItem('relmdesk_token');
      sessionStorage.removeItem('relmdesk_user');
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      if (state.rememberMe) {
        localStorage.setItem('relmdesk_user', JSON.stringify(state.user));
      } else {
        sessionStorage.setItem('relmdesk_user', JSON.stringify(state.user));
      }
    },
  },
});

export const {
  loginStart, loginSuccess, loginFailure, logout, sessionExpired, updateUser
} = authSlice.actions;
export default authSlice.reducer;
