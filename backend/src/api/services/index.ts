import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { serviceHealthService } from '../../services/service_health_service';

/**
 * Services Routes
 * Tasks: T011-T012 - Services health endpoint
 * Feature: 002-intelligent-message-analysis
 */

const router = Router();

/**
 * GET /api/v1/services/health
 * Get health status of all services (Backend API, Ollama AI)
 * T011 - Create health endpoint
 * T012 - Auto-refresh logic (handled client-side with 30s interval)
 */
router.get('/health', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const servicesHealth = await serviceHealthService.getServicesHealth();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      services: servicesHealth
    });
  } catch (error: any) {
    console.error('❌ Error fetching services health:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch services health',
      details: error.message
    });
  }
});

export default router;
