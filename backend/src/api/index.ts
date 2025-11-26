/**
 * API Routes Index
 * Central export point for all API routes
 */

import { Router } from 'express';
import gmailAuthRoutes from './auth/gmail';
import usersRoutes from './users';

const router = Router();

// Mount auth routes
router.use('/auth', gmailAuthRoutes);
router.use('/users', usersRoutes);
// Local auth temporarily disabled during MySQL migration

export default router;
