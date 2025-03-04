/// <reference types="react-scripts" />

// Extend NodeJS.ProcessEnv interface to include our custom environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_API_URL: string;
    REACT_APP_AUTH_DOMAIN: string;
    REACT_APP_AUTH_CLIENT_ID: string;
  }
}

// SVG files - allows importing as both string and React component
declare module '*.svg' {
  import React from 'react';
  export const ReactComponent: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// Image file declarations
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

// CSS and SCSS file declarations
declare module '*.css' {
  const classes: { [className: string]: string };
  export default classes;
}

declare module '*.scss' {
  const classes: { [className: string]: string };
  export default classes;
}

// CSS and SCSS modules
declare module '*.module.css' {
  const classes: { [className: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [className: string]: string };
  export default classes;
}

// JSON files
declare module '*.json' {
  const value: any;
  export default value;
}