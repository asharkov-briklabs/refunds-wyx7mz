import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { jest } from '@jest/globals'; // @jest/globals ^29.5.0
import ErrorPage, { ErrorCategory } from './ErrorPage'; // Path: src/web/src/pages/common/ErrorPage/ErrorPage.tsx
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils'; // Path: src/web/src/utils/test.utils.tsx
import { GENERIC_ERROR_MESSAGES } from '../../../constants/error-messages.constants'; // Path: src/web/src/constants/error-messages.constants.ts

describe('ErrorPage component', () => {
  // LD1: Set up test suite for ErrorPage component
  let navigateMock: jest.SpyInstance;

  beforeEach(() => {
    // LD2: Configure test mocks including useNavigate mock
    navigateMock = jest.spyOn(require('react-router-dom'), 'useNavigate');
    navigateMock.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    // LD1: Clean up after tests
    jest.restoreAllMocks();
  });

  it('it renders with default props', async () => {
    // LD1: Render ErrorPage with no props
    renderWithProviders(<ErrorPage />);

    // LD2: Verify default error title and message are displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(GENERIC_ERROR_MESSAGES.UNEXPECTED)).toBeInTheDocument();

    // LD3: Verify default icon is displayed
    expect(screen.getByTitle('Error')).toBeInTheDocument();

    // LD4: Verify Go Back button is present
    expect(screen.getByRole('button', { name: 'Go back to previous page' })).toBeInTheDocument();
  });

  it('it renders with custom error title and message', async () => {
    // LD1: Render ErrorPage with custom errorTitle and errorMessage props
    renderWithProviders(<ErrorPage errorTitle="Custom Title" errorMessage="Custom Message" />);

    // LD2: Verify custom error title is displayed
    expect(screen.getByText('Custom Title')).toBeInTheDocument();

    // LD3: Verify custom error message is displayed
    expect(screen.getByText('Custom Message')).toBeInTheDocument();
  });

  it('it renders with WARNING category', async () => {
    // LD1: Render ErrorPage with errorCategory set to WARNING
    renderWithProviders(<ErrorPage errorCategory={ErrorCategory.WARNING} />);

    // LD2: Verify warning icon is displayed
    expect(screen.getByTitle('Warning')).toBeInTheDocument();

    // LD3: Verify appropriate styling is applied
    const warningIcon = screen.getByTitle('Warning');
    expect(warningIcon).toHaveClass('text-amber-500');
  });

  it('it renders with INFO category', async () => {
    // LD1: Render ErrorPage with errorCategory set to INFO
    renderWithProviders(<ErrorPage errorCategory={ErrorCategory.INFO} />);

    // LD2: Verify info icon is displayed
    expect(screen.getByTitle('Information')).toBeInTheDocument();

    // LD3: Verify appropriate styling is applied
    const infoIcon = screen.getByTitle('Information');
    expect(infoIcon).toHaveClass('text-blue-500');
  });

  it('it renders with error details', async () => {
    // LD1: Render ErrorPage with errorDetails prop containing additional error information
    renderWithProviders(<ErrorPage errorDetails="Detailed error information" />);

    // LD2: Verify error details are displayed
    expect(screen.getByText('Detailed error information')).toBeInTheDocument();
  });

  it('it renders with custom action button', async () => {
    // LD1: Create mock onClick handler for custom button
    const onClickMock = jest.fn();

    // LD2: Render ErrorPage with actionButton prop containing label and onClick handler
    renderWithProviders(<ErrorPage actionButton={{ label: 'Custom Action', onClick: onClickMock }} />);

    // LD3: Verify custom button is displayed with correct label
    const customButton = screen.getByRole('button', { name: 'Custom Action' });
    expect(customButton).toBeInTheDocument();

    // LD4: Click the custom button
    const user = setupUserEvent();
    await user.click(customButton);

    // LD5: Verify onClick handler was called
    expect(onClickMock).toHaveBeenCalled();
  });

  it('it navigates back when clicking Go Back button', async () => {
    // LD1: Setup mock for useNavigate
    const navigate = jest.fn();
    navigateMock.mockReturnValue(navigate);

    // LD2: Render ErrorPage with default props
    renderWithProviders(<ErrorPage />);

    // LD3: Find and click the Go Back button
    const goBackButton = screen.getByRole('button', { name: 'Go back to previous page' });
    const user = setupUserEvent();
    await user.click(goBackButton);

    // LD4: Verify navigate(-1) was called
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});