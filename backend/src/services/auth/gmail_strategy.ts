import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { User } from '../../models/user';
import { ConnectedAccount } from '../../models/connected_account';

/**
 * Gmail OAuth Strategy
 * Task: T015 - Implement Passport.js OAuth2 strategy for Gmail
 * Reference: specs/001-ai-communication-hub/plan.md
 *
 * Configures Passport.js with Google OAuth2 for Gmail access
 */

export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface GoogleAuthProfile {
  id: string;
  email: string;
  displayName: string;
  photos?: Array<{ value: string }>;
}

/**
 * Configure Passport with Google OAuth2 Strategy
 */
export const configureGmailStrategy = (): void => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/gmail/callback';

  if (!clientID || !clientSecret) {
    console.error('❌ Google OAuth: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment');
    return;
  }

  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: [
          'profile',
          'email',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/gmail.send'
        ]
      } as any,
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          await handleGoogleOAuthCallback(
            { accessToken, refreshToken },
            profile,
            done
          );
        } catch (error) {
          console.error('❌ Gmail OAuth callback error:', error);
          done(error as Error);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      done(null, user as any);
    } catch (error) {
      done(error as any);
    }
  });

  console.log('✅ Gmail OAuth strategy configured');
};

/**
 * Handle Google OAuth callback
 * Creates or updates user and stores OAuth tokens
 */
async function handleGoogleOAuthCallback(
  tokens: GoogleOAuthTokens,
  profile: Profile,
  done: VerifyCallback
): Promise<void> {
  try {
    // Extract email from profile
    const email = profile.emails?.[0]?.value;

    if (!email) {
      done(new Error('No email found in Google profile'));
      return;
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = User.create({
        email,
        displayName: profile.displayName || email,
        subscriptionTier: 'free'
      });
      await user.save();
      console.log(`✅ Created new user: ${email}`);
    } else if (!user.displayName && profile.displayName) {
      user.displayName = profile.displayName;
      await user.save();
    }

    // Check if user can add more accounts
    {
      const canAdd = await (user as any).canAddAccount();
      if (!canAdd) {
        const maxAccounts = user.subscriptionTier === 'premium' ? 10 : 5;
        done(new Error(`Account limit reached. ${user.subscriptionTier} tier allows max ${maxAccounts} accounts.`));
        return;
      }
    }

    // Find or create connected account for Gmail
    let connectedAccount = await ConnectedAccount.findOne({
      userId: (user as any).id,
      platform: 'gmail',
      email
    });

    if (!connectedAccount) {
      connectedAccount = ConnectedAccount.create({
        userId: (user as any).id,
        platform: 'gmail',
        email,
        displayName: profile.displayName || email,
        syncStatus: 'active',
        connectionHealth: 'healthy',
        oauthTokens: '',
        syncSettings: {
          enabled: true,
          frequency: 300,
          syncFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      });

      console.log(`✅ Created new Gmail account for user: ${email}`);
    }

    // Update OAuth tokens (encrypted)
    await (connectedAccount as any).updateTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : undefined
    });

    // Update connection health
    connectedAccount.connectionHealth = 'healthy';
    connectedAccount.lastSync = new Date();
    await connectedAccount.save();

    

    // Update last login
    await (user as any).updateLastLogin();

    console.log(`✅ Gmail OAuth successful for ${email}`);

    // Pass user to done callback
    done(null, user);
  } catch (error) {
    console.error('❌ Error in Gmail OAuth callback:', error);
    done(error as Error);
  }
}

/**
 * Middleware to initiate Gmail OAuth flow
 */
export const initiateGmailAuth = passport.authenticate('google', {
  session: false,
  accessType: 'offline',
  prompt: 'consent'
});

/**
 * Middleware to handle Gmail OAuth callback
 */
export const handleGmailCallback = passport.authenticate('google', {
  session: false,
  failureRedirect: '/auth/error'
});

/**
 * Refresh access token using refresh token
 * Task: T083 - Token expiration detection and re-authentication
 * Used when access token expires
 */
export async function refreshGmailToken(
  accountId: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const account = await ConnectedAccount.findById(accountId);

    if (!account || account.platform !== 'gmail') {
      console.error('❌ Gmail account not found or invalid platform');
      return null;
    }

    const tokens = (account as any).decryptTokens(account.oauthTokens);

    if (!tokens.refreshToken) {
      console.error('❌ No refresh token available - re-authentication required');

      // T083: Mark account as needing re-authentication
      account.connectionHealth = 'error';
      account.errorMessage = 'Token refresh failed: No refresh token available. Please re-authenticate.';
      account.syncStatus = 'error';
      await account.save();

      return null;
    }

    // Use Google OAuth2 client to refresh token
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update stored tokens
    await (account as any).updateTokens({
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token || tokens.refreshToken,
      expiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : undefined
    });

    // T083: Reset connection health on successful refresh
    account.connectionHealth = 'healthy';
    account.errorMessage = undefined;
    account.syncStatus = 'active';
    await account.save();

    console.log(`✅ Refreshed Gmail token for account ${accountId}`);

    return {
      accessToken: credentials.access_token!,
      expiresIn: credentials.expiry_date
        ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
        : 3600
    };
  } catch (error: any) {
    console.error('❌ Error refreshing Gmail token:', error);

    // T083: Handle specific OAuth errors
    const account = await ConnectedAccount.findById(accountId);
    if (account) {
      account.connectionHealth = 'error';

      // Provide specific error messages
      if (error.response?.data?.error === 'invalid_grant') {
        account.errorMessage = 'Token refresh failed: Invalid or revoked credentials. Please re-authenticate.';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        account.errorMessage = 'Token refresh failed: Network error. Will retry automatically.';
      } else {
        account.errorMessage = `Token refresh failed: ${error.message}. Please re-authenticate if issue persists.`;
      }

      account.syncStatus = 'error';
      await account.save();
    }

    return null;
  }
}

/**
 * Get valid access token for Gmail account
 * Automatically refreshes if expired
 */
export async function getGmailAccessToken(accountId: string): Promise<string | null> {
  try {
    const account = await ConnectedAccount.findById(accountId);

    if (!account || account.platform !== 'gmail') {
      return null;
    }

    const tokens = (account as any).decryptTokens(account.oauthTokens);

    // Check if token is expired or about to expire (within 5 minutes)
    if (tokens.expiresAt) {
      const expiryTime = new Date(tokens.expiresAt).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiryTime - now < fiveMinutes) {
        console.log('⚠️  Gmail token expired or expiring soon, refreshing...');
        const refreshed = await refreshGmailToken(accountId);
        return refreshed?.accessToken || null;
      }
    }

    return tokens.accessToken;
  } catch (error) {
    console.error('❌ Error getting Gmail access token:', error);
    return null;
  }
}
