import React, { useState, useEffect } from 'react'; // react ^18.2.0
import { useNavigate } from 'react-router-dom'; // react-router-dom ^6.11.0
import { Formik, Form, Field, ErrorMessage } from 'formik'; // formik ^2.2.9
import * as Yup from 'yup'; // yup ^1.1.1
import { useAuth } from '../../../hooks/useAuth';
import TextField from '../../../components/common/TextField';
import Button from '../../../components/common/Button';
import Alert from '../../../components/common/Alert';
import { ROUTES } from '../../../constants/routes.constants';
import { GENERIC_ERROR_MESSAGES } from '../../../constants/error-messages.constants';
import { validateEmail, validateRequired } from '../../../utils/validation.utils';

/**
 * Creates and returns the Yup validation schema for the login form
 * @returns {object} Yup validation schema
 */
const createLoginSchema = () => {
  // Create a Yup object schema with email and password validation
  return Yup.object().shape({
    // Email field: required and valid email format
    email: Yup.string()
      .required(GENERIC_ERROR_MESSAGES.AUTHENTICATION_ERROR)
      .email(GENERIC_ERROR_MESSAGES.AUTHENTICATION_ERROR),

    // Password field: required with minimum length requirement
    password: Yup.string()
      .required(GENERIC_ERROR_MESSAGES.AUTHENTICATION_ERROR)
      .min(8, GENERIC_ERROR_MESSAGES.AUTHENTICATION_ERROR),
  });
};

/**
 * Main functional component for the login page
 * @returns {JSX.Element} Rendered login page component
 */
const LoginPage: React.FC = () => {
  // Initialize navigation with useNavigate hook
  const navigate = useNavigate();

  // Get authentication state and methods from useAuth hook
  const { login, isLoading, error, isAuthenticated, user } = useAuth();

  // Set up redirect effect when user becomes authenticated
  useEffect(() => {
    // Determine appropriate dashboard route based on user role
    if (isAuthenticated && user) {
      let dashboardRoute = ROUTES.PIKE.DASHBOARD;
      if (user.roles.includes('BARRACUDA_ADMIN')) {
        dashboardRoute = ROUTES.BARRACUDA.DASHBOARD;
      }

      // Navigate to the dashboard
      navigate(dashboardRoute);
    }
  }, [isAuthenticated, user, navigate]);

  // Create login validation schema using Yup
  const loginSchema = createLoginSchema();

  // Define initial form values
  const initialValues = { email: '', password: '' };

  // Handle form submission with Formik
  const handleSubmit = async (values: { email: string; password: string }, actions: any) => {
    try {
      // Call the login function from useAuth with email and password
      await login({ email: values.email, password: values.password, redirectUri: window.location.origin + '/callback' });
    } catch (loginError: any) {
      // Handle errors by displaying them through Formik's setSubmitting and setErrors
      actions.setSubmitting(false);
      actions.setErrors({ submit: loginError?.message || GENERIC_ERROR_MESSAGES.AUTHENTICATION_ERROR });
    }
    // Successful login is handled by the useEffect hook that watches isAuthenticated
  };

  // Render login form with email and password fields
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Login</h2>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <Formik
          initialValues={initialValues}
          validationSchema={loginSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors }) => (
            <Form>
              <div className="mb-4">
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                />
                <ErrorMessage name="email" component="p" className="text-red-500 text-sm mt-1" />
              </div>
              <div className="mb-6">
                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                />
                <ErrorMessage name="password" component="p" className="text-red-500 text-sm mt-1" />
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isSubmitting}
                isLoading={isLoading}
              >
                {isSubmitting ? 'Logging in...' : 'Login'}
              </Button>
              {errors.submit && <p className="text-red-500 text-sm mt-4 text-center">{errors.submit}</p>}
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default LoginPage;