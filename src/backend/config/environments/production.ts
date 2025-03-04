/**
 * Production Environment Configuration
 * 
 * This file contains all configuration settings specific to the production environment
 * for the Refunds Service. It includes settings for services, databases, authentication,
 * and other components optimized for security, performance, and reliability in production.
 */

/**
 * Export the production environment configuration
 */
export default {
  // Environment identifier
  environment: 'production',

  // Server configuration
  server: {
    port: 8080,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origins: ['https://pike.brik.com', 'https://barracuda.brik.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
    },
    rateLimit: {
      windowMs: 60000, // 1 minute
      max: 100  // 100 requests per minute
    },
    trustProxy: true,
    shutdownTimeout: 30000 // 30 seconds
  },

  // Database configuration
  database: {
    type: 'mongodb',
    uri: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}/refund-service?retryWrites=true&w=majority`,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: false, // Don't build indexes in production
      poolSize: 20, // Maintain up to 20 socket connections
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000, // Socket timeout
      ssl: true
    }
  },

  // Logging configuration
  logging: {
    level: 'info', // log all info and above in production
    format: 'json', // use JSON format for easier parsing
    colorize: false, // no color in production logs
    file: {
      enabled: false // Don't log to files in production (use CloudWatch)
    },
    console: {
      enabled: true // Still log to console for container logs
    },
    cloudwatch: {
      enabled: true,
      logGroupName: '/refund-service/production',
      logStreamName: `${process.env.HOSTNAME || 'main'}`
    }
  },

  // Authentication configuration
  auth: {
    jwtSecret: `${process.env.JWT_SECRET}`,
    jwtExpiresIn: '8h',
    auth0: {
      domain: 'auth.brik.com',
      audience: 'https://refund-api.brik.com',
      clientId: `${process.env.AUTH0_CLIENT_ID}`
    }
  },

  // Service integrations
  services: {
    paymentService: {
      baseUrl: 'https://payment-service.brik.com',
      timeout: 3000 // 3 seconds
    },
    balanceService: {
      baseUrl: 'https://balance-service.brik.com',
      timeout: 3000
    },
    merchantService: {
      baseUrl: 'https://merchant-service.brik.com',
      timeout: 3000
    },
    programService: {
      baseUrl: 'https://program-service.brik.com',
      timeout: 3000
    },
    approvalService: {
      baseUrl: 'https://approval-service.brik.com',
      timeout: 3000
    },
    notificationService: {
      baseUrl: 'https://notification-service.brik.com',
      timeout: 3000
    }
  },

  // Redis cache configuration
  redis: {
    host: `${process.env.REDIS_HOST}`,
    port: 6379,
    password: `${process.env.REDIS_PASSWORD}`,
    db: 0,
    keyPrefix: 'refund:',
    ttl: 3600, // Default TTL: 1 hour
    cluster: true, // Use Redis cluster in production
    tls: true, // Use TLS in production
    connectTimeout: 5000, // Connection timeout: 5 seconds
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true
  },

  // SQS queue configuration
  sqs: {
    region: 'us-east-1',
    queues: {
      refundProcessing: 'refund-processing.fifo', // FIFO queue for ordered processing
      notificationQueue: 'notification-queue',
      deadLetterQueue: 'refund-dlq'
    },
    local: false, // Don't use local SQS in production
    visibilityTimeout: 120, // 2 minutes
    messageRetentionPeriod: 1209600 // 14 days
  },

  // AWS configuration
  aws: {
    region: 'us-east-1',
    s3: {
      bucket: 'refund-documents'
    },
    kms: {
      keyId: `${process.env.KMS_KEY_ID}`
    },
    secretsManager: {
      enabled: true
    },
    local: false, // Don't use local AWS in production
    datadog: {
      enabled: true // Enable DataDog integration
    },
    xray: {
      enabled: true // Enable AWS X-Ray tracing
    }
  },

  // Payment gateway configuration
  payment: {
    gateways: {
      stripe: {
        apiKey: `${process.env.STRIPE_API_KEY}`,
        webhookSecret: `${process.env.STRIPE_WEBHOOK_SECRET}`,
        apiVersion: '2023-08-16'
      },
      adyen: {
        apiKey: `${process.env.ADYEN_API_KEY}`,
        merchantAccount: `${process.env.ADYEN_MERCHANT_ACCOUNT}`,
        environment: 'LIVE'
      },
      fiserv: {
        apiKey: `${process.env.FISERV_API_KEY}`,
        merchantId: `${process.env.FISERV_MERCHANT_ID}`,
        environment: 'production'
      }
    },
    retryStrategy: {
      maxAttempts: 5,
      initialDelay: 2000, // 2 seconds
      backoffFactor: 2, // Exponential backoff
      jitter: true // Add jitter to prevent thundering herd
    }
  },

  // Security configuration
  security: {
    encryptionKey: `${process.env.ENCRYPTION_KEY}`,
    corsEnabled: true,
    contentSecurityPolicy: true,
    rateLimiting: true,
    xssProtection: true,
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    fieldLevelEncryption: {
      enabled: true,
      algorithm: 'AES-256-GCM'
    },
    tlsVersion: 'TLS 1.3'
  }
};