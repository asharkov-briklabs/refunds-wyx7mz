import React from 'react'; // react ^18.2.0
import { screen, waitFor } from '@testing-library/react'; // @testing-library/react ^14.0.0
import { describe, it, expect, vi } from 'vitest'; // vitest ^0.32.0
import Footer from './Footer';
import { renderWithProviders, setupUserEvent } from '../../../utils/test.utils';
import { COMMON_ROUTES, BASE_ROUTES } from '../../../constants/routes.constants';

describe('Footer Component', () => {
  it('renders with merchant variant correctly', async () => {
    renderWithProviders(<Footer />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByAltText('Brik')).toBeInTheDocument();
    expect(screen.getByText(`© ${new Date().getFullYear()} Brik Financial, Inc.`)).toBeInTheDocument();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Refunds')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();

    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', `${BASE_ROUTES.PIKE}${COMMON_ROUTES.HOME}`);
    expect(screen.getByText('Refunds').closest('a')).toHaveAttribute('href', `${BASE_ROUTES.PIKE}/refunds`);
    expect(screen.getByText('Transactions').closest('a')).toHaveAttribute('href', `${BASE_ROUTES.PIKE}/transactions`);
    expect(screen.getByText('Bank Accounts').closest('a')).toHaveAttribute('href', `${BASE_ROUTES.PIKE}/bank-accounts`);
  });

  it('renders with admin variant correctly', async () => {
    renderWithProviders(<Footer variant="admin" />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByAltText('Brik')).toBeInTheDocument();
    expect(screen.getByText(`© ${new Date().getFullYear()} Brik Financial, Inc.`)).toBeInTheDocument();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Merchants')).toBeInTheDocument();
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();

    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', `${BASE_ROUTES.BARRACUDA}${COMMON_ROUTES.HOME}`);
    expect(screen.getByText('Merchants').closest('a')).toHaveAttribute('href', `${BASE_ROUTES.BARRACUDA}/merchants`);
    expect(screen.getByText('Parameters').closest('a')).toHaveAttribute('href', `${BASE_ROUTES.BARRACUDA}/parameters`);
    expect(screen.getByText('Compliance').closest('a')).toHaveAttribute('href', `${BASE_ROUTES.BARRACUDA}/compliance`);
  });

  it('displays the current year in the copyright text', async () => {
    const currentYear = new Date().getFullYear();
    renderWithProviders(<Footer />);
    const copyrightText = screen.getByText(`© ${currentYear} Brik Financial, Inc.`);
    expect(copyrightText).toBeInTheDocument();
  });

  it('has working navigation links', async () => {
    renderWithProviders(<Footer />);
    const user = setupUserEvent();

    const termsLink = screen.getByText('Terms of Service').closest('a');
    const privacyLink = screen.getByText('Privacy Policy').closest('a');
    const supportLink = screen.getByText('Help Center').closest('a');

    expect(termsLink).toBeInTheDocument();
    expect(privacyLink).toBeInTheDocument();
    expect(supportLink).toBeInTheDocument();

    expect(termsLink).toHaveAttribute('href', '/legal/terms');
    expect(privacyLink).toHaveAttribute('href', '/legal/privacy');
    expect(supportLink).toHaveAttribute('href', 'https://help.brik.com');
  });

  it('is accessible with correct ARIA attributes', async () => {
    renderWithProviders(<Footer />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveAttribute('aria-label', 'Site footer');

    const manageSection = screen.getByText('Manage').closest('div');
    const supportSection = screen.getByText('Support').closest('div');
    const legalSection = screen.getByText('Legal').closest('div');

    expect(manageSection).toHaveAttribute('aria-label', 'Manage');
    expect(supportSection).toHaveAttribute('aria-label', 'Support');
    expect(legalSection).toHaveAttribute('aria-label', 'Legal');
  });

  it('applies different styling based on variant', async () => {
    const { rerender } = renderWithProviders(<Footer />);

    const merchantFooter = screen.getByRole('contentinfo');
    expect(merchantFooter).toHaveClass('bg-gray-100');

    rerender(<Footer variant="admin" />);
    const adminFooter = screen.getByRole('contentinfo');
    expect(adminFooter).toHaveClass('bg-slate-800');
  });
});