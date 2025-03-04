import React, { ReactNode } from 'react'; // react ^18.2.0
import { render, RenderOptions, RenderResult } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { Provider } from 'react-redux'; // react-redux ^8.0.5
import { configureStore, EnhancedStore } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import { BrowserRouter, MemoryRouter, BrowserRouterProps } from 'react-router-dom'; // react-router-dom ^6.10.0
import { RootState } from '../store';
import userEvent, { UserEvent } from '@testing-library/user-event'; // @testing-library/user-event ^14.4.3
import store from '../store/store';

/**
 * Renders a React component with Redux and Router providers for testing
 * @param ui - The React component to render
 * @param options - Options for rendering, including preloaded state, route, and store
 * @returns Enhanced render result with store reference
 */
const renderWithProviders = (
  ui: ReactNode,
  options: RenderOptions & { preloadedState?: Partial<RootState>; route?: string; store?: EnhancedStore } = {}
): RenderResult & { store: EnhancedStore } => {
  // LD1: Create a test store with optional preloaded state
  const testStore = options.store || setupTestStore(options.preloadedState);

  // LD2: Set up the Router provider with optional route
  const router = options.route
    ? <MemoryRouter initialEntries={[options.route]}>{ui}</MemoryRouter>
    : <BrowserRouter>{ui}</BrowserRouter>;

  // LD3: Render the component with Redux Provider and Router
  const renderResult = render(
    <Provider store={testStore}>
      {router}
    </Provider>,
    options
  );

  // LD4: Return the render result with the store attached
  return {
    ...renderResult,
    store: testStore,
  };
};

/**
 * Creates a Redux store for testing with optional preloaded state
 * @param preloadedState - Optional preloaded state for the store
 * @returns Configured Redux store for testing
 */
const setupTestStore = (preloadedState?: Partial<RootState>): EnhancedStore => {
  // LD1: Configure a new store using the same reducers as the app
  // LD2: Apply optional preloaded state
  return configureStore({
    reducer: store.reducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
    preloadedState,
  });
};

/**
 * Creates a mock router context for testing
 * @param routerConfig - Configuration object for the router
 * @returns Router provider with mock configuration
 */
const createMockRouter = (routerConfig: BrowserRouterProps): JSX.Element => {
  // LD1: Create a MemoryRouter with provided configuration
  // LD2: Return the configured router
  return <MemoryRouter {...routerConfig} />;
};

/**
 * Creates a mock user for authentication testing
 * @param overrides - Object containing properties to override in the default user
 * @returns Mock user object with default values and overrides
 */
const createMockUser = (overrides: Partial<any> = {}): any => {
  // LD1: Create a default user object with standard permissions
  const defaultUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    roles: ['MERCHANT_ADMIN'],
    permissions: ['CREATE_REFUND', 'VIEW_REFUND'],
    merchantId: 'test-merchant-id',
    organizationId: null,
    bankId: null,
    programId: null,
    mfaEnabled: false,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // LD2: Apply any overrides to customize the user
  const mockUser = { ...defaultUser, ...overrides };

  // LD3: Return the mock user object
  return mockUser;
};

/**
 * Helper function to wait for a component to finish rendering and updating
 * @param wrapper - RenderResult
 * @returns Promise that resolves when component is painted
 */
const waitForComponentToPaint = async (wrapper: RenderResult): Promise<void> => {
  // LD1: Set up a small delay to allow component to update
  // LD2: Return a promise that resolves after the delay
  await new Promise((resolve) => setTimeout(resolve, 0));
};

/**
 * Sets up userEvent for simulating user interactions
 * @returns Configured userEvent instance
 */
const setupUserEvent = (): UserEvent => {
  // LD1: Create and return a userEvent instance with appropriate configuration
  return userEvent.setup();
};

export { renderWithProviders, setupTestStore, createMockRouter, createMockUser, waitForComponentToPaint, setupUserEvent };