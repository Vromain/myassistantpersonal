import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { ConnectedAccount } from '../../models/connected_account';
import { User } from '../../models/user';
import { db } from '../../db/connection';

/**
 * Accounts Routes
 * Endpoints for managing email accounts (IMAP, etc.)
 */

const router = Router();

/**
 * POST /api/v1/accounts/imap
 * Connect an IMAP account
 */
router.post('/imap', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, host, port = 993, secure = true } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!email || !password || !host) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'email, password, and host are required'
      });
      return;
    }

    // Get user
    const user = await User.findById(userId as string);
    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    // Check if user can add more accounts
    if (!(user as any).canAddAccount()) {
      const maxAccounts = user.subscriptionTier === 'premium' ? 10 : 5;
      res.status(403).json({
        error: 'Account Limit Reached',
        message: `${user.subscriptionTier} tier allows max ${maxAccounts} accounts`
      });
      return;
    }

    // Test IMAP connection first
    const imaps = require('imap-simple');

    const config = {
      imap: {
        user: email,
        password: password,
        host: host,
        port: port,
        tls: secure,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    try {
      console.log(`🔐 Testing IMAP connection for ${email}@${host}:${port}`);
      const connection = await imaps.connect(config);
      await connection.end();
      console.log(`✅ IMAP connection successful for ${email}`);
    } catch (imapError: any) {
      console.error('❌ IMAP connection failed:', imapError.message);
      res.status(401).json({
        error: 'IMAP Connection Failed',
        message: `Could not connect to ${host}: ${imapError.message}`,
        details: 'Please check your email, password, host, and port settings'
      });
      return;
    }

    // Check if account already exists
    let connectedAccount = await ConnectedAccount.findOne({
      userId: user.id,
      platform: 'imap',
      email
    });

    if (connectedAccount) {
      // Update existing account
      connectedAccount.displayName = email;
      connectedAccount.syncStatus = 'active';
      connectedAccount.connectionHealth = 'healthy';
      (connectedAccount as any).imapConfig = {
        host,
        port,
        secure
      };

      // Update credentials (encrypted)
      await (connectedAccount as any).updateTokens({
        accessToken: password, // Store password as "accessToken" (will be encrypted)
        refreshToken: undefined
      });

      await connectedAccount.save();
      console.log(`✅ Updated IMAP account for ${email}`);
    } else {
      const tempAccount = ConnectedAccount.create({
        userId: user.id,
        platform: 'imap',
        email,
        displayName: email,
        syncStatus: 'active',
        connectionHealth: 'healthy',
        imapConfig: {
          host,
          port,
          secure
        },
        syncSettings: {
          enabled: true,
          frequency: 300,
          syncFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      });

      const encryptedTokens = (tempAccount as any).encryptTokens({
        accessToken: password,
        refreshToken: undefined
      });

      tempAccount.oauthTokens = encryptedTokens;
      connectedAccount = await tempAccount.save();

      console.log(`✅ Created new IMAP account for ${email}`);
    }

    res.json({
      success: true,
      message: 'IMAP account connected successfully',
      account: {
        id: connectedAccount.id,
        email: connectedAccount.email,
        platform: connectedAccount.platform,
        displayName: connectedAccount.displayName,
        syncStatus: connectedAccount.syncStatus,
        connectionHealth: connectedAccount.connectionHealth,
        imapConfig: (connectedAccount as any).imapConfig
      }
    });
  } catch (error: any) {
    console.error('❌ Error connecting IMAP account:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to connect IMAP account',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/accounts
 * Get all connected accounts for current user
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as string;

    const ds = db.getConnection();
    const repo = ds!.getRepository(ConnectedAccount);
    const accounts = await repo.find({ where: { userId } });

    res.json({
      success: true,
      accounts: accounts.map(account => ({
        id: account.id,
        platform: account.platform,
        email: account.email,
        displayName: account.displayName,
        syncStatus: account.syncStatus,
        connectionHealth: account.connectionHealth,
        lastSync: account.lastSync,
        syncSettings: account.syncSettings,
        imapConfig: account.imapConfig
      })),
      total: accounts.length
    });
  } catch (error) {
    console.error('❌ Error fetching accounts:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch accounts'
    });
  }
});

