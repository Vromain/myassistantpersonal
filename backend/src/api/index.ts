/**
 * API Routes Index
 * Central export point for all API routes
 */

import { Router } from 'express';
import gmailAuthRoutes from './auth/gmail';
import localAuthRoutes from './auth/local';
import messagesRoutes from './messages';
import categoriesRoutes from './categories';
import analyticsRoutes from './analytics';
import syncRoutes from './sync';
import offlineRoutes from './offline';
import notificationsRoutes from './notifications';
import accountsRoutes from './accounts';
import servicesRoutes from './services';

const router = Router();

// Mount auth routes
router.use('/auth', gmailAuthRoutes);
router.use('/auth', localAuthRoutes);

// Mount accounts routes
router.use('/accounts', accountsRoutes);

// Mount messages routes
router.use('/messages', messagesRoutes);

// Mount categories routes
router.use('/categories', categoriesRoutes);

// Mount analytics routes
router.use('/analytics', analyticsRoutes);

// Mount sync routes
router.use('/sync', syncRoutes);

// Mount offline queue routes
router.use('/offline', offlineRoutes);

// Mount notifications routes
router.use('/notifications', notificationsRoutes);

// Mount services routes
router.use('/services', servicesRoutes);

export default router;
