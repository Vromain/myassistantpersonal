import { Router, Request, Response } from 'express';
import {
  initiateGmailAuth,
  handleGmailCallback,
  getGmailAccessToken,
  refreshGmailToken
} from '../../services/auth/gmail_strategy';
import { generateToken, authenticate, AuthRequest } from '../../middleware/auth';
import { ConnectedAccount } from '../../models/connected_account';
import { IUser } from '../../models/user';

/**
 * Gmail OAuth Routes
 * Task: T016 - Create OAuth callback handler for Gmail
 * Reference: specs/001-ai-communication-hub/contracts/auth-api.yaml
 *
 * Endpoints:
 * - GET /api/v1/auth/gmail - Initiate OAuth flow
 * - GET /api/v1/auth/gmail/callback - Handle OAuth callback
 * - POST /api/v1/auth/gmail/disconnect - Disconnect Gmail account
 * - GET /api/v1/auth/gmail/status - Check Gmail connection status
 */

const router = Router();

/**
 * GET /api/v1/auth/gmail
 * Initiate Gmail OAuth flow
 * Redirects user to Google consent screen
 */
router.get('/gmail', (req: Request, res: Response, next) => {
  console.log('🔐 Initiating Gmail OAuth flow');

  // Store optional state parameter for redirect after auth
  const state = req.query.state as string;
  if (state && req.session) {
    (req.session as any).oauthState = state;
  }

  // Store optional callback scheme (for FlutterWebAuth2)
  const callbackScheme = (req.query.callback as string) || undefined;
  if (callbackScheme && req.session) {
    (req.session as any).oauthCallback = callbackScheme;
  }

  initiateGmailAuth(req, res, next);
});

/**
 * GET /api/v1/auth/gmail/callback
 * Handle OAuth callback from Google
 * Exchanges authorization code for access token
 */
router.get(
  '/gmail/callback',
  handleGmailCallback,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as IUser;

      if (!user) {
        console.error('❌ No user found in OAuth callback');
        res.redirect('/auth/error?message=authentication_failed');
        return;
      }

      // Generate JWT token for the user
      const token = generateToken(user);

      // Get the state for redirect (if any)
      const state = (req.query.state as string | undefined) || (req.session as any)?.oauthState;
      if ((req.session as any)?.oauthState) delete (req.session as any).oauthState;

      // Determine redirect target
      const callbackScheme = (req.query.callback as string | undefined) || ((req.session as any)?.oauthCallback as string | undefined);
      if ((req.session as any)?.oauthCallback) delete (req.session as any).oauthCallback;
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const successUrl = callbackScheme
        ? `${callbackScheme}://callback?token=${token}${state ? `&state=${state}` : ''}`
        : `${redirectUrl}/#/?token=${token}${state ? `&state=${state}` : ''}`;

      console.log(`✅ Gmail OAuth successful for ${user.email}`);

      res.redirect(successUrl);
    } catch (error) {
      console.error('❌ Error in Gmail callback:', error);
      res.redirect('/auth/error?message=callback_error');
    }
  }
);

/**
 * POST /api/v1/auth/gmail/disconnect
 * Disconnect Gmail account
 * Requires authentication
 */
router.post('/gmail/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { accountId } = req.body;

    if (!accountId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'accountId is required'
      });
      return;
    }

    // Find the connected account
    const account = await ConnectedAccount.findOne({
      id: accountId,
      userId: userId!,
      platform: 'gmail'
    });

    if (!account) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Gmail account not found'
      });
      return;
    }

    // Delete the account
    await account.deleteOne();

    

    console.log(`✅ Disconnected Gmail account ${accountId} for user ${userId}`);

    res.json({
      success: true,
      message: 'Gmail account disconnected successfully',
      accountId
    });
  } catch (error) {
    console.error('❌ Error disconnecting Gmail:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to disconnect Gmail account'
    });
  }
});

