import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button, { ButtonVariant } from '../../components/common/Button';
import emptyStateImage from '../../assets/images/empty-state.svg';
import { COMMON_ROUTES } from '../../constants/routes.constants';

/**
 * A page component that displays a user-friendly 404 page when a route is not found
 * or a resource doesn't exist. This page is used across both Pike (merchant) and 
 * Barracuda (admin) interfaces to provide a consistent experience for navigation errors.
 * 
 * @returns {JSX.Element} The rendered not found page component
 */
const NotFoundPage: React.FC = (): JSX.Element => {
  // Use the useNavigate hook to get navigation function for redirecting
  const navigate = useNavigate();
  
  // Update document title for SEO
  useEffect(() => {
    document.title = '404 - Page Not Found | Brik Refunds Service';
  }, []);

  /**
   * Navigates the user back to the home page
   */
  const handleGoHome = (): void => {
    navigate(COMMON_ROUTES.HOME);
  };

  /**
   * Navigates the user back to the previous page in their browser history
   */
  const handleGoBack = (): void => {
    window.history.back();
  };

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50"
      role="alert"
      aria-labelledby="notFoundTitle"
    >
      {/* Empty state illustration */}
      <div className="w-full max-w-md mb-8">
        <img 
          src={emptyStateImage} 
          alt="Page not found illustration" 
          className="w-full h-auto" 
        />
      </div>

      {/* 404 text */}
      <h1 
        id="notFoundTitle"
        className="text-6xl font-bold text-gray-800 mb-4"
      >
        404
      </h1>

      {/* Error message */}
      <p className="text-xl text-gray-600 mb-2 text-center">
        We couldn't find the page you're looking for.
      </p>
      
      <p className="text-md text-gray-500 mb-8 text-center">
        The page may have been moved, deleted, or could be temporarily unavailable.
      </p>

      {/* Navigation buttons */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
        <Button 
          variant={ButtonVariant.PRIMARY} 
          onClick={handleGoHome}
          aria-label="Go to home page"
        >
          Go Home
        </Button>
        <Button 
          variant={ButtonVariant.SECONDARY} 
          onClick={handleGoBack}
          aria-label="Go back to previous page"
        >
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;