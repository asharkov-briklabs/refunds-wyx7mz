import React from 'react'; // react ^18.2.0
import { BrowserRouter } from 'react-router-dom'; // react-router-dom ^6.10.0
import { Provider } from 'react-redux'; // react-redux ^8.0.5
import routes from './routes';
import { AuthProvider } from './services/auth/auth.context';
import { NotificationProvider } from './services/notification/notification.context';
import ErrorBoundary from './components/common/ErrorBoundary';
import ToastContainer from './components/common/ToastContainer';
import store from './store/store';

/**
 * Root component that sets up the application structure with providers and routing
 * @returns {JSX.Element} The rendered application component tree
 */
const App: React.FC = () => {
  // LD1: Set up Redux Provider with the store for global state management
  return (
    <Provider store={store}>
      {/* LD1: Set up BrowserRouter for client-side routing */}
      <BrowserRouter>
        {/* LD1: Set up ErrorBoundary to catch and handle uncaught errors */}
        <ErrorBoundary>
          {/* LD1: Set up AuthProvider for authentication state management */}
          <AuthProvider>
            {/* LD1: Set up NotificationProvider for notification state management */}
            <NotificationProvider>
              {/* LD1: Render the routes from the imported routes configuration */}
              {routes}

              {/* LD1: Render ToastContainer for displaying toast notifications */}
              <ToastContainer />
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </Provider>
  );
};

export default App;