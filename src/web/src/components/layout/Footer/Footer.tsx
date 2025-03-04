import React from 'react';
import { Link } from 'react-router-dom'; // ^6.10.0
import { COMMON_ROUTES, BASE_ROUTES } from '../../../constants/routes.constants';
import { useAuth } from '../../../hooks/useAuth';

/**
 * Properties for the Footer component
 */
interface FooterProps {
  /**
   * Determines which interface variant to render - merchant (Pike) or admin (Barracuda)
   */
  variant?: 'merchant' | 'admin';
}

/**
 * Footer component that displays copyright information, navigation links, and legal information
 * Adapts its styling and content based on whether it's being used in the Pike (merchant)
 * or Barracuda (admin) interface.
 */
const Footer: React.FC<FooterProps> = ({ variant = 'merchant' }) => {
  // Get current year for copyright text
  const currentYear = new Date().getFullYear();
  
  // Get authentication state
  const { isAuthenticated } = useAuth();
  
  // Determine base route based on variant
  const baseRoute = variant === 'merchant' ? BASE_ROUTES.PIKE : BASE_ROUTES.BARRACUDA;
  
  // Determine footer styling based on variant
  const footerBackground = variant === 'merchant' ? 'bg-gray-100' : 'bg-slate-800';
  const textColor = variant === 'merchant' ? 'text-gray-600' : 'text-gray-300';
  const linkColor = variant === 'merchant' ? 'text-primary-600 hover:text-primary-700' : 'text-gray-400 hover:text-white';
  const borderColor = variant === 'merchant' ? 'border-gray-200' : 'border-gray-700';
  
  return (
    <footer className={`${footerBackground} border-t ${borderColor}`} role="contentinfo" aria-label="Site footer">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brik logo and copyright */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex flex-col">
              <div className="mb-4">
                <img 
                  src={variant === 'merchant' ? '/assets/images/brik-logo.svg' : '/assets/images/brik-admin-logo.svg'} 
                  alt="Brik" 
                  className="h-8 w-auto" 
                />
              </div>
              <p className={`${textColor} text-sm`}>
                &copy; {currentYear} Brik Financial, Inc.<br />
                All rights reserved.
              </p>
            </div>
          </div>
          
          {/* Primary navigation links - vary based on variant */}
          <div className="col-span-1 md:col-span-1">
            <h3 className={`text-sm font-semibold ${textColor} tracking-wider uppercase mb-4`}>
              {variant === 'merchant' ? 'Manage' : 'Administration'}
            </h3>
            <ul className="space-y-2">
              {variant === 'merchant' ? (
                // Merchant (Pike) navigation links
                <>
                  <li>
                    <Link to={`${baseRoute}${COMMON_ROUTES.HOME}`} className={`text-sm ${linkColor}`}>
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to={`${baseRoute}/refunds`} className={`text-sm ${linkColor}`}>
                      Refunds
                    </Link>
                  </li>
                  <li>
                    <Link to={`${baseRoute}/transactions`} className={`text-sm ${linkColor}`}>
                      Transactions
                    </Link>
                  </li>
                  <li>
                    <Link to={`${baseRoute}/bank-accounts`} className={`text-sm ${linkColor}`}>
                      Bank Accounts
                    </Link>
                  </li>
                </>
              ) : (
                // Admin (Barracuda) navigation links
                <>
                  <li>
                    <Link to={`${baseRoute}${COMMON_ROUTES.HOME}`} className={`text-sm ${linkColor}`}>
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to={`${baseRoute}/merchants`} className={`text-sm ${linkColor}`}>
                      Merchants
                    </Link>
                  </li>
                  <li>
                    <Link to={`${baseRoute}/parameters`} className={`text-sm ${linkColor}`}>
                      Parameters
                    </Link>
                  </li>
                  <li>
                    <Link to={`${baseRoute}/compliance`} className={`text-sm ${linkColor}`}>
                      Compliance
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
          
          {/* Support links */}
          <div className="col-span-1 md:col-span-1">
            <h3 className={`text-sm font-semibold ${textColor} tracking-wider uppercase mb-4`}>
              Support
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="https://help.brik.com" className={`text-sm ${linkColor}`} target="_blank" rel="noopener noreferrer">
                  Help Center
                </a>
              </li>
              <li>
                <a href="https://status.brik.com" className={`text-sm ${linkColor}`} target="_blank" rel="noopener noreferrer">
                  System Status
                </a>
              </li>
              <li>
                <a href="https://docs.brik.com/api" className={`text-sm ${linkColor}`} target="_blank" rel="noopener noreferrer">
                  API Documentation
                </a>
              </li>
              <li>
                <a href="mailto:support@brik.com" className={`text-sm ${linkColor}`}>
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
          
          {/* Legal links */}
          <div className="col-span-1 md:col-span-1">
            <h3 className={`text-sm font-semibold ${textColor} tracking-wider uppercase mb-4`}>
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/legal/privacy" className={`text-sm ${linkColor}`}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/legal/terms" className={`text-sm ${linkColor}`}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/legal/compliance" className={`text-sm ${linkColor}`}>
                  Compliance
                </Link>
              </li>
              <li>
                <Link to="/legal/cookies" className={`text-sm ${linkColor}`}>
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom section with additional legal information */}
        <div className={`pt-6 mt-6 border-t ${borderColor} flex flex-col sm:flex-row sm:items-center sm:justify-between`}>
          <p className={`text-xs ${textColor}`}>
            Brik Financial is a financial technology company, not a bank. Banking services provided by Brik's partner banks.
          </p>
          <div className="mt-4 sm:mt-0 flex space-x-6">
            <a 
              href="https://twitter.com/brikfinancial" 
              className={`text-gray-400 hover:text-gray-500`} 
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Brik Financial on Twitter"
            >
              <span className="sr-only">Twitter</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a 
              href="https://linkedin.com/company/brikfinancial" 
              className={`text-gray-400 hover:text-gray-500`} 
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Brik Financial on LinkedIn"
            >
              <span className="sr-only">LinkedIn</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;