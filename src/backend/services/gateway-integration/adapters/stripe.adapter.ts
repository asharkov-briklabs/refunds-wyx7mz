{
  "name": "brik-refunds-service",
  "version": "1.0.0",
  "description": "Comprehensive refund processing module for the Brik platform",
  "main": "src/index.js",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src/**/*.{js,jsx,ts,tsx}",
    "lint:fix": "eslint src/**/*.{js,jsx,ts,tsx} --fix",
    "format": "prettier --write src/**/*.{js,jsx,ts,tsx,json,css,scss,md}",
    "typecheck": "tsc --noEmit",
    "storybook": "start-storybook -p 6006",
    "build-storybook": "build-storybook",
    "analyze": "source-map-explorer 'build/static/js/*.js'"
  },
  "dependencies": {
    "@auth0/auth0-react": "^2.0.0",
    "@reduxjs/toolkit": "^1.9.5",
    "axios": "^1.3.4",
    "date-fns": "^2.30.0",
    "formik": "^2.2.9",
    "i18next": "^22.5.0",
    "moment": "^2.29.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-i18next": "^12.2.2",
    "react-query": "^4.0.0",
    "react-redux": "^8.0.7",
    "react-router-dom": "^6.11.2",
    "redux": "^4.2.1",
    "yup": "^1.2.0"
  },
  "devDependencies": {
    "@babel/core": "^7.22.1",
    "@babel/preset-env": "^7.22.4",
    "@babel/preset-react": "^7.22.3",
    "@babel/preset-typescript": "^7.21.5",
    "@storybook/addon-actions": "^6.5.16",
    "@storybook/addon-essentials": "^6.5.16",
    "@storybook/addon-interactions": "^6.5.16",
    "@storybook/addon-links": "^6.5.16",
    "@storybook/builder-webpack5": "^6.5.16",
    "@storybook/manager-webpack5": "^6.5.16",
    "@storybook/react": "^6.5.16",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.4.3",
    "@types/jest": "^29.5.2",
    "@types/node": "^18.16.16",
    "@types/react": "^18.2.8",
    "@types/react-dom": "^18.2.4",
    "@typescript-eslint/eslint-plugin": "^5.59.9",
    "@typescript-eslint/parser": "^5.59.9",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^8.8.0",
    "eslint-plugin-import": "^2.27.5",
    "eslint-plugin-jsx-a11y": "^6.7.1",
    "eslint-plugin-prettier": "^4.2.1",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-storybook": "^0.6.12",
    "husky": "^8.0.3",
    "jest": "^29.5.0",
    "lint-staged": "^13.2.2",
    "postcss": "^8.4.24",
    "prettier": "^2.8.8",
    "react-scripts": "5.0.1",
    "source-map-explorer": "^2.5.3",
    "tailwindcss": "^3.3.2",
    "typescript": "^4.9.5"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "src/**/*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src/**/*.{json,css,scss,md}": [
      "prettier --write"
    ]
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/brik/refunds-service.git"
  },
  "keywords": [
    "brik",
    "refunds",
    "payment",
    "processing",
    "transactions"
  ],
  "author": "Brik Engineering Team",
  "license": "UNLICENSED",
  "private": true
}