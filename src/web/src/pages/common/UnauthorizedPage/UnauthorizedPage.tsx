import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button, { ButtonVariant } from '../../../components/common/Button';
import errorImage from '../../../assets/images/error-state.svg';
import { useAuth } from '../../../hooks/useAuth';
import { COMMON_ROUTES, PIKE_ROUTES, BARRACUDA_ROUTES } from '../../../constants/routes.constants';

/**
 * A page component that displays when a user lacks permission to access a resource,
 * with appropriate messages and navigation options
 */
const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isMerchantAdmin } = useAuth();

  // Navigate to appropriate dashboard based on user role
  const handleGoHome = () => {
    if (isAdmin()) {
      navigate(BARRACUDA_ROUTES.DASHBOARD);
    } else if (isMerchantAdmin()) {
      navigate(PIKE_ROUTES.DASHBOARD);
    } else {
      navigate(COMMON_ROUTES.HOME);
    }
  };

  // Go back to previous page
  const handleGoBack = () => {
    window.history.back();
  };

  // Go to login page for unauthenticated users
  const handleGoLogin = () => {
    navigate(COMMON_ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50">
      <div className="w-full max-w-md text-center bg-white p-8 rounded-lg shadow-sm">
        <img 
          src={errorImage} 
          alt="Access Denied Illustration" 
          className="w-48 h-auto mx-auto mb-6" 
          aria-hidden="true"
        />
        
        <h1 className="text-6xl font-bold text-gray-800 mb-4" aria-label="Error code 403">403</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Access Denied</h2>
        
        <p className="text-gray-600 mb-6">
          You don't have permission to access this resource.
        </p>
        
        {isAuthenticated ? (
          <p className="text-gray-500 mb-8">
            Please contact your administrator if you believe this is an error.
          </p>
        ) : (
          <p className="text-gray-500 mb-8">
            Please sign in or use a different account with appropriate permissions.
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <>
              <Button 
                variant={ButtonVariant.PRIMARY} 
                onClick={handleGoHome}
                ariaLabel="Go to dashboard"
              >
                Return to Dashboard
              </Button>
              <Button 
                variant={ButtonVariant.SECONDARY} 
                onClick={handleGoBack}
                ariaLabel="Go back to previous page"
              >
                Go Back
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant={ButtonVariant.PRIMARY} 
                onClick={handleGoLogin}
                ariaLabel="Go to login page"
              >
                Sign In
              </Button>
              <Button 
                variant={ButtonVariant.SECONDARY} 
                onClick={handleGoBack}
                ariaLabel="Go back to previous page"
              >
                Go Back
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;