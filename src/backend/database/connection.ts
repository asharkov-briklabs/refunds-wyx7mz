import mongoose from 'mongoose'; // mongoose ^6.0.0
import databaseConfig from '../config/database';
import { logger } from '../common/utils/logger';

/**
 * Interface to represent the status of a database connection
 */
export interface ConnectionStatus {
  isConnected: boolean;
  readyState: number;
  status: string;
  retryCount: number;
}

/**
 * Maps mongoose connection states to readable strings
 */
const CONNECTION_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

/**
 * Singleton class that manages MongoDB database connections with automatic reconnection capabilities
 */
class DatabaseConnection {
  private connection: mongoose.Connection | null = null;
  private isConnected: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<mongoose.Connection> | null = null;
  
  /**
   * Initializes the DatabaseConnection instance with default values
   */
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.reconnectTimer = null;
    this.connectionPromise = null;
  }
  
  /**
   * Establishes connection to MongoDB using configuration parameters
   * 
   * @returns Promise that resolves to the Mongoose connection object
   */
  public async connect(): Promise<mongoose.Connection> {
    // If there's already a connection attempt in progress, return that promise
    if (this.connectionPromise) {
      logger.debug('Connection attempt already in progress, reusing connection promise');
      return this.connectionPromise;
    }
    
    // If already connected, return the existing connection
    if (this.isConnected && this.connection) {
      logger.debug('Using existing database connection');
      return this.connection;
    }
    
    // Create a new connection promise
    this.connectionPromise = new Promise<mongoose.Connection>(async (resolve, reject) => {
      try {
        // Mask sensitive information in URI before logging
        const maskedUri = databaseConfig.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        logger.info(`Attempting to connect to MongoDB: ${maskedUri}`);
        
        // Get URI and options from configuration
        const { uri, options } = databaseConfig;
        
        // Connect to MongoDB
        await mongoose.connect(uri, options);
        
        // Store the connection
        this.connection = mongoose.connection;
        
        // Set up event listeners
        this.connection.on('connected', () => {
          logger.info('MongoDB connection established successfully');
          this.isConnected = true;
          this.retryCount = 0;
        });
        
        this.connection.on('error', (err) => {
          logger.error('MongoDB connection error', { error: err });
          this.handleConnectionError(err);
        });
        
        this.connection.on('disconnected', () => {
          logger.warn('MongoDB connection disconnected');
          this.isConnected = false;
          this.handleConnectionError(new Error('MongoDB disconnected'));
        });
        
        // Mark as connected
        this.isConnected = true;
        this.retryCount = 0;
        
        logger.info('MongoDB connection established successfully');
        resolve(this.connection);
      } catch (error) {
        logger.error('Failed to connect to MongoDB', { error });
        this.isConnected = false;
        this.handleConnectionError(error as Error);
        reject(error);
      } finally {
        // Clear the connection promise so future connect calls can proceed
        this.connectionPromise = null;
      }
    });
    
    return this.connectionPromise;
  }
  
  /**
   * Gracefully closes the database connection
   * 
   * @returns Promise that resolves when the connection is successfully closed
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected || !mongoose.connection) {
      logger.debug('No active connection to disconnect');
      return;
    }
    
    logger.info('Disconnecting from MongoDB');
    
    // Clear any pending reconnection attempts
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    try {
      await mongoose.disconnect();
      this.isConnected = false;
      this.retryCount = 0;
      this.connection = null;
      this.connectionPromise = null;
      logger.info('MongoDB connection closed successfully');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', { error });
      throw error;
    }
  }
  
  /**
   * Returns the current database connection or establishes a new one if not connected
   * 
   * @returns Promise that resolves to the Mongoose connection object
   */
  public async getConnection(): Promise<mongoose.Connection> {
    if (this.isConnected && this.connection) {
      return this.connection;
    }
    
    return this.connect();
  }
  
  /**
   * Handles database connection errors with exponential backoff retry logic
   * 
   * @param error - The error that occurred during connection
   */
  private handleConnectionError(error: Error): void {
    logger.error('Database connection error', { 
      error: error.message,
      stack: error.stack,
      retryCount: this.retryCount
    });
    
    this.isConnected = false;
    this.retryCount++;
    
    // Check if we've exceeded the maximum retry attempts
    if (this.retryCount > this.maxRetries) {
      logger.error('Maximum database connection retry attempts exceeded', {
        maxRetries: this.maxRetries
      });
      return;
    }
    
    // Calculate backoff time with exponential strategy and some jitter
    const baseDelay = 1000; // 1 second
    const maxJitter = 200; // 200ms of random jitter
    const exponentialFactor = Math.pow(2, this.retryCount - 1);
    const jitter = Math.random() * maxJitter;
    const delay = baseDelay * exponentialFactor + jitter;
    
    logger.info(`Scheduling database reconnection attempt ${this.retryCount} of ${this.maxRetries} in ${delay}ms`);
    
    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    // Schedule reconnection attempt
    this.reconnectTimer = setTimeout(() => {
      logger.info(`Attempting database reconnection (attempt ${this.retryCount} of ${this.maxRetries})`);
      
      // Reset the connection promise to allow a new connection attempt
      this.connectionPromise = null;
      
      this.connect().catch(err => {
        logger.error('Reconnection attempt failed', { error: err });
      });
    }, delay);
  }
  
  /**
   * Returns the current status of database connection
   * 
   * @returns Object containing connection status information
   */
  public getStatus(): ConnectionStatus {
    // If there's no mongoose connection yet, assume disconnected
    const readyState = mongoose.connection ? mongoose.connection.readyState : 0;
    const status = CONNECTION_STATES[readyState] || 'unknown';
    
    return {
      isConnected: this.isConnected,
      readyState,
      status,
      retryCount: this.retryCount
    };
  }
}

// Create singleton instance
const databaseConnection = new DatabaseConnection();

/**
 * Convenience function to get the database connection
 * 
 * @returns Promise that resolves to a Mongoose connection
 */
export const getConnection = async (): Promise<mongoose.Connection> => {
  return databaseConnection.getConnection();
};

/**
 * Function to establish database connection
 * 
 * @returns Promise that resolves to a Mongoose connection
 */
export const connect = async (): Promise<mongoose.Connection> => {
  return databaseConnection.connect();
};

/**
 * Function to gracefully close database connection
 * 
 * @returns Promise that resolves when connection is closed
 */
export const disconnect = async (): Promise<void> => {
  return databaseConnection.disconnect();
};

// Export the singleton instance as default
export default databaseConnection;