import 'reflect-metadata';
import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';
import { db } from './db/connection';
import { configureGmailStrategy } from './services/auth/gmail_strategy';
import { ollamaClient } from './services/ollama_client';
// Removed Mongo-dependent schedulers and seeding during MySQL migration
import apiRoutes from './api';
import { syncScheduler } from './services/sync_scheduler';
import { emailProcessingCron } from './services/email_processing_cron';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());

// CORS configuration - allow all origins in development
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN?.split(',') || 'http://localhost:8080')
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Session support for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'change-this-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});
app.use('/api/', limiter);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'AI-Powered Communication Hub API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/v1',
      gmailAuth: '/api/v1/auth/gmail'
    },
    documentation: 'See /api/v1 for full endpoint list'
  });
});

// Health check endpoint
// Task: T081 - Enhanced with AI service status
app.get('/health', (_req: Request, res: Response) => {
  const aiStatus = ollamaClient.getStatus();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      database: db.isReady() ? 'connected' : 'disconnected',
      ai: {
        available: aiStatus.available,
        degradedMode: aiStatus.degradedMode,
        endpoint: aiStatus.endpoint,
        model: aiStatus.model,
        failureCount: aiStatus.failureCount,
        lastCheck: aiStatus.lastCheck
      }
    }
  });
});

// API info endpoint
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    message: 'AI-Powered Communication Hub API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      messages: '/api/v1/messages',
      accounts: '/api/v1/accounts',
      categories: '/api/v1/categories',
      ai: '/api/v1/ai',
      analytics: '/api/v1/analytics'
    }
  });
});

// Mount API routes
app.use('/api/v1', apiRoutes);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('🚀 Starting AI-Powered Communication Hub...\n');

    // Connect to MongoDB (for message storage)
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/commhub';
    console.log(`📦 Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected\n');

    console.log('📦 Connecting to MySQL...');
    await db.connect();
    const dbHealth = await db.healthCheck();
    console.log(`✅ MySQL connected: ${dbHealth.database}\n`);

    // Configure Passport strategies
    console.log('🔐 Configuring OAuth strategies...');
    configureGmailStrategy();
    console.log('✅ OAuth strategies configured\n');

    // Check Ollama availability
    console.log('🤖 Checking Ollama availability...');
    const ollamaHealth = await ollamaClient.healthCheck();
    if (ollamaHealth.available) {
      console.log(`✅ Ollama available (${ollamaHealth.endpoint})`);
      console.log(`   Models: ${ollamaHealth.models?.join(', ') || 'none'}\n`);
    } else {
      console.warn(`⚠️  Ollama not available (${ollamaHealth.endpoint})`);
      console.warn('   AI features will use fallback values\n');
    }

    
    // Start background sync scheduler
    try {
      syncScheduler.start();
      console.log('✅ Sync scheduler started');
    } catch (e) {
      console.warn('⚠️  Failed to start sync scheduler', e);
    }

    // Start email processing cron (AI analysis / auto-reply / auto-delete)
    try {
      emailProcessingCron.start();
      console.log('✅ Email processing cron started');
      // Trigger an immediate processing run for verification
      emailProcessingCron.processAllUsers().then((stats) => {
        console.log('📊 Email processing cron initial run stats:', stats);
      }).catch((err) => {
        console.error('❌ Email processing cron initial run error:', err);
      });
    } catch (e) {
      console.warn('⚠️  Failed to start email processing cron', e);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log('═══════════════════════════════════════════════');
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('═══════════════════════════════════════════════');
      console.log(`🔗 Health check:  http://localhost:${PORT}/health`);
      console.log(`📖 API Info:      http://localhost:${PORT}/api/v1`);
      console.log(`🔐 Gmail Auth:    http://localhost:${PORT}/api/v1/auth/gmail`);
      console.log('═══════════════════════════════════════════════\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  await db.disconnect();
  console.log('✅ Shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Shutting down gracefully...');
  await db.disconnect();
  console.log('✅ Shutdown complete');
  process.exit(0);
});

// Start the server
startServer();

export default app;
