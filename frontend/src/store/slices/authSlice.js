import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('relmdesk_token');
const user = JSON.parse(localStorage.getItem('relmdesk_user') || 'null');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: token || null,
    user: user || null,
    isAuthenticated: !!token,
    loading: false,
    error: null,
  },
  reducers: {
    loginStart: (state) => { state.loading = true; state.error = null; },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem('relmdesk_token', action.payload.token);
      localStorage.setItem('relmdesk_user', JSON.stringify(action.payload.user));
    },
    loginFailure: (state, action) => { state.loading = false; state.error = action.payload; },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('relmdesk_token');
      localStorage.removeItem('relmdesk_user');
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('relmdesk_user', JSON.stringify(state.user));
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
