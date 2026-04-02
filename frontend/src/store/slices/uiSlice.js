import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: true, darkMode: false, searchOpen: false },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    toggleDarkMode: (state) => { state.darkMode = !state.darkMode; },
    setSearchOpen: (state, action) => { state.searchOpen = action.payload; },
  },
});

export const { toggleSidebar, setSidebarOpen, toggleDarkMode, setSearchOpen } = uiSlice.actions;
export default uiSlice.reducer;