/**
 * DELETE /api/v1/accounts/:accountId
 * Disconnect an account
 */
router.delete('/:accountId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.userId as string;

    const account = await ConnectedAccount.findOne({
      id: accountId,
      userId
    });

    if (!account) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Account not found'
      });
      return;
    }

    await account.deleteOne();

    console.log(`✅ Disconnected account ${accountId} for user ${userId}`);

    res.json({
      success: true,
      message: 'Account disconnected successfully',
      accountId
    });
  } catch (error) {
    console.error('❌ Error disconnecting account:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to disconnect account'
    });
  }
});

/**
 * POST /api/v1/accounts/:accountId/test
 * Test connection for an existing account
 */
router.post('/:accountId/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.userId as string;

    const account = await ConnectedAccount.findOne({ id: accountId, userId });
    if (!account) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Account not found'
      });
      return;
    }

    // Test connection based on platform
    if (account.platform === 'imap') {
      // Test IMAP connection
      const imapSimple = require('imap-simple');
      const tokens = (account as any).decryptTokens(account.oauthTokens);
      const config = {
        imap: {
          user: account.email,
          password: tokens.accessToken,
          host: (account as any).imapConfig.host,
          port: (account as any).imapConfig.port,
          tls: (account as any).imapConfig.secure,
          tlsOptions: { rejectUnauthorized: false }
        }
      };

      try {
        console.log(`🔐 Testing IMAP connection for ${account.email}...`);
        const connection = await imapSimple.connect(config);
        await connection.end();
        console.log(`✅ IMAP connection test successful for ${account.email}`);

        res.json({
          success: true,
          message: `Connection test successful for ${account.email}`,
          accountId
        });
      } catch (testError: any) {
        console.error(`❌ IMAP connection test failed for ${account.email}:`, testError.message);
        res.status(400).json({
          error: 'Connection Failed',
          message: `Failed to connect to IMAP server: ${testError.message}`
        });
      }
    } else {
      // For other platforms (Gmail, etc.), just return success if account exists
      res.json({
        success: true,
        message: `Account ${account.email} is configured`,
        accountId
      });
    }
  } catch (error: any) {
    console.error('❌ Error testing account connection:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to test account connection',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/accounts/:accountId
 * Update an existing IMAP account
 */
router.put('/:accountId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId } = req.params;
    const { email, password, host, port = 993, secure = true } = req.body;
    const userId = req.userId as string;

    // Validate required fields
    if (!email || !password || !host) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'email, password, and host are required'
      });
      return;
    }

    // Find the account
    const account = await ConnectedAccount.findOne({ id: accountId, userId });
    if (!account) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Account not found'
      });
      return;
    }

    // Only IMAP accounts can be updated this way
    if (account.platform !== 'imap') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Only IMAP accounts can be updated via this endpoint'
      });
      return;
    }

    // Test IMAP connection before updating
    const imapSimple = require('imap-simple');
    const config = {
      imap: {
        user: email,
        password,
        host,
        port,
        tls: secure,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    try {
      console.log(`🔐 Testing IMAP connection for ${email}@${host}:${port}`);
      const connection = await imapSimple.connect(config);
      await connection.end();
      console.log(`✅ IMAP connection test successful for ${email}`);
    } catch (testError: any) {
      console.error(`❌ IMAP connection test failed:`, testError.message);
      res.status(400).json({
        error: 'Connection Failed',
        message: `Failed to connect to IMAP server: ${testError.message}`
      });
      return;
    }

    // Update account details
    account.email = email;
    account.displayName = email.split('@')[0];
    (account as any).imapConfig = { host, port, secure };

    // Update encrypted tokens with new password
    const encryptedTokens = (account as any).encryptTokens({
      accessToken: password,
      refreshToken: undefined
    });
    account.oauthTokens = encryptedTokens;

    // Save updated account
    await account.save();

    console.log(`✅ Updated IMAP account for ${email}`);

    res.json({
      success: true,
      message: 'Account updated successfully',
      account: {
        id: account.id,
        email: account.email,
        platform: account.platform,
        syncStatus: account.syncStatus
      }
    });
  } catch (error: any) {
    console.error('❌ Error updating account:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update account',
      details: error.message
    });
  }
});

export default router;
