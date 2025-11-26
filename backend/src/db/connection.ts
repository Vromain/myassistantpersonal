import { DataSource } from 'typeorm';
import { User } from '../models/user';
import { ConnectedAccount } from '../models/connected_account';

interface MySQLConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface ConnectionOptions {}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private dataSource?: DataSource;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(options?: ConnectionOptions): Promise<void> {
    if (this.isConnected) {
      console.log('📦 MySQL: Already connected');
      return;
    }

    const cfg: MySQLConfig = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      username: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'commhub'
    };

    try {
      this.dataSource = new DataSource({
        type: 'mysql',
        host: cfg.host,
        port: cfg.port,
        username: cfg.username,
        password: cfg.password,
        database: cfg.database,
        synchronize: true,
        logging: false,
        entities: [User as any, ConnectedAccount as any]
      });

      await this.dataSource.initialize();
      this.isConnected = true;
      console.log('✅ MySQL: Connected successfully');
      console.log(`📍 MySQL: Database - ${cfg.database}`);

    } catch (error) {
      console.error('❌ MySQL: Connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.dataSource?.destroy();
      this.isConnected = false;
      console.log('👋 MySQL: Disconnected successfully');
    } catch (error) {
      console.error('❌ MySQL: Disconnect error:', error);
      throw error;
    }
  }

  public getConnection() {
    return this.dataSource;
  }

  public isReady(): boolean {
    return !!this.dataSource && this.isConnected;
  }

  public async healthCheck(): Promise<{
    status: string;
    database: string;
    readyState: number;
  }> {
    return {
      status: this.isReady() ? 'connected' : 'disconnected',
      database: (this.dataSource as any)?.options?.database || 'unknown',
      readyState: this.isReady() ? 1 : 0
    };
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();

// Export for testing
export default DatabaseConnection;
