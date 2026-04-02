import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
  name: 'chat',
  initialState: { rooms: [], activeRoom: null, messages: [], users: [], isOpen: false },
  reducers: {
    setRooms: (state, action) => { state.rooms = action.payload; },
    setActiveRoom: (state, action) => { state.activeRoom = action.payload; },
    setMessages: (state, action) => { state.messages = action.payload; },
    addMessage: (state, action) => { state.messages = [...state.messages, action.payload]; },
    setUsers: (state, action) => { state.users = action.payload; },
    setChatOpen: (state, action) => { state.isOpen = action.payload; },
    updateUserOnline: (state, action) => {
      const u = state.users.find(u => u.id === action.payload.userId);
      if (u) u.is_online = action.payload.online;
    },
  },
});

export const { setRooms, setActiveRoom, setMessages, addMessage, setUsers, setChatOpen, updateUserOnline } = chatSlice.actions;
export default chatSlice.reducer;
