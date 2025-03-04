import React from 'react'; // react ^18.2.0
import ReactDOM from 'react-dom/client'; // react-dom ^18.2.0
import { Provider } from 'react-redux'; // react-redux ^8.0.5
import App from './App';
import { store } from './store';
import './styles/tailwind.css';
import './styles/globals.css';

// LD1: Define the type for the React root
type Root = ReturnType<typeof ReactDOM.createRoot>;

// LD1: Define the type for the Web Vitals metrics object
interface MetricObject {
  id: string;
  name: string;
  value: number;
  delta: number;
  entries: PerformanceEntry[];
  rating: string;
}

// LD1: Get the root element from the DOM
const container = document.getElementById('root');

// LD1: Create a React root for concurrent rendering
const root: Root = ReactDOM.createRoot(container!);

// LD1: Render the application within React.StrictMode for development checks
// LD1: Provide the Redux store to the App component using the Provider
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

/**
 * Function to report web vitals metrics for performance monitoring
 * @param {MetricObject} metric - metric
 * @returns {void} No return value
 */
const reportWebVitals = (metric: MetricObject): void => {
  // LD1: Check if the environment is production
  if (process.env.NODE_ENV === 'production') {
    // LD1: If in production, send the metric to analytics service
    console.log(metric); // Replace with actual analytics service integration
  } else {
    // LD1: Console log metrics in development for debugging
    console.log(metric);
  }
};