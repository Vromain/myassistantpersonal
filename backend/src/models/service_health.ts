/**
 * Service Health Interfaces
 * Task: T004 - Create ServiceHealth model/interface
 * Feature: 002-intelligent-message-analysis
 */

export type ServiceStatus = 'online' | 'offline' | 'degraded';

export interface IServiceHealth {
  serviceName: string;
  status: ServiceStatus;
  endpoint?: string;
  responseTime?: number;  // milliseconds
  lastCheckTimestamp: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface IBackendServiceHealth extends IServiceHealth {
  serviceName: 'Backend API';
  endpoint: string;
  responseTime: number;
}

export interface IOllamaServiceHealth extends IServiceHealth {
  serviceName: 'Ollama AI';
  metadata: {
    modelName?: string;
    availableModels?: string[];
    failureCount?: number;
  };
}

export interface IServicesHealthResponse {
  backend: IBackendServiceHealth;
  ollama: IOllamaServiceHealth;
}
