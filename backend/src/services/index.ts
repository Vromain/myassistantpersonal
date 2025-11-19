/**
 * Services Index
 * Central export point for all services
 */

export { ollamaClient } from './ollama_client';
export { oauthManager, OAuthTokenManager } from './oauth_manager';
export {
  configureGmailStrategy,
  initiateGmailAuth,
  handleGmailCallback,
  refreshGmailToken,
  getGmailAccessToken
} from './auth/gmail_strategy';
export { gmailSyncService, GmailSyncService } from './sync/gmail_sync';
export { messageAggregator, MessageAggregatorService } from './message_aggregator';
export { syncScheduler, SyncScheduler } from './sync_scheduler';
