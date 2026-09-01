import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Locale, Role, User } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';

const BCRYPT_ROUNDS = 12;

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  company: string | null;
  role: Role;
  locale: Locale;
  country: string;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  const { id, email, firstName, lastName, phone, company, role, locale, country, createdAt } = user;
  return { id, email, firstName, lastName, phone, company, role, locale, country, createdAt };
}

function signAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);
}

/** Le refresh token est opaque côté client ; seul son hash SHA-256 est stocké. */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId: string, userAgent?: string, ip?: string) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent, ip },
  });
  return { token, expiresAt };
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  locale?: Locale;
  country?: string;
  marketingOptIn?: boolean;
}

export async function register(input: RegisterInput, meta: { userAgent?: string; ip?: string }) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict('Un compte existe déjà avec cette adresse e-mail.', 'EMAIL_TAKEN');
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim(),
      company: input.company?.trim(),
      locale: input.locale ?? 'fr',
      country: (input.country ?? 'FR').toUpperCase(),
      marketingOptIn: input.marketingOptIn ?? false,
    },
  });

  return buildSession(user, meta);
}

export async function login(
  email: string,
  password: string,
  meta: { userAgent?: string; ip?: string },
) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Comparaison systématique même si l'utilisateur n'existe pas : le temps de
  // réponse ne doit pas révéler l'existence d'un compte.
  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    throw ApiError.unauthorized('E-mail ou mot de passe incorrect.', 'INVALID_CREDENTIALS');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return buildSession(user, meta);
}

async function buildSession(user: User, meta: { userAgent?: string; ip?: string }) {
  const refresh = await issueRefreshToken(user.id, meta.userAgent, meta.ip);
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken(user),
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
  };
}

/** Rotation : l'ancien jeton est révoqué et un nouveau est émis à chaque usage. */
export async function refresh(token: string, meta: { userAgent?: string; ip?: string }) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session expirée, veuillez vous reconnecter.', 'REFRESH_INVALID');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return buildSession(stored.user, meta);
}

export async function logout(token: string | undefined) {
  if (!token) return;
  await prisma.refreshToken
    .updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}

export async function logoutAll(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Compte introuvable');

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest('Mot de passe actuel incorrect.', 'INVALID_PASSWORD');

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
  });

  // Toutes les autres sessions sont invalidées après un changement de mot de passe.
  await logoutAll(userId);
}

export const _internals = { hashToken, BCRYPT_ROUNDS };
