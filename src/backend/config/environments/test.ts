/**
 * Test Environment Configuration for Refunds Service
 * 
 * This configuration is specifically designed for automated testing and continuous integration 
 * environments with isolated resources to ensure test isolation and reproducibility.
 */

/**
 * Test environment configuration
 */
const config = {
  /**
   * Environment identifier
   */
  environment: 'test',

  /**
   * Server configuration
   */
  server: {
    port: 3001,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origins: ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    rateLimit: {
      windowMs: 900000, // 15 minutes
      max: 10000, // Limit each IP to 10000 requests per windowMs for testing
    },
  },

  /**
   * Database configuration
   */
  database: {
    type: 'mongodb',
    uri: 'mongodb://mongo:27017/refund-service-test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
      poolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ssl: false,
    },
  },

  /**
   * Logging configuration
   */
  logging: {
    level: 'error', // Use minimal logging in tests to reduce noise
    format: 'json',
    colorize: false,
    file: {
      enabled: false,
      path: './logs/test.log',
    },
    console: {
      enabled: true,
    },
  },

  /**
   * Authentication configuration
   */
  auth: {
    jwtSecret: 'test-jwt-secret-key',
    jwtExpiresIn: '1h',
    auth0: {
      domain: 'test-auth.brik.com',
      audience: 'http://localhost:3001',
      clientId: 'test-client-id',
    },
  },

  /**
   * Service integrations configuration
   */
  services: {
    paymentService: {
      baseUrl: 'http://payment-service:3001',
      timeout: 5000,
    },
    balanceService: {
      baseUrl: 'http://balance-service:3002',
      timeout: 5000,
    },
    merchantService: {
      baseUrl: 'http://merchant-service:3003',
      timeout: 5000,
    },
    programService: {
      baseUrl: 'http://program-service:3004',
      timeout: 5000,
    },
    approvalService: {
      baseUrl: 'http://approval-service:3005',
      timeout: 5000,
    },
    notificationService: {
      baseUrl: 'http://notification-service:3006',
      timeout: 5000,
    },
  },

  /**
   * Redis configuration for caching and distributed locking
   */
  redis: {
    host: 'redis',
    port: 6379,
    password: null,
    db: 1, // Use a different db than production/development
    keyPrefix: 'refund-test:',
    ttl: 3600, // 1 hour TTL for test cache
    cluster: false,
    tls: false,
  },

  /**
   * AWS SQS configuration for message queuing
   */
  sqs: {
    region: 'us-east-1',
    queues: {
      refundProcessing: 'refund-processing-test.fifo',
      notificationQueue: 'notification-queue-test',
      deadLetterQueue: 'refund-dlq-test',
    },
    local: true, // Use localstack for test environment
    endpoint: 'http://localstack:4566',
    visibilityTimeout: 30,
    messageRetentionPeriod: 1209600, // 14 days in seconds
  },

  /**
   * AWS service configurations
   */
  aws: {
    region: 'us-east-1',
    s3: {
      bucket: 'refund-documents-test',
      endpoint: 'http://localstack:4566',
    },
    kms: {
      keyId: 'alias/test-key',
      endpoint: 'http://localstack:4566',
    },
    secretsManager: {
      endpoint: 'http://localstack:4566',
    },
    local: true, // Use localstack for test environment
  },

  /**
   * Payment gateway configurations
   */
  payment: {
    gateways: {
      stripe: {
        apiKey: 'sk_test_stripe_mock_key',
        webhookSecret: 'whsec_stripe_mock_webhook_secret',
        apiVersion: '2023-08-16',
      },
      adyen: {
        apiKey: 'adyen_test_mock_key',
        merchantAccount: 'adyen_test_mock_account',
        environment: 'TEST',
      },
      fiserv: {
        apiKey: 'fiserv_test_mock_key',
        merchantId: 'fiserv_test_mock_id',
        environment: 'test',
      },
    },
    retryStrategy: {
      maxAttempts: 2, // Fewer retry attempts in test
      initialDelay: 100, // Shorter delays in test
      backoffFactor: 1.5,
      jitter: true,
    },
  },

  /**
   * Security configurations
   */
  security: {
    encryptionKey: 'test-encryption-key',
    corsEnabled: true,
    contentSecurityPolicy: false, // Disabled in test for easier debugging
    rateLimiting: false, // Disabled in test for easier testing
    xssProtection: true,
    hsts: false, // Disabled in test environment
  },
};

export default config;