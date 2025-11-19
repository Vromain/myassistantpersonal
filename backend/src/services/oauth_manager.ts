import { ConnectedAccount, IConnectedAccount, Platform, IOAuthTokens } from '../models/connected_account';
import { refreshGmailToken } from './auth/gmail_strategy';

/**
 * OAuth Token Manager Service
 * Task: T017 - Implement secure token storage service with encryption
 * Reference: specs/001-ai-communication-hub/plan.md
 *
 * Centralized service for managing OAuth tokens across all platforms
 * - Token refresh logic
 * - Token validation
 * - Automatic token renewal
 * - Platform-specific token handling
 */

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isExpired: boolean;
}

export class OAuthTokenManager {
  /**
   * Get valid access token for an account
   * Automatically refreshes if expired or expiring soon
   */
  async getValidToken(accountId: string): Promise<string | null> {
    try {
      const account = await ConnectedAccount.findById(accountId);

      if (!account) {
        console.error(`❌ Account not found: ${accountId}`);
        return null;
      }

      // Check if token needs refresh
      if (this.needsRefresh(account)) {
        console.log(`⚠️  Token for ${account.email} needs refresh`);
        const refreshed = await this.refreshToken(account);

        if (!refreshed) {
          console.error(`❌ Failed to refresh token for ${account.email}`);
          await this.markAccountUnhealthy(account, 'Token refresh failed');
          return null;
        }

        return refreshed;
      }

      // Return existing token
      const tokens = account.decryptTokens(account.oauthTokens as unknown as string);
      return tokens.accessToken;
    } catch (error) {
      console.error('❌ Error getting valid token:', error);
      return null;
    }
  }

  /**
   * Check if token needs refresh
   * Returns true if token is expired or expiring within 5 minutes
   */
  private needsRefresh(account: IConnectedAccount): boolean {
    const tokens = account.decryptTokens(account.oauthTokens as unknown as string);

    if (!tokens.expiresAt) {
      // No expiry info, assume token is valid
      return false;
    }

    const expiryTime = new Date(tokens.expiresAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return expiryTime - now < fiveMinutes;
  }

  /**
   * Refresh access token using refresh token
   * Platform-specific refresh logic
   */
  private async refreshToken(account: IConnectedAccount): Promise<string | null> {
    try {
      switch (account.platform) {
        case 'gmail':
          return await this.refreshGmailToken(account);

        case 'exchange':
          return await this.refreshExchangeToken(account);

        case 'imap':
          // IMAP doesn't use OAuth, password is stored
          const tokens = account.decryptTokens(account.oauthTokens as unknown as string);
          return tokens.accessToken;

        default:
          console.error(`❌ Unsupported platform for token refresh: ${account.platform}`);
          return null;
      }
    } catch (error) {
      console.error(`❌ Error refreshing token for ${account.platform}:`, error);
      return null;
    }
  }

  /**
   * Refresh Gmail OAuth token
   */
  private async refreshGmailToken(account: IConnectedAccount): Promise<string | null> {
    const result = await refreshGmailToken(account.id);

    if (result) {
      await this.markAccountHealthy(account);
      return result.accessToken;
    }

    return null;
  }

  /**
   * Refresh Exchange OAuth token
   * TODO: Implement when Exchange support is added
   */
  private async refreshExchangeToken(account: IConnectedAccount): Promise<string | null> {
    console.warn('⚠️  Exchange token refresh not yet implemented');
    return null;
  }

  /**
   * Store new tokens for an account
   */
  async storeTokens(
    accountId: string,
    tokens: IOAuthTokens
  ): Promise<boolean> {
    try {
      const account = await ConnectedAccount.findById(accountId);

      if (!account) {
        console.error(`❌ Account not found: ${accountId}`);
        return false;
      }

      await account.updateTokens(tokens);
      await this.markAccountHealthy(account);

      console.log(`✅ Tokens stored for ${account.email}`);
      return true;
    } catch (error) {
      console.error('❌ Error storing tokens:', error);
      return false;
    }
  }

  /**
   * Revoke access token and disconnect account
   */
  async revokeToken(accountId: string): Promise<boolean> {
    try {
      const account = await ConnectedAccount.findById(accountId);

      if (!account) {
        console.error(`❌ Account not found: ${accountId}`);
        return false;
      }

      // Platform-specific token revocation
      switch (account.platform) {
        case 'gmail':
          await this.revokeGmailToken(account);
          break;

        case 'exchange':
          await this.revokeExchangeToken(account);
          break;

        default:
          console.warn(`⚠️  No revocation logic for platform: ${account.platform}`);
      }

      // Delete the account
      await account.deleteOne();

      console.log(`✅ Token revoked and account deleted: ${account.email}`);
      return true;
    } catch (error) {
      console.error('❌ Error revoking token:', error);
      return false;
    }
  }

  /**
   * Revoke Gmail OAuth token
   */
  private async revokeGmailToken(account: IConnectedAccount): Promise<void> {
    try {
      const tokens = account.decryptTokens(account.oauthTokens as unknown as string);
      const { google } = require('googleapis');

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      await oauth2Client.revokeToken(tokens.accessToken);
      console.log(`✅ Gmail token revoked for ${account.email}`);
    } catch (error) {
      console.error('❌ Error revoking Gmail token:', error);
      // Continue with account deletion even if revocation fails
    }
  }

  /**
   * Revoke Exchange OAuth token
   * TODO: Implement when Exchange support is added
   */
  private async revokeExchangeToken(account: IConnectedAccount): Promise<void> {
    console.warn('⚠️  Exchange token revocation not yet implemented');
  }

  /**
   * Get token information without refreshing
   */
  async getTokenInfo(accountId: string): Promise<TokenInfo | null> {
    try {
      const account = await ConnectedAccount.findById(accountId);

      if (!account) {
        return null;
      }

      const tokens = account.decryptTokens(account.oauthTokens as unknown as string);
      const isExpired = this.needsRefresh(account);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        isExpired
      };
    } catch (error) {
      console.error('❌ Error getting token info:', error);
      return null;
    }
  }

  /**
   * Mark account as healthy
   */
  private async markAccountHealthy(account: IConnectedAccount): Promise<void> {
    account.connectionHealth = 'healthy';
    account.errorMessage = undefined;
    await account.save();
  }

  /**
   * Mark account as unhealthy
   */
  private async markAccountUnhealthy(
    account: IConnectedAccount,
    error: string
  ): Promise<void> {
    account.connectionHealth = 'error';
    account.errorMessage = error;
    account.syncStatus = 'error';
    await account.save();
  }

  /**
   * Check health of all user's accounts
   * Returns list of unhealthy accounts
   */
  async checkAccountsHealth(userId: string): Promise<Array<{
    accountId: string;
    email: string;
    platform: Platform;
    error: string;
  }>> {
    try {
      const accounts = await ConnectedAccount.find({ userId });
      const unhealthy: Array<{
        accountId: string;
        email: string;
        platform: Platform;
        error: string;
      }> = [];

      for (const account of accounts) {
        // Try to get a valid token
        const token = await this.getValidToken(account.id);

        if (!token) {
          unhealthy.push({
            accountId: account.id,
            email: account.email,
            platform: account.platform,
            error: account.errorMessage || 'Token invalid or expired'
          });
        }
      }

      return unhealthy;
    } catch (error) {
      console.error('❌ Error checking accounts health:', error);
      return [];
    }
  }

  /**
   * Batch refresh tokens for all accounts
   * Useful for background jobs
   */
  async refreshAllTokens(userId: string): Promise<{
    successful: number;
    failed: number;
  }> {
    try {
      const accounts = await ConnectedAccount.find({ userId });
      let successful = 0;
      let failed = 0;

      for (const account of accounts) {
        if (this.needsRefresh(account)) {
          const token = await this.refreshToken(account);

          if (token) {
            successful++;
          } else {
            failed++;
          }
        }
      }

      console.log(`✅ Token refresh complete: ${successful} successful, ${failed} failed`);

      return { successful, failed };
    } catch (error) {
      console.error('❌ Error refreshing all tokens:', error);
      return { successful: 0, failed: 0 };
    }
  }
}

// Export singleton instance
export const oauthManager = new OAuthTokenManager();
export default OAuthTokenManager;
