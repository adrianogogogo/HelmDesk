import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    rooms: [],
    activeRoom: null,
    messages: [],
    users: [],
    isOpen: false,       // drawer aberto
    isChatPage: false,   // está na página /chat
    unreadTotal: 0,
  },
  reducers: {
    setRooms: (state, action) => {
      state.rooms = action.payload;
      state.unreadTotal = action.payload.reduce(
        (acc, r) => acc + (parseInt(r.unread_count) || 0), 0
      );
    },
    setActiveRoom: (state, action) => {
      state.activeRoom = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      const msg = action.payload;

      // Adicionar mensagem à lista se for da sala ativa visível
      const chatVisible = state.isOpen || state.isChatPage;
      if (chatVisible && state.activeRoom && msg.room_id === state.activeRoom.id) {
        const exists = state.messages.find(m => m.id === msg.id);
        if (!exists) state.messages = [...state.messages, msg];
      }

      // Atualizar sala na lista de salas
      const room = state.rooms.find(r => r.id === msg.room_id);
      if (room) {
        room.last_message = msg.message;
        room.last_message_at = msg.created_at;

        // Incrementar não lido só se a sala não está sendo visualizada
        const isActiveAndVisible =
          chatVisible &&
          state.activeRoom &&
          state.activeRoom.id === msg.room_id;

        if (!isActiveAndVisible) {
          room.unread_count = (parseInt(room.unread_count) || 0) + 1;
        }

        // Recalcular total
        state.unreadTotal = state.rooms.reduce(
          (acc, r) => acc + (parseInt(r.unread_count) || 0), 0
        );

        // Mover sala para o topo
        const idx = state.rooms.findIndex(r => r.id === msg.room_id);
        if (idx > 0) {
          const updated = [...state.rooms];
          const [moved] = updated.splice(idx, 1);
          updated.unshift(moved);
          state.rooms = updated;
        }
      } else {
        // Sala não está carregada ainda: incrementar unreadTotal diretamente
        state.unreadTotal += 1;
      }
    },
    markRoomRead: (state, action) => {
      const roomId = action.payload;
      const room = state.rooms.find(r => r.id === roomId);
      if (room) {
        const prev = parseInt(room.unread_count) || 0;
        room.unread_count = 0;
        state.unreadTotal = Math.max(0, state.unreadTotal - prev);
      }
    },
    setUsers: (state, action) => {
      state.users = action.payload;
    },
    setChatOpen: (state, action) => {
      state.isOpen = action.payload;
      // Quando fecha, garantir activeRoom limpo se fechar drawer
      if (!action.payload) state.isChatPage = false;
    },
    setIsChatPage: (state, action) => {
      state.isChatPage = action.payload;
    },
    updateUserOnline: (state, action) => {
      const u = state.users.find(u => u.id === action.payload.userId);
      if (u) u.is_online = action.payload.online;
      state.rooms.forEach(room => {
        if (room.other_members) {
          const member = room.other_members.find(m => m.id === action.payload.userId);
          if (member) member.is_online = action.payload.online;
        }
      });
    },
  },
});

export const {
  setRooms, setActiveRoom, setMessages, addMessage, setUsers,
  setChatOpen, setIsChatPage, updateUserOnline, markRoomRead
} = chatSlice.actions;
export default chatSlice.reducer;
