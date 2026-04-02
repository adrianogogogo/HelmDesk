import { createSlice } from '@reduxjs/toolkit';

const ticketSlice = createSlice({
  name: 'tickets',
  initialState: { list: [], current: null, total: 0, loading: false, error: null, filters: {} },
  reducers: {
    setTickets: (state, action) => { state.list = action.payload.tickets; state.total = action.payload.total; },
    setCurrentTicket: (state, action) => { state.current = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    setFilters: (state, action) => { state.filters = action.payload; },
    updateTicketInList: (state, action) => {
      const idx = state.list.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
    },
  },
});

export const { setTickets, setCurrentTicket, setLoading, setError, setFilters, updateTicketInList } = ticketSlice.actions;
export default ticketSlice.reducer;
