import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { ApiError } from '../lib/errors.js';

export interface AuthPayload {
  sub: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.access_token;
  return cookie ?? null;
}

/** Renseigne req.auth si un jeton valide est présent, sans jamais bloquer. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next();
  try {
    req.auth = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
  } catch {
    /* jeton invalide ou expiré : on continue en visiteur anonyme */
  }
  next();
}

/** Exige un jeton d'accès valide. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    req.auth = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    return next();
  } catch (err) {
    const expired = err instanceof jwt.TokenExpiredError;
    return next(
      ApiError.unauthorized(
        expired ? 'Session expirée' : 'Jeton invalide',
        expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      ),
    );
  }
}

/** Exige un rôle parmi la liste fournie. À chaîner après requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(ApiError.unauthorized());
    if (!roles.includes(req.auth.role)) return next(ApiError.forbidden());
    next();
  };
}

export const requireAdmin = [requireAuth, requireRole('ADMIN', 'STAFF')];
