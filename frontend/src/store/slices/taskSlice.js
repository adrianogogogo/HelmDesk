import { createSlice } from '@reduxjs/toolkit';

const taskSlice = createSlice({
  name: 'tasks',
  initialState: { kanban: { pendente: [], em_andamento: [], concluida: [] }, loading: false },
  reducers: {
    setKanban: (state, action) => { state.kanban = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    moveTask: (state, action) => {
      const { taskId, fromCol, toCol, newOrder } = action.payload;
      const task = state.kanban[fromCol]?.find(t => t.id === taskId);
      if (task) {
        state.kanban[fromCol] = state.kanban[fromCol].filter(t => t.id !== taskId);
        task.status = toCol;
        state.kanban[toCol] = newOrder || [...state.kanban[toCol], task];
      }
    },
  },
});

export const { setKanban, setLoading, moveTask } = taskSlice.actions;
export default taskSlice.reducer;
