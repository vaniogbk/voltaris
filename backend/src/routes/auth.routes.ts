import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as auth from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../lib/errors.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Trop de tentatives, réessayez dans 15 minutes.' } },
});

const password = z
  .string()
  .min(10, 'Le mot de passe doit contenir au moins 10 caractères')
  .max(200)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v), {
    message: 'Le mot de passe doit contenir une minuscule, une majuscule et un chiffre',
  });

/**
 * La boutique ne crée plus de compte client : les acheteurs commandent en
 * invité et suivent leur commande par numéro et e-mail. Il n'existe donc plus
 * d'inscription publique — les comptes de l'équipe sont créés depuis le
 * back-office (POST /api/admin/customers/staff) ou par le seed.
 */

const REFRESH_COOKIE = 'refresh_token';
/**
 * Témoin lisible par le navigateur, sans aucune donnée sensible : il indique
 * seulement qu'une session existe. Le cookie de rafraîchissement étant
 * httpOnly, le frontend ne peut pas le voir — sans ce témoin il interrogerait
 * l'API à chaque visite anonyme pour se faire répondre 401.
 */
const SESSION_HINT_COOKIE = 'sm_session';

function refreshCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? ('none' as const) : ('lax' as const),
    path: '/api/auth',
    expires: expiresAt,
  };
}

function sessionHintOptions(expiresAt: Date) {
  return {
    httpOnly: false,
    secure: env.isProd,
    sameSite: env.isProd ? ('none' as const) : ('lax' as const),
    path: '/',
    expires: expiresAt,
  };
}

/** Pose les deux cookies de session en un seul geste. */
function setSessionCookies(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions(expiresAt));
  res.cookie(SESSION_HINT_COOKIE, '1', sessionHintOptions(expiresAt));
}

function clearSessionCookies(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.clearCookie(SESSION_HINT_COOKIE, { path: '/' });
}

function meta(req: { headers: Record<string, unknown>; ip?: string }) {
  return { userAgent: String(req.headers['user-agent'] ?? ''), ip: req.ip };
}

authRouter.post(
  '/login',
  loginLimiter,
  validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const session = await auth.login(req.body.email, req.body.password, meta(req));
    setSessionCookies(res, session.refreshToken, session.refreshExpiresAt);
    res.json({ user: session.user, accessToken: session.accessToken });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    if (!token) throw ApiError.unauthorized('Aucun jeton de rafraîchissement', 'NO_REFRESH_TOKEN');

    const session = await auth.refresh(token, meta(req));
    setSessionCookies(res, session.refreshToken, session.refreshExpiresAt);
    res.json({ user: session.user, accessToken: session.accessToken });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await auth.logout(req.cookies?.[REFRESH_COOKIE]);
    clearSessionCookies(res);
    res.status(204).end();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
    if (!user) throw ApiError.notFound('Compte introuvable');
    res.json({ user: auth.toPublicUser(user) });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  validate(
    z.object({
      firstName: z.string().min(1).max(80).optional(),
      lastName: z.string().min(1).max(80).optional(),
      phone: z.string().max(30).nullable().optional(),
      company: z.string().max(120).nullable().optional(),
      locale: z.enum(['fr', 'de']).optional(),
      country: z.enum(['FR', 'DE']).optional(),
      marketingOptIn: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.auth!.sub }, data: req.body });
    res.json({ user: auth.toPublicUser(user) });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  validate(z.object({ currentPassword: z.string().min(1), newPassword: password })),
  asyncHandler(async (req, res) => {
    await auth.changePassword(req.auth!.sub, req.body.currentPassword, req.body.newPassword);
    clearSessionCookies(res);
    res.status(204).end();
  }),
);
