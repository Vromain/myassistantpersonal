import { Router, Request, Response } from 'express';
import { User } from '../../models/user';
import { generateToken } from '../../middleware/auth';
import bcrypt from 'bcrypt';

/**
 * Local Authentication Routes
 * Endpoints for email/password authentication
 */

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user with email and password
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'email and password are required'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format'
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName: displayName || email.split('@')[0],
      subscriptionTier: 'free',
      preferences: {
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '07:00',
          timezone: 'UTC'
        },
        notificationRules: [],
        dataRetentionDays: 90
      }
    });
    await user.save();

    const token = generateToken(user);

    console.log(`✅ User registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error: any) {
    console.error('❌ Error registering user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'email and password are required'
      });
      return;
    }

    // Find user by email (explicitly select password field since it's excluded by default)
    const user = await User.findOneWithPassword(email.toLowerCase());

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
      return;
    }

    // Check if user has a password (not OAuth-only user)
    if (!user.password) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'This account uses OAuth. Please login with Google.'
      });
      return;
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password!);

    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user);

    console.log(`✅ User logged in: ${user.email}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionTier: user.subscriptionTier,
        connectedAccountsCount: user.connectedAccounts?.length ?? 0
      }
    });
  } catch (error: any) {
    console.error('❌ Error logging in:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/auth/set-password
 * Dev-only: Set or update a user's password by email
 */
router.post('/set-password', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'email and password are required'
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password set for user: ${user.email}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error setting password:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to set password',
      details: error.message
    });
  }
});

export default router;
