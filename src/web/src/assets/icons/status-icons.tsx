import React from 'react'; // react 18.2+

/**
 * SVG icon representing a successful completion or approval state
 */
export const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg 
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Success</title>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l2 2 4-4" />
    </svg>
  );
};

/**
 * SVG icon representing an error, failure, or rejection state
 */
export const TimesCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Error</title>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>
  );
};

/**
 * SVG icon representing a warning or alert state
 */
export const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Warning</title>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
};

/**
 * SVG icon representing a pending or waiting state
 */
export const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Pending</title>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
};

/**
 * SVG icon representing a loading or processing state
 */
export const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      className={`animate-spin ${props.className || ''}`}
      {...props}
    >
      <title>Processing</title>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
};

/**
 * SVG icon representing a canceled or prohibited state
 */
export const BanIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Canceled</title>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
};

/**
 * SVG icon representing an information or help state
 */
export const InfoCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Information</title>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
};

/**
 * SVG icon representing a draft or unsaved state
 */
export const DraftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Draft</title>
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="13" x2="12" y2="13.01" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </svg>
  );
};

/**
 * SVG icon representing a submitted or sent state
 */
export const SubmitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Submitted</title>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
};

/**
 * SVG icon representing an escalated state in approval workflows
 */
export const EscalatedIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Escalated</title>
      <path d="M17 11l-5-5-5 5" />
      <path d="M17 18l-5-5-5 5" />
    </svg>
  );
};

/**
 * SVG icon representing a general pending state
 */
export const PendingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      role={props['aria-label'] ? 'img' : undefined}
      {...props}
    >
      <title>Pending</title>
      <path d="M12 10v4" />
      <path d="M12 20v.01" />
      <path d="M12 3.5v.5" />
      <path d="M8 7l.88.88" />
      <path d="M16 7l-.88.88" />
      <path d="M8 16l.88-.88" />
      <path d="M16 16l-.88-.88" />
      <path d="M19 12h.5" />
      <path d="M4 12h.5" />
    </svg>
  );
};