import React, { useState, useEffect } from 'react'; // React v18.2.0
import { useLocation } from 'react-router-dom'; // react-router-dom v6.8.0
import Header from '../Header';
import Footer from '../Footer';
import Sidebar from '../Sidebar';
import ErrorBoundary from '../../common/ErrorBoundary';
import { useAuth } from '../../../hooks/useAuth';
import useResponsive from '../../../hooks/useResponsive';
import { BASE_ROUTES } from '../../../constants/routes.constants';

/**
 * @file MainLayout.tsx
 * @description Main layout component that provides the application's primary structure, including header, sidebar, content area, and footer. It handles responsive layout adjustments and interface-specific styling for both Pike (merchant) and Barracuda (admin) interfaces.
 * @requirements_addressed
 * - Platform Interfaces: Technical Specifications/7. USER INTERFACE DESIGN/7.1.1. Platform Interfaces
 * - Responsive Design: Technical Specifications/7. USER INTERFACE DESIGN/7.5. RESPONSIVE DESIGN CONSIDERATIONS
 * - Accessibility Requirements: Technical Specifications/7. USER INTERFACE DESIGN/7.6. ACCESSIBILITY REQUIREMENTS
 * - Implementation Guidelines: Technical Specifications/7. USER INTERFACE DESIGN/7.7. IMPLEMENTATION GUIDELINES
 */

/**
 * @interface MainLayoutProps
 * @description Props for the MainLayout component
 * @property {React.ReactNode} children - The content to be rendered within the layout
 */
interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * @function MainLayout
 * @description Main layout component that wraps the application content with header, sidebar, and footer
 * @param {MainLayoutProps} props - The props for the MainLayout component
 * @returns {JSX.Element} The rendered layout component
 */
const MainLayout: React.FC<MainLayoutProps> = (props) => {
  // LD1: Extract children from props
  const { children } = props;

  // LD1: Get authentication status from useAuth hook
  const { isAuthenticated } = useAuth();

  // LD1: Get responsive breakpoints from useResponsive hook
  const { isMobile, isTablet } = useResponsive();

  // LD1: Get current location from useLocation hook
  const location = useLocation();

  // LD1: Determine interface type (pike or barracuda) based on path
  const isPikeInterface = location.pathname.startsWith(BASE_ROUTES.PIKE);
  const interfaceType = isPikeInterface ? 'pike' : 'barracuda';

  // LD1: Initialize sidebar collapsed state with useState
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);

  // LD1: Manage sidebar state based on screen size with useEffect
  useEffect(() => {
    if (isMobile || isTablet) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [isMobile, isTablet]);

  /**
   * @function toggleSidebar
   * @description Toggles the sidebar between collapsed and expanded states
   * @returns {void} No return value
   */
  const toggleSidebar = (): void => {
    // Toggle the isSidebarCollapsed state value
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // LD1: Render full layout when user is authenticated with Header, Sidebar, main content and Footer
  // LD1: Render only the content without Header/Sidebar/Footer when not authenticated
  return (
    <div className="app-container">
      {isAuthenticated ? (
        <div className="flex h-screen bg-gray-50">
          <Sidebar
            interfaceType={interfaceType}
            isCollapsed={isSidebarCollapsed}
            toggleCollapsed={toggleSidebar}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            {/* LD1: Wrap content area with ErrorBoundary for error handling */}
            <ErrorBoundary>
              {/* LD1: Apply appropriate CSS classes for layout based on sidebar state and interface type */}
              {/* LD1: Add main content area with proper padding and flex structure */}
              {/* LD1: Implement responsive styling for different device sizes */}
              <main className={`flex-1 overflow-x-hidden overflow-y-auto p-4`}>
                {children}
              </main>
            </ErrorBoundary>
            <Footer variant={interfaceType} />
          </div>
        </div>
      ) : (
        // Render only the content if not authenticated
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4">
          {children}
        </main>
      )}
    </div>
  );
};

export default MainLayout;