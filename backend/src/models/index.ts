/**
 * Models Index
 * Central export point for all database models
 */

export { User, IUser } from './user';
export { ConnectedAccount, IConnectedAccount } from './connected_account';
export { Message, IMessage } from './message';
export { Category, ICategory } from './category';
export { AIEvent, IAIEvent } from './ai_event';
export { SyncProgress, ISyncProgress } from './sync_progress';
export { OfflineOperation, IOfflineOperation, type OperationType } from './offline_operation';
export { DeviceToken, IDeviceToken } from './device_token';
export { AnalyticsData, IAnalyticsData } from './analytics_data';
export { MessageAnalysis, IMessageAnalysis } from './message_analysis';
export { UserSettings, IUserSettings, IAutoReplyConditions } from './user_settings';

// Re-export types
export type { Platform, SyncStatus, ConnectionHealth } from './connected_account';
export type { PriorityLevel, IAttachment } from './message';
export type { IAutoAssignmentRules } from './category';
export type { MetricType } from './analytics_data';
export type { SentimentType } from './message_analysis';
export type { IServiceHealth, IBackendServiceHealth, IOllamaServiceHealth, IServicesHealthResponse, ServiceStatus } from './service_health';
