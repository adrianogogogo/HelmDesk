import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { list: [], unread: 0 },
  reducers: {
    setNotifications: (state, action) => {
      state.list = action.payload;
      state.unread = action.payload.filter(n => !n.is_read).length;
    },
    markAllRead: (state) => { state.list.forEach(n => n.is_read = true); state.unread = 0; },
  },
});

export const { setNotifications, markAllRead } = notificationSlice.actions;
export default notificationSlice.reducer;
