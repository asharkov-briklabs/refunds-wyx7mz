/**
 * Staging Environment Configuration for Refunds Service
 * 
 * This configuration closely mirrors production settings but with adjustments
 * appropriate for the staging environment, including staging-specific URLs,
 * test payment gateway environments, and pre-production resource configurations.
 * 
 * All sensitive information is loaded from environment variables.
 * 
 * @version 1.0.0
 */

export default {
  // Identifies the current environment
  environment: 'staging',
  
  // Server configuration
  server: {
    port: 8080,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origins: [
        'https://staging-pike.brik.com',
        'https://staging-barracuda.brik.com'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    rateLimit: {
      windowMs: 900000, // 15 minutes
      max: 5000 // Limit each IP to 5000 requests per windowMs
    }
  },
  
  // Database configuration
  database: {
    type: 'mongodb',
    uri: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}/refund-service-staging?retryWrites=true&w=majority`,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
      poolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ssl: true
    }
  },
  
  // Logging configuration
  logging: {
    level: 'debug', // More verbose for staging environment
    format: 'json',
    colorize: false,
    file: {
      enabled: true,
      path: '/var/log/refund-service/staging.log'
    },
    console: {
      enabled: true
    }
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: `${process.env.JWT_SECRET}`,
    jwtExpiresIn: '8h',
    auth0: {
      domain: 'staging-auth.brik.com',
      audience: 'https://staging-refund-api.brik.com',
      clientId: `${process.env.AUTH0_CLIENT_ID}`
    }
  },
  
  // Service integration endpoints
  services: {
    paymentService: {
      baseUrl: 'https://staging-payment-service.brik.com',
      timeout: 5000 // 5 seconds
    },
    balanceService: {
      baseUrl: 'https://staging-balance-service.brik.com',
      timeout: 5000
    },
    merchantService: {
      baseUrl: 'https://staging-merchant-service.brik.com',
      timeout: 5000
    },
    programService: {
      baseUrl: 'https://staging-program-service.brik.com',
      timeout: 5000
    },
    approvalService: {
      baseUrl: 'https://staging-approval-service.brik.com',
      timeout: 5000
    },
    notificationService: {
      baseUrl: 'https://staging-notification-service.brik.com',
      timeout: 5000
    }
  },
  
  // Redis configuration for caching and distributed locking
  redis: {
    host: `${process.env.REDIS_HOST}`,
    port: 6379,
    password: `${process.env.REDIS_PASSWORD}`,
    db: 0,
    keyPrefix: 'refund-staging:',
    ttl: 3600, // 1 hour default TTL
    cluster: true, // Using Redis cluster in staging
    tls: true
  },
  
  // SQS configuration for asynchronous processing
  sqs: {
    region: 'us-east-1',
    queues: {
      refundProcessing: 'refund-processing-staging.fifo',
      notificationQueue: 'notification-queue-staging',
      deadLetterQueue: 'refund-dlq-staging'
    },
    local: false, // Not using local SQS emulator in staging
    visibilityTimeout: 120, // 2 minutes
    messageRetentionPeriod: 1209600 // 14 days
  },
  
  // AWS service configuration
  aws: {
    region: 'us-east-1',
    s3: {
      bucket: 'refund-documents-staging'
    },
    kms: {
      keyId: `${process.env.KMS_KEY_ID}`
    },
    secretsManager: {},
    local: false // Not using local AWS emulation in staging
  },
  
  // Payment gateway configuration
  payment: {
    gateways: {
      stripe: {
        apiKey: `${process.env.STRIPE_API_KEY}`,
        webhookSecret: `${process.env.STRIPE_WEBHOOK_SECRET}`,
        apiVersion: '2023-08-16' // Stripe API version 2023-08-16
      },
      adyen: {
        apiKey: `${process.env.ADYEN_API_KEY}`,
        merchantAccount: `${process.env.ADYEN_MERCHANT_ACCOUNT}`,
        environment: 'TEST' // Using Adyen TEST environment for staging
      },
      fiserv: {
        apiKey: `${process.env.FISERV_API_KEY}`,
        merchantId: `${process.env.FISERV_MERCHANT_ID}`,
        environment: 'test' // Using Fiserv test environment for staging
      }
    },
    retryStrategy: {
      maxAttempts: 4,
      initialDelay: 1000, // 1 second
      backoffFactor: 2, // Exponential backoff
      jitter: true // Add randomness to retry intervals
    }
  },
  
  // Security configuration
  security: {
    encryptionKey: `${process.env.ENCRYPTION_KEY}`,
    corsEnabled: true,
    contentSecurityPolicy: true,
    rateLimiting: true,
    xssProtection: true,
    hsts: true
  }
};