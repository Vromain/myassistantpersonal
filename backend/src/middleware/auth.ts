import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user';

/**
 * JWT Authentication Middleware
 * Task: T014 - Implement JWT authentication middleware
 * Reference: specs/001-ai-communication-hub/plan.md
 *
 * Validates JWT tokens and attaches user to request object
 */

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Main authentication middleware
 * Validates JWT token from Authorization header
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No authorization header provided'
      });
      return;
    }

    // Validate Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Invalid token format',
        message: 'Authorization header must be in format: Bearer <token>'
      });
      return;
    }

    const token = parts[1];

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured in environment');
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication service not properly configured'
      });
      return;
    }

    // Decode and verify token
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Fetch user from database
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error: any) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token is malformed or invalid'
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.',
        expiredAt: error.expiredAt
      });
      return;
    }

    // Generic error
    console.error('❌ Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional authentication middleware
 * Does not require authentication but attaches user if token is present
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    const token = parts[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      next();
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Generate JWT token for user
 * Used during login/registration
 */
export const generateToken = (user: IUser, expiresIn: string = '7d'): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email
  };

  // @ts-ignore - JWT types mismatch
  return jwt.sign(payload, jwtSecret, {
    expiresIn,
    issuer: 'ai-communication-hub',
    audience: 'api'
  });
};

/**
 * Verify and decode token without database lookup
 * Useful for quick token validation
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return null;
    }

    return jwt.verify(token, jwtSecret) as JWTPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Middleware to check subscription tier
 * Usage: checkSubscription('premium')
 */
export const checkSubscription = (requiredTier: 'free' | 'premium') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'This endpoint requires authentication'
      });
      return;
    }

    if (requiredTier === 'premium' && req.user.subscriptionTier !== 'premium') {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: 'This feature requires a premium subscription',
        currentTier: req.user.subscriptionTier,
        requiredTier: 'premium'
      });
      return;
    }

    next();
  };
};

/**
 * Refresh token generation
 * Longer expiry for refresh tokens
 */
export const generateRefreshToken = (user: IUser): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: '30d',
    issuer: 'ai-communication-hub',
    audience: 'refresh'
  });
};
