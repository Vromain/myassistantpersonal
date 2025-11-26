import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    subscriptionTier: user.subscriptionTier,
    preferences: user.preferences,
    connectedAccountIds: (user.connectedAccounts || []).map((acc: any) => acc.id?.toString?.() || acc?.toString?.() || ''),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

export default router;
