/**
 * API Routes Index
 * Central export point for all API routes
 */

import { Router } from 'express';
import gmailAuthRoutes from './auth/gmail';

const router = Router();

// Mount auth routes
router.use('/auth', gmailAuthRoutes);
// Local auth temporarily disabled during MySQL migration

export default router;
