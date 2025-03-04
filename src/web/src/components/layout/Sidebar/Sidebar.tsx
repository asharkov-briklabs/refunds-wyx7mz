import React, { useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../../../hooks/useAuth';
import useResponsive from '../../../hooks/useResponsive';
import { UserRole } from '../../../types/user.types';
import { PIKE_ROUTES, BARRACUDA_ROUTES, BASE_ROUTES } from '../../../constants/routes.constants';
import {
  DashboardIcon,
  RefundsIcon,
  TransactionsIcon,
  BankAccountsIcon,
  SettingsIcon,
  MerchantsIcon,
  ConfigurationIcon,
  ParametersIcon,
  RulesIcon,
  WorkflowsIcon,
  AnalyticsIcon,
  ReportsIcon,
  ComplianceIcon
} from '../../../assets/icons/navigation-icons';

// Interface for Sidebar component props
interface SidebarProps {
  interfaceType: 'pike' | 'barracuda';
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

// Interface for individual navigation items
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  isCollapsed: boolean;
  isActive: boolean;
}

// Configuration type for navigation items
interface NavItemConfig {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

/**
 * Sidebar navigation component that adapts based on interface type and user role
 * Provides navigation for both Pike (merchant) and Barracuda (admin) interfaces
 */
const Sidebar: React.FC<SidebarProps> = ({
  interfaceType,
  isCollapsed,
  toggleCollapsed
}) => {
  // Get user data and role checking function from auth hook
  const { user, hasRole } = useAuth();
  
  // Get responsive breakpoint info
  const { isMobile, isTablet } = useResponsive();
  
  // Get current location for active item highlighting
  const location = useLocation();

  // Define navigation items for Pike interface (merchant-facing)
  const pikeNavItems: NavItemConfig[] = [
    {
      path: `${BASE_ROUTES.PIKE}${PIKE_ROUTES.DASHBOARD}`,
      label: 'Dashboard',
      icon: DashboardIcon,
      roles: [UserRole.MERCHANT_ADMIN, UserRole.BARRACUDA_ADMIN]
    },
    {
      path: `${BASE_ROUTES.PIKE}${PIKE_ROUTES.REFUNDS}`,
      label: 'Refunds',
      icon: RefundsIcon,
      roles: [UserRole.MERCHANT_ADMIN, UserRole.BARRACUDA_ADMIN]
    },
    {
      path: `${BASE_ROUTES.PIKE}${PIKE_ROUTES.TRANSACTIONS}`,
      label: 'Transactions',
      icon: TransactionsIcon,
      roles: [UserRole.MERCHANT_ADMIN, UserRole.BARRACUDA_ADMIN]
    },
    {
      path: `${BASE_ROUTES.PIKE}${PIKE_ROUTES.BANK_ACCOUNTS}`,
      label: 'Bank Accounts',
      icon: BankAccountsIcon,
      roles: [UserRole.MERCHANT_ADMIN, UserRole.BARRACUDA_ADMIN]
    },
    {
      path: `${BASE_ROUTES.PIKE}${PIKE_ROUTES.SETTINGS}`,
      label: 'Settings',
      icon: SettingsIcon,
      roles: [UserRole.MERCHANT_ADMIN, UserRole.BARRACUDA_ADMIN]
    }
  ];

  // Define navigation items for Barracuda interface (admin-facing)
  const barracudaNavItems: NavItemConfig[] = [
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.DASHBOARD}`,
      label: 'Dashboard',
      icon: DashboardIcon,
      roles: [UserRole.BARRACUDA_ADMIN, UserRole.BANK_ADMIN, UserRole.ORGANIZATION_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.REFUNDS}`,
      label: 'Refunds',
      icon: RefundsIcon,
      roles: [UserRole.BARRACUDA_ADMIN, UserRole.BANK_ADMIN, UserRole.ORGANIZATION_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.MERCHANTS}`,
      label: 'Merchants',
      icon: MerchantsIcon,
      roles: [UserRole.BARRACUDA_ADMIN, UserRole.BANK_ADMIN, UserRole.ORGANIZATION_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.TRANSACTIONS}`,
      label: 'Transactions',
      icon: TransactionsIcon,
      roles: [UserRole.BARRACUDA_ADMIN, UserRole.BANK_ADMIN, UserRole.ORGANIZATION_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.CONFIGURATION}`,
      label: 'Configuration',
      icon: ConfigurationIcon,
      roles: [UserRole.BARRACUDA_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.PARAMETERS}`,
      label: 'Parameters',
      icon: ParametersIcon,
      roles: [UserRole.BARRACUDA_ADMIN, UserRole.BANK_ADMIN, UserRole.ORGANIZATION_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.RULES}`,
      label: 'Rules',
      icon: RulesIcon,
      roles: [UserRole.BARRACUDA_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.WORKFLOWS}`,
      label: 'Workflows',
      icon: WorkflowsIcon,
      roles: [UserRole.BARRACUDA_ADMIN, UserRole.BANK_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.ANALYTICS}`,
      label: 'Analytics',
      icon: AnalyticsIcon,
      roles: [UserRole.BARRACUDA_ADMIN, UserRole.BANK_ADMIN, UserRole.ORGANIZATION_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.REPORTS}`,
      label: 'Reports',
      icon: ReportsIcon,
      roles: [UserRole.BARRACUDA_ADMIN, UserRole.BANK_ADMIN, UserRole.ORGANIZATION_ADMIN]
    },
    {
      path: `${BASE_ROUTES.BARRACUDA}${BARRACUDA_ROUTES.COMPLIANCE}`,
      label: 'Compliance',
      icon: ComplianceIcon,
      roles: [UserRole.BARRACUDA_ADMIN]
    }
  ];

  // Select the appropriate navigation items based on interface type
  const navItems = interfaceType === 'pike' ? pikeNavItems : barracudaNavItems;

  // Filter navigation items based on user roles
  const filteredNavItems = navItems.filter(item => {
    return item.roles.some(role => hasRole(role));
  });

  // Auto-collapse sidebar on mobile and tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      // Auto-collapse on smaller screens if not already collapsed
      if (!isCollapsed) {
        toggleCollapsed();
      }
    }
  }, [isMobile, isTablet, isCollapsed, toggleCollapsed]);

  // Handle keyboard navigation within the sidebar
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Collapse sidebar when Escape key is pressed
      if (!isCollapsed) {
        toggleCollapsed();
      }
    }
  }, [isCollapsed, toggleCollapsed]);

  return (
    <aside 
      className={`sidebar ${isCollapsed ? 'sidebar--collapsed' : ''}`}
      aria-label={`${interfaceType === 'pike' ? 'Merchant' : 'Admin'} Navigation`}
      onKeyDown={handleKeyDown}
    >
      <div className="sidebar__header">
        <button 
          type="button"
          className="sidebar__toggle"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      
      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <li className="sidebar__nav-item" key={item.path}>
                <NavItem 
                  icon={<Icon />}
                  label={item.label}
                  path={item.path}
                  isCollapsed={isCollapsed}
                  isActive={isActive}
                />
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

/**
 * Individual navigation item component for the sidebar
 */
const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  path,
  isCollapsed,
  isActive
}) => {
  return (
    <NavLink
      to={path}
      className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
      title={isCollapsed ? label : undefined}
    >
      <span className="nav-item__icon" aria-hidden="true">
        {icon}
      </span>
      {!isCollapsed && (
        <span className="nav-item__label">{label}</span>
      )}
    </NavLink>
  );
};

export default Sidebar;