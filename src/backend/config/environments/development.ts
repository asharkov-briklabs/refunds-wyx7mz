/**
 * Development Environment Configuration
 * 
 * This file contains development-specific settings for the Refunds Service.
 * These settings are optimized for local development and testing environments.
 */

export default {
  // Environment identifier
  environment: 'development',
  
  // Server configuration
  server: {
    port: 3000,
    host: 'localhost',
    cors: {
      enabled: true,
      origins: ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    rateLimit: {
      windowMs: 900000, // 15 minutes
      max: 10000, // Limit each IP to 10000 requests per windowMs
    },
  },
  
  // Database configuration
  database: {
    type: 'mongodb',
    uri: 'mongodb://localhost:27017/refund-service-dev',
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
  
  // Logging configuration
  logging: {
    level: 'debug', // Use verbose logging in development
    format: 'json',
    colorize: true, // Colorize console output
    file: {
      enabled: true,
      path: './logs/development.log',
    },
    console: {
      enabled: true, // Enable console logging
    },
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: 'development-jwt-secret-key', // Only for development
    jwtExpiresIn: '8h',
    auth0: {
      domain: 'dev-auth.brik.com',
      audience: 'http://localhost:3000',
      clientId: 'dev-client-id',
    },
  },
  
  // Service endpoints configuration
  services: {
    paymentService: {
      baseUrl: 'http://localhost:3001',
      timeout: 10000, // 10 seconds
    },
    balanceService: {
      baseUrl: 'http://localhost:3002',
      timeout: 10000,
    },
    merchantService: {
      baseUrl: 'http://localhost:3003',
      timeout: 10000,
    },
    programService: {
      baseUrl: 'http://localhost:3004',
      timeout: 10000,
    },
    approvalService: {
      baseUrl: 'http://localhost:3005',
      timeout: 10000,
    },
    notificationService: {
      baseUrl: 'http://localhost:3006',
      timeout: 10000,
    },
  },
  
  // Redis configuration
  redis: {
    host: 'localhost',
    port: 6379,
    password: null,
    db: 0,
    keyPrefix: 'refund-dev:',
    ttl: 3600, // 1 hour default TTL
    cluster: false,
    tls: false,
  },
  
  // SQS configuration
  sqs: {
    region: 'us-east-1',
    queues: {
      refundProcessing: 'refund-processing-dev.fifo',
      notificationQueue: 'notification-queue-dev',
      deadLetterQueue: 'refund-dlq-dev',
    },
    local: true, // Use localstack for local development
    endpoint: 'http://localhost:4566', // Localstack endpoint
    visibilityTimeout: 30, // 30 seconds
    messageRetentionPeriod: 1209600, // 14 days
  },
  
  // AWS configuration
  aws: {
    region: 'us-east-1',
    s3: {
      bucket: 'refund-documents-dev',
      endpoint: 'http://localhost:4566', // Localstack endpoint
    },
    kms: {
      keyId: 'alias/dev-key',
      endpoint: 'http://localhost:4566', // Localstack endpoint
    },
    secretsManager: {
      endpoint: 'http://localhost:4566', // Localstack endpoint
    },
    local: true, // Use localstack for local development
  },
  
  // Payment gateway configuration
  payment: {
    gateways: {
      stripe: {
        apiKey: 'sk_test_stripe_api_key', // Test API key
        webhookSecret: 'whsec_stripe_webhook_secret', // Test webhook secret
        apiVersion: '2023-08-16', // Stripe API version
      },
      adyen: {
        apiKey: 'adyen_test_api_key', // Test API key
        merchantAccount: 'adyen_test_merchant_account', // Test merchant account
        environment: 'TEST',
      },
      fiserv: {
        apiKey: 'fiserv_test_api_key', // Test API key
        merchantId: 'fiserv_test_merchant_id', // Test merchant ID
        environment: 'test',
      },
    },
    retryStrategy: {
      maxAttempts: 3,
      initialDelay: 1000, // 1 second
      backoffFactor: 2, // Exponential backoff
      jitter: true, // Add jitter to prevent thundering herd
    },
  },
  
  // Security configuration
  security: {
    encryptionKey: 'dev-encryption-key', // Only for development
    corsEnabled: true,
    contentSecurityPolicy: false, // Disabled for development
    rateLimiting: false, // Disabled for development
    xssProtection: true,
    hsts: false, // Disabled for development
  },
};