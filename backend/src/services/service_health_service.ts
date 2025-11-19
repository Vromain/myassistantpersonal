import {
  IServicesHealthResponse,
  IBackendServiceHealth,
  IOllamaServiceHealth
} from '../models/service_health';
import { ollamaClient } from './ollama_client';

/**
 * Service Health Service
 * Tasks: T008-T010 - Create service health monitoring
 * Feature: 002-intelligent-message-analysis
 */

class ServiceHealthService {
  private backendEndpoint: string;

  constructor() {
    const port = process.env.PORT || 3002;
    this.backendEndpoint = `http://localhost:${port}`;
  }

  /**
   * T009 - Get Backend API health status
   */
  async getBackendHealth(): Promise<IBackendServiceHealth> {
    const startTime = Date.now();

    try {
      // Simple health check - just verify we can measure response time
      const responseTime = Date.now() - startTime;

      return {
        serviceName: 'Backend API',
        status: 'online',
        endpoint: this.backendEndpoint,
        responseTime,
        lastCheckTimestamp: new Date()
      };
    } catch (error: any) {
      return {
        serviceName: 'Backend API',
        status: 'offline',
        endpoint: this.backendEndpoint,
        responseTime: Date.now() - startTime,
        lastCheckTimestamp: new Date(),
        errorMessage: error.message
      };
    }
  }

  /**
   * T010 - Get Ollama AI health status
   */
  async getOllamaHealth(): Promise<IOllamaServiceHealth> {
    try {
      const healthCheck = await ollamaClient.healthCheck();
      const status = ollamaClient.getStatus();

      return {
        serviceName: 'Ollama AI',
        status: healthCheck.available ? 'online' : 'offline',
        lastCheckTimestamp: new Date(),
        metadata: {
          modelName: status.model,
          availableModels: healthCheck.models || [],
          failureCount: status.failureCount
        }
      };
    } catch (error: any) {
      const status = ollamaClient.getStatus();

      return {
        serviceName: 'Ollama AI',
        status: 'offline',
        lastCheckTimestamp: new Date(),
        errorMessage: error.message || 'Failed to connect to Ollama AI service',
        metadata: {
          modelName: status.model,
          availableModels: [],
          failureCount: status.failureCount
        }
      };
    }
  }

  /**
   * Get all services health status
   */
  async getServicesHealth(): Promise<IServicesHealthResponse> {
    const [backend, ollama] = await Promise.all([
      this.getBackendHealth(),
      this.getOllamaHealth()
    ]);

    return {
      backend,
      ollama
    };
  }
}

// Export singleton instance
export const serviceHealthService = new ServiceHealthService();
export default ServiceHealthService;
