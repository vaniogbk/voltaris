import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, stripe: env.stripeEnabled ? 'actif' : 'désactivé' },
    'API Stihl Market démarrée',
  );
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Arrêt en cours…');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Filet de sécurité si des connexions restent ouvertes.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Promesse rejetée non gérée');
});
