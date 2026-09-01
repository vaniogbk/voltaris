import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { formatIssues } from './validate.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route inconnue : ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const { status, code, message, details } = normalize(err);

  if (status >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, 'Erreur serveur');
  } else {
    logger.debug({ code, path: req.originalUrl }, message);
  }

  res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.isProd || status < 500 ? {} : { stack: (err as Error)?.stack }),
    },
  });
}

function normalize(err: unknown): {
  status: number;
  code: string;
  message: string;
  details?: unknown;
} {
  if (err instanceof ApiError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Données invalides',
      details: formatIssues(err),
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'champ';
        return {
          status: 409,
          code: 'DUPLICATE',
          message: `Cette valeur existe déjà (${target}).`,
        };
      }
      case 'P2025':
        return { status: 404, code: 'NOT_FOUND', message: 'Ressource introuvable' };
      case 'P2003':
        return {
          status: 409,
          code: 'FOREIGN_KEY',
          message: 'Référence liée invalide ou encore utilisée.',
        };
      default:
        break;
    }
  }

  return { status: 500, code: 'INTERNAL', message: 'Erreur interne du serveur' };
}
