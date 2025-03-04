import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import { ApiStatus } from '../../types/common.types';

/**
 * Interface defining the shape of the UI state managed by this slice
 */
interface UIState {
  isLoading: boolean;
  sidebarOpen: boolean;
  modals: Record<string, boolean>;
  activeView: string;
  theme: string;
}

/**
 * Initial state for the UI slice
 */
const initialState: UIState = {
  isLoading: false,
  sidebarOpen: true, // Default to open
  modals: {},
  activeView: 'dashboard', // Default view
  theme: 'light', // Default theme
};

/**
 * Redux slice for managing UI-related state in the Refunds Service application.
 * Handles common UI elements like loading indicators, modal visibility, sidebar state,
 * theme settings, and active view tracking.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Sets the global loading state
     * Can be used with ApiStatus.LOADING or ApiStatus.IDLE for consistent state management
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    /**
     * Shows a modal by ID
     */
    showModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = true;
    },
    
    /**
     * Hides a modal by ID
     */
    hideModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = false;
    },
    
    /**
     * Toggles the sidebar open/closed state
     */
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    /**
     * Sets the active view or screen
     */
    setActiveView: (state, action: PayloadAction<string>) => {
      state.activeView = action.payload;
    },
    
    /**
     * Sets the theme (light/dark)
     */
    setTheme: (state, action: PayloadAction<string>) => {
      state.theme = action.payload;
    },
  },
});

// Extract the action creators
export const uiActions = uiSlice.actions;

// Extract the reducer
export const uiReducer = uiSlice.reducer;

/**
 * Selector function to get the global loading state from the Redux store
 */
export const selectLoading = (state: { ui: UIState }): boolean => state.ui.isLoading;

/**
 * Selector function to check if a specific modal is currently visible
 */
export const selectModalVisible = (state: { ui: UIState }, modalId: string): boolean => 
  Boolean(state.ui.modals[modalId]);

/**
 * Selector function to get the sidebar open state
 */
export const selectSidebarOpen = (state: { ui: UIState }): boolean => state.ui.sidebarOpen;

/**
 * Selector function to get the currently active view or screen
 */
export const selectActiveView = (state: { ui: UIState }): string => state.ui.activeView;

/**
 * Selector function to get the current theme setting
 */
export const selectTheme = (state: { ui: UIState }): string => state.ui.theme;

// Default export for the slice
export default uiSlice;