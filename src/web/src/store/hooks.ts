import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'; // react-redux ^8.0.5
import { RootState, AppDispatch } from './store';

/**
 * Custom hook that returns the Redux dispatch function with proper TypeScript typing.
 * This provides type safety when dispatching actions throughout the application.
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Custom hook that provides a typed selector function for the Redux store.
 * This ensures type safety when accessing state from components.
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;