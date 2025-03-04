import { debug } from '../common/utils/logger';
import dotenv from 'dotenv'; // dotenv@^16.0.0

// Load environment variables
dotenv.config();

// Global environment variable
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Default service configuration to be used when environment-specific settings are not available
 */
const DEFAULT_SERVICE_CONFIG = {
  paymentService: {
    baseUrl: 'http://localhost:3001/api',
    timeout: 5000, // ms
    retries: 3,
    retryDelay: 1000 // ms
  },
  balanceService: {
    baseUrl: 'http://localhost:3002/api',
    timeout: 5000,
    retries: 3,
    retryDelay: 1000
  },
  merchantService: {
    baseUrl: 'http://localhost:3003/api',
    timeout: 5000,
    retries: 3,
    retryDelay: 1000
  },
  programService: {
    baseUrl: 'http://localhost:3004/api',
    timeout: 5000,
    retries: 3,
    retryDelay: 1000
  },
  approvalService: {
    baseUrl: 'http://localhost:3005/api',
    timeout: 10000,
    retries: 2,
    retryDelay: 2000
  },
  notificationService: {
    baseUrl: 'http://localhost:3006/api',
    timeout: 5000,
    retries: 3,
    retryDelay: 1000
  },
  bankAccountService: {
    baseUrl: 'http://localhost:3007/api',
    timeout: 5000,
    retries: 3,
    retryDelay: 1000
  },
  paymentGateways: {
    stripe: {
      apiVersion: '2023-08-16',
      timeout: 10000,
      retries: 3,
      retryDelay: 2000,
      webhookTimeout: 5000,
      idempotencyKeyPrefix: 'brik_refund_'
    },
    adyen: {
      apiVersion: 'v68',
      timeout: 10000,
      retries: 3,
      retryDelay: 2000,
      webhookTimeout: 5000,
      idempotencyKeyPrefix: 'brik_refund_'
    },
    fiserv: {
      apiVersion: '2021-03',
      timeout: 15000,
      retries: 3,
      retryDelay: 3000,
      webhookTimeout: 5000,
      idempotencyKeyPrefix: 'brik_refund_'
    }
  }
};

/**
 * Environment-specific service configuration settings
 */
