import mongoose from 'mongoose';

/**
 * MongoDB Connection Setup
 * Task: T009 - Set up MongoDB connection with connection pooling and error handling
 */

interface ConnectionOptions {
  maxPoolSize?: number;
  minPoolSize?: number;
  serverSelectionTimeoutMS?: number;
  socketTimeoutMS?: number;
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private connectionString: string;
  private isConnected: boolean = false;

  private constructor() {
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/commhub';
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(options?: ConnectionOptions): Promise<void> {
    if (this.isConnected) {
      console.log('📦 MongoDB: Already connected');
      return;
    }

    const defaultOptions: ConnectionOptions = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ...options
    };

    try {
      await mongoose.connect(this.connectionString, defaultOptions);
      this.isConnected = true;
      console.log('✅ MongoDB: Connected successfully');
      console.log(`📍 MongoDB: Database - ${mongoose.connection.db?.databaseName || 'unknown'}`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB: Connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB: Disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB: Reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      console.error('❌ MongoDB: Connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('👋 MongoDB: Disconnected successfully');
    } catch (error) {
      console.error('❌ MongoDB: Disconnect error:', error);
      throw error;
    }
  }

  public getConnection() {
    return mongoose.connection;
  }

  public isReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public async healthCheck(): Promise<{
    status: string;
    database: string;
    readyState: number;
  }> {
    return {
      status: this.isReady() ? 'connected' : 'disconnected',
      database: mongoose.connection.db?.databaseName || 'unknown',
      readyState: mongoose.connection.readyState
    };
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();

// Export for testing
export default DatabaseConnection;
