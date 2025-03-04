# src/web/src/components/layout/Header/Header.tsx
```typescript
import React, { useState, useCallback } from 'react'; // react ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import { useLocation, Link } from 'react-router-dom'; // ^6.8.0
import { useAuth } from '../../../hooks/useAuth';
import Button, { ButtonVariant } from '../../common/Button';
import NotificationCenter from '../NotificationCenter';
import Logo from '../../../assets/images/logo.svg';
import { SettingsIcon } from '../../../assets/icons/navigation-icons';
import { BASE_ROUTES, COMMON_ROUTES, PIKE_ROUTES, BARRACUDA_ROUTES } from '../../../constants/routes.constants';

/**
 * Main header component that appears at the top of the application
 * @returns {JSX.Element} The rendered header component
 */
const Header: React.FC = () => {
  // IE1: Get authentication state and methods from useAuth hook
  const { user, isAuthenticated, logout, isAdmin, isMerchantAdmin } = useAuth();
  // IE1: Get current location from useLocation hook
  const location = useLocation();
  // IE1: Initialize user menu dropdown state with useState
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // IE1: Determine the current interface (Pike or Barracuda) based on location path
  const isPike = location.pathname.startsWith(BASE_ROUTES.PIKE);
  const isBarracuda = location.pathname.startsWith(BASE_ROUTES.BARRACUDA);

  // IE1: Create navigation link items based on current interface
  const navLinks = () => {
    if (isAuthenticated) {
      if (isPike || (!isBarracuda && !isAdmin())) {
        return (
          <>
            <Link to={BASE_ROUTES.PIKE + PIKE_ROUTES.DASHBOARD} className="hover:text-gray-300">Dashboard</Link>
            <Link to={BASE_ROUTES.PIKE + PIKE_ROUTES.REFUNDS} className="hover:text-gray-300">Refunds</Link>
            <Link to={BASE_ROUTES.PIKE + PIKE_ROUTES.TRANSACTIONS} className="hover:text-gray-300">Transactions</Link>
            <Link to={BASE_ROUTES.PIKE + PIKE_ROUTES.BANK_ACCOUNTS} className="hover:text-gray-300">Bank Accounts</Link>
          </>
        );
      } else if (isBarracuda || isAdmin()) {
        return (
          <>
            <Link to={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.DASHBOARD} className="hover:text-gray-300">Dashboard</Link>
            <Link to={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.MERCHANTS} className="hover:text-gray-300">Merchants</Link>
            <Link to={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.REFUNDS} className="hover:text-gray-300">Refunds</Link>
            {isAdmin() && <Link to={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.CONFIGURATION} className="hover:text-gray-300">Configuration</Link>}
            <Link to={BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.ANALYTICS} className="hover:text-gray-300">Analytics</Link>
          </>
        );
      }
    }
    return null;
  };

  // IE1: Handle logout function that calls auth logout method
  const handleLogout = useCallback(async () => {
    await logout();
    setIsUserMenuOpen(false);
  }, [logout]);

  // IE1: Handle toggle of user menu dropdown
  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // IE3: Add responsive design classes for different screen sizes
  const headerClasses = classNames(
    'bg-blue-700 text-white py-4 px-6 flex items-center justify-between shadow-md sticky top-0 z-50',
    {
      'md:flex-row': true,
      'flex-col': true,
    }
  );

  const navClasses = classNames(
    'space-x-4',
    {
      'md:flex': isAuthenticated,
      'hidden': !isAuthenticated,
    }
  );

  const userSectionClasses = classNames(
    'relative',
    {
      'md:block': isAuthenticated,
      'hidden': !isAuthenticated,
    }
  );

  return (
    <header className={headerClasses}>
      {/* IE1: Render the logo linked to appropriate home route */}
      <Link to={isAuthenticated ? (isBarracuda || isAdmin() ? BASE_ROUTES.BARRACUDA + BARRACUDA_ROUTES.DASHBOARD : BASE_ROUTES.PIKE + PIKE_ROUTES.DASHBOARD) : COMMON_ROUTES.HOME} className="flex-shrink-0">
        <Logo />
      </Link>

      {/* IE1: Render navigation links if user is authenticated */}
      <nav className={navClasses}>
        {navLinks()}
      </nav>

      {/* IE1: Render user profile section with dropdown menu if authenticated */}
      <div className={userSectionClasses}>
        {/* IE1: Render NotificationCenter component if user is authenticated */}
        <NotificationCenter />
        <button
          onClick={toggleUserMenu}
          className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700"
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
        >
          <span className="sr-only">Open user menu</span>
          <img
            className="h-8 w-8 rounded-full"
            src="https://images.unsplash.com/photo-1472099645785-5658abf49823?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt=""
          />
        </button>

        {/* IE1: Include settings and logout options in the user menu */}
        {isUserMenuOpen && (
          <div
            className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu-button"
            tabIndex={-1}
          >
            <a
              href="#"
              className="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
              tabIndex={-1}
              id="user-menu-item-0"
            >
              <SettingsIcon className="mr-2 h-4 w-4 inline-block" aria-hidden="true" />
              Your Profile
            </a>
            <Button
              variant={ButtonVariant.LINK}
              onClick={handleLogout}
              className="block w-full text-left py-2 px-4 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
              tabIndex={-1}
              id="user-menu-item-2"
            >
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;