import React from 'react'; // React v18.2.0
import ParametersPage from './ParametersPage';
// Index file that exports the ParametersPage component for the Barracuda admin interface.
// This file provides a centralized entry point for importing the ParametersPage component, making it available for routing and navigation within the application.
// LD1: Export the ParametersPage component for use in routing and navigation
const ParametersPageExport: React.FC = () => {
    return React.createElement(ParametersPage);
};
export default ParametersPageExport;