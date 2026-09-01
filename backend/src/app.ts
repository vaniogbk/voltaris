import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { checkoutRouter } from './routes/checkout.routes.js';
import { accountRouter } from './routes/account.routes.js';
import { contactRouter } from './routes/contact.routes.js';
import { webhookRouter } from './routes/webhooks.routes.js';
import { adminRouter } from './routes/admin/index.js';

export function createApp() {
  const app = express();

  // Railway et Vercel placent l'API derrière un proxy : req.ip et les cookies
  // secure dépendent de cette confiance.
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  app.use(
    cors({
      origin(origin, callback) {
        // Les appels serveur à serveur (SSR Next.js, curl) n'ont pas d'Origin.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origine non autorisée : ${origin}`));
      },
      credentials: true,
    }),
  );

  // Le webhook Stripe est monté AVANT le parser JSON : sa signature est
  // calculée sur le corps brut.
  app.use('/api/webhooks', webhookRouter);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'up', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
