import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UiState = {
  isSidebarCollapsed: boolean;
};
export const initialState: UiState = {
  isSidebarCollapsed: true,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setState: (state: UiState, action: PayloadAction<UiState>) => {
      console.log(action.payload);
      return action.payload;
    },
  },
});
