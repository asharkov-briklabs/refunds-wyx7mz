import React from 'react'; // ^18.2.0
import { Routes, Route } from 'react-router-dom'; // react-router-dom ^6.10.0
import { pikeRoutes } from './pike.routes';
import { barracudaRoutes } from './barracuda.routes';
import { commonRoutes } from './common.routes';

/**
 * Combines all route configurations for the Refunds Service application.
 *
 * @remarks
 * This component serves as the central point for defining the application's navigation structure,
 * combining routes from Pike (merchant), Barracuda (admin), and common interfaces.
 *
 * @requirements_addressed
 * - Unified Routing Structure: Technical Specifications/7. USER INTERFACE DESIGN/7.1.1. Platform Interfaces
 * - Navigation Implementation: Technical Specifications/7. USER INTERFACE DESIGN/7.7. IMPLEMENTATION GUIDELINES
 * - Error Handling Navigation: Technical Specifications/6.5.3/Error Handling Strategy
 */
const AppRoutes: React.FC = () => {
  // LD1: Combine all route arrays into a single array
  const allRoutes = [...pikeRoutes, ...barracudaRoutes, ...commonRoutes];

  // LD1: Render the Routes component with all routes
  return (
    <Routes>
      {allRoutes.map((route, index) => (
        <Route key={index} path={route.props.path} element={route.props.element} />
      ))}
    </Routes>
  );
};

export default AppRoutes;