const SERVICE_CONFIG = {
  development: {
    paymentService: {
      baseUrl: 'http://localhost:3001/api',
      timeout: 5000,
      retries: 3,
      retryDelay: 1000
    },
    balanceService: {
      baseUrl: 'http://localhost:3002/api',
      timeout: 5000,
      retries: 3,
      retryDelay: 1000
    },
    merchantService: {
      baseUrl: 'http://localhost:3003/api',
      timeout: 5000,
      retries: 3,
      retryDelay: 1000
    },
    programService: {
      baseUrl: 'http://localhost:3004/api',
      timeout: 5000,
      retries: 3,
      retryDelay: 1000
    },
    approvalService: {
      baseUrl: 'http://localhost:3005/api',
      timeout: 10000,
      retries: 2,
      retryDelay: 2000
    },
    notificationService: {
      baseUrl: 'http://localhost:3006/api',
      timeout: 5000,
      retries: 3,
      retryDelay: 1000
    },
    bankAccountService: {
      baseUrl: 'http://localhost:3007/api',
      timeout: 5000,
      retries: 3,
      retryDelay: 1000
    },
    paymentGateways: {
      stripe: {
        apiVersion: '2023-08-16',
        timeout: 10000,
        retries: 3,
        retryDelay: 2000,
        webhookTimeout: 5000,
        idempotencyKeyPrefix: 'brik_dev_refund_',
        sandboxMode: true
      },
      adyen: {
        apiVersion: 'v68',
        timeout: 10000,
        retries: 3,
        retryDelay: 2000,
        webhookTimeout: 5000,
        idempotencyKeyPrefix: 'brik_dev_refund_',
        sandboxMode: true
      },
      fiserv: {
        apiVersion: '2021-03',
        timeout: 15000,
        retries: 3,
        retryDelay: 3000,
        webhookTimeout: 5000,
        idempotencyKeyPrefix: 'brik_dev_refund_',
        sandboxMode: true
      }
    }
  },
  test: {
    paymentService: {
      baseUrl: 'http://payment-service:3001/api',
      timeout: 2000,
      retries: 1,
      retryDelay: 500
    },
    balanceService: {
      baseUrl: 'http://balance-service:3002/api',
      timeout: 2000,
      retries: 1,
      retryDelay: 500
    },
    merchantService: {
      baseUrl: 'http://merchant-service:3003/api',
      timeout: 2000,
      retries: 1,
      retryDelay: 500
    },
    programService: {
      baseUrl: 'http://program-service:3004/api',
      timeout: 2000,
      retries: 1,
      retryDelay: 500
    },
    approvalService: {
      baseUrl: 'http://approval-service:3005/api',
      timeout: 2000,
      retries: 1,
      retryDelay: 500
    },
    notificationService: {
      baseUrl: 'http://notification-service:3006/api',
      timeout: 2000,
      retries: 1,
      retryDelay: 500
    },
    bankAccountService: {
      baseUrl: 'http://bank-account-service:3007/api',
      timeout: 2000,
      retries: 1,
      retryDelay: 500
    },
    paymentGateways: {
      stripe: {
        apiVersion: '2023-08-16',
        timeout: 3000,
        retries: 1,
        retryDelay: 500,
        webhookTimeout: 2000,
        idempotencyKeyPrefix: 'brik_test_refund_',
        sandboxMode: true
      },
      adyen: {
        apiVersion: 'v68',
        timeout: 3000,
        retries: 1,
        retryDelay: 500,
        webhookTimeout: 2000,
        idempotencyKeyPrefix: 'brik_test_refund_',
        sandboxMode: true
      },
      fiserv: {
        apiVersion: '2021-03',
        timeout: 3000,
        retries: 1,
        retryDelay: 500,
        webhookTimeout: 2000,
        idempotencyKeyPrefix: 'brik_test_refund_',
        sandboxMode: true
      }
    }
  },
  staging: {
    paymentService: {
      baseUrl: process.env.PAYMENT_SERVICE_URL || 'https://payment-service-staging.brik.com/api',
      timeout: 8000,
      retries: 3,
      retryDelay: 2000
    },
    balanceService: {
      baseUrl: process.env.BALANCE_SERVICE_URL || 'https://balance-service-staging.brik.com/api',
      timeout: 8000,
      retries: 3,
      retryDelay: 2000
    },
    merchantService: {
      baseUrl: process.env.MERCHANT_SERVICE_URL || 'https://merchant-service-staging.brik.com/api',
      timeout: 8000,
      retries: 3,
      retryDelay: 2000
    },
    programService: {
      baseUrl: process.env.PROGRAM_SERVICE_URL || 'https://program-service-staging.brik.com/api',
      timeout: 8000,
      retries: 3,
      retryDelay: 2000
    },
    approvalService: {
      baseUrl: process.env.APPROVAL_SERVICE_URL || 'https://approval-service-staging.brik.com/api',
      timeout: 15000,
      retries: 3,
      retryDelay: 3000
    },
    notificationService: {
      baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service-staging.brik.com/api',
      timeout: 8000,
      retries: 3,
      retryDelay: 2000
    },
    bankAccountService: {
      baseUrl: process.env.BANK_ACCOUNT_SERVICE_URL || 'https://bank-account-service-staging.brik.com/api',
      timeout: 8000,
      retries: 3,
      retryDelay: 2000
    },
    paymentGateways: {
      stripe: {
        apiVersion: '2023-08-16',
        timeout: 15000,
        retries: 3,
        retryDelay: 3000,
        webhookTimeout: 8000,
        idempotencyKeyPrefix: 'brik_stg_refund_',
        sandboxMode: true
      },
      adyen: {
        apiVersion: 'v68',
        timeout: 15000,
        retries: 3,
        retryDelay: 3000,
        webhookTimeout: 8000,
        idempotencyKeyPrefix: 'brik_stg_refund_',
        sandboxMode: true
      },
      fiserv: {
        apiVersion: '2021-03',
        timeout: 20000,
        retries: 3,
        retryDelay: 4000,
        webhookTimeout: 8000,
        idempotencyKeyPrefix: 'brik_stg_refund_',
        sandboxMode: true
      }
    }
  },
  production: {
    paymentService: {
      baseUrl: process.env.PAYMENT_SERVICE_URL || 'https://payment-service.brik.com/api',
      timeout: 10000,
      retries: 5,
      retryDelay: 2000
    },
    balanceService: {
      baseUrl: process.env.BALANCE_SERVICE_URL || 'https://balance-service.brik.com/api',
      timeout: 10000,
      retries: 5,
      retryDelay: 2000
    },
    merchantService: {
      baseUrl: process.env.MERCHANT_SERVICE_URL || 'https://merchant-service.brik.com/api',
      timeout: 10000,
      retries: 5,
      retryDelay: 2000
    },
    programService: {
      baseUrl: process.env.PROGRAM_SERVICE_URL || 'https://program-service.brik.com/api',
      timeout: 10000,
      retries: 5,
      retryDelay: 2000
    },
    approvalService: {
      baseUrl: process.env.APPROVAL_SERVICE_URL || 'https://approval-service.brik.com/api',
      timeout: 20000,
      retries: 3,
      retryDelay: 3000
    },
    notificationService: {
      baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service.brik.com/api',
      timeout: 10000,
      retries: 5,
      retryDelay: 2000
    },
    bankAccountService: {
      baseUrl: process.env.BANK_ACCOUNT_SERVICE_URL || 'https://bank-account-service.brik.com/api',
      timeout: 10000,
      retries: 5,
      retryDelay: 2000
    },
    paymentGateways: {
      stripe: {
        apiVersion: '2023-08-16',
        timeout: 20000,
        retries: 5,
        retryDelay: 3000,
        webhookTimeout: 10000,
        idempotencyKeyPrefix: 'brik_refund_',
        sandboxMode: false
      },
      adyen: {
        apiVersion: 'v68',
        timeout: 20000,
        retries: 5,
        retryDelay: 3000,
        webhookTimeout: 10000,
        idempotencyKeyPrefix: 'brik_refund_',
        sandboxMode: false
      },
      fiserv: {
        apiVersion: '2021-03',
        timeout: 25000,
        retries: 5,
        retryDelay: 4000,
        webhookTimeout: 10000,
        idempotencyKeyPrefix: 'brik_refund_',
        sandboxMode: false
      }
    }
  }
};

/**
 * Retrieves service configuration based on current environment with optional overrides
 * 
 * @param overrides - Optional configuration overrides
 * @returns Service configuration object for the current environment
 */
export function getServiceConfig(overrides = {}) {
  const environment = NODE_ENV;
  
  debug(`Loading service configuration for environment: ${environment}`);
  
  // Get environment-specific configuration, fallback to default if not found
  const envConfig = SERVICE_CONFIG[environment] || DEFAULT_SERVICE_CONFIG;
  
  // Apply overrides if provided
  const finalConfig = {
    ...envConfig,
    ...overrides
  };
  
  return finalConfig;
}

// Export default service configuration for current environment
export default getServiceConfig();