/**
 * GET /api/v1/auth/gmail/status
 * Check Gmail connection status
 * Task: T083 - Enhanced to show token expiration and re-auth requirements
 * Requires authentication
 */
router.get('/gmail/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    // Find all Gmail accounts for this user
    const gmailAccounts = await ConnectedAccount.find({
      userId: userId!,
      platform: 'gmail'
    });

    const accounts = gmailAccounts.map(account => {
      // T083: Determine if account needs re-authentication
      const needsReauth = account.connectionHealth === 'error' &&
        (account.errorMessage?.includes('re-authenticate') ||
         account.errorMessage?.includes('Invalid or revoked'));

      return {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        syncStatus: account.syncStatus,
        connectionHealth: account.connectionHealth,
        errorMessage: account.errorMessage,
        lastSync: account.lastSync,
        syncSettings: account.syncSettings,
        needsReauth // T083: Flag indicating re-authentication required
      };
    });

    // Count accounts needing re-auth
    const needsReauthCount = accounts.filter(a => a.needsReauth).length;

    res.json({
      connected: accounts.length > 0,
      accounts,
      totalAccounts: accounts.length,
      needsReauthCount, // T083: How many accounts need re-authentication
      allHealthy: needsReauthCount === 0
    });
  } catch (error) {
    console.error('❌ Error checking Gmail status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check Gmail connection status'
    });
  }
});

/**
 * POST /api/v1/auth/gmail/refresh
 * Force refresh of Gmail access token
 * Task: T083 - Manually trigger token refresh
 * Requires authentication
 */
router.post('/gmail/refresh', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'accountId is required'
      });
      return;
    }

    // Verify account belongs to user
    const account = await ConnectedAccount.findOne({
      id: accountId,
      userId: req.userId!,
      platform: 'gmail'
    });

    if (!account) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Gmail account not found'
      });
      return;
    }

    // Force token refresh
    const refreshed = await refreshGmailToken(accountId);

    if (!refreshed) {
      // Reload account to get updated error message
      const updatedAccount = await ConnectedAccount.findById(accountId);

      res.status(401).json({
        error: 'Token Refresh Failed',
        message: updatedAccount?.errorMessage || 'Failed to refresh token. Please re-authenticate.',
        needsReauth: true
      });
      return;
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresIn: refreshed.expiresIn,
      needsReauth: false
    });
  } catch (error: any) {
    console.error('❌ Error refreshing token:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh token'
    });
  }
});

/**
 * POST /api/v1/auth/gmail/test
 * Test Gmail API connection
 * Requires authentication
 */
router.post('/gmail/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'accountId is required'
      });
      return;
    }

    // Verify account belongs to user
    const account = await ConnectedAccount.findOne({
      id: accountId,
      userId: req.userId!,
      platform: 'gmail'
    });

    if (!account) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Gmail account not found'
      });
      return;
    }

    // Get valid access token (will refresh if needed)
    const accessToken = await getGmailAccessToken(accountId);

    if (!accessToken) {
      res.status(401).json({
        error: 'Authentication Failed',
        message: 'Failed to get valid access token. Please reconnect your account.'
      });
      return;
    }

    // Test Gmail API with a simple request
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    res.json({
      success: true,
      message: 'Gmail API connection successful',
      profile: {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal
      }
    });
  } catch (error: any) {
    console.error('❌ Error testing Gmail connection:', error);
    res.status(500).json({
      error: 'Connection Test Failed',
      message: error.message || 'Failed to test Gmail connection'
    });
  }
});

/**
 * GET /api/v1/auth/gmail/debug
 * Debug OAuth configuration
 */
router.get('/gmail/debug', (req: Request, res: Response) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    port: process.env.PORT
  });
});

/**
 * GET /api/v1/auth/error
 * OAuth error page
 */
router.get('/error', (req: Request, res: Response) => {
  const message = req.query.message || 'unknown_error';

  res.status(401).json({
    error: 'OAuth Error',
    message: `Authentication failed: ${message}`,
    code: message
  });
});

export default router;
