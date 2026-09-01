import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { asyncHandler, validate } from '../../middleware/validate.js';
import { requireRole } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { toPublicUser, logoutAll } from '../../services/auth.service.js';

export const adminCustomersRouter = Router();

adminCustomersRouter.get(
  '/',
  validate(
    z.object({
      q: z.string().max(120).optional(),
      role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).max(100).default(25),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { q?: string; role?: never; page: number; perPage: number };

    const where = {
      ...(q.role ? { role: q.role } : {}),
      ...(q.q
        ? {
            OR: [
              { email: { contains: q.q, mode: 'insensitive' as const } },
              { firstName: { contains: q.q, mode: 'insensitive' as const } },
              { lastName: { contains: q.q, mode: 'insensitive' as const } },
              { company: { contains: q.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        include: { _count: { select: { orders: true } } },
      }),
    ]);

    // Agrégat du chiffre d'affaires par client, limité aux commandes encaissées.
    const revenue = await prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: rows.map((r) => r.id) }, paymentStatus: 'SUCCEEDED' },
      _sum: { totalCents: true },
    });
    const revenueByUser = new Map(revenue.map((r) => [r.userId, r._sum.totalCents ?? 0]));

    res.json({
      items: rows.map((u) => ({
        ...toPublicUser(u),
        orderCount: u._count.orders,
        lifetimeValueCents: revenueByUser.get(u.id) ?? 0,
        lastLoginAt: u.lastLoginAt,
        marketingOptIn: u.marketingOptIn,
      })),
      pagination: {
        page: q.page,
        perPage: q.perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.perPage)),
      },
    });
  }),
);

adminCustomersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { items: true, shipments: true },
        },
      },
    });
    if (!user) throw ApiError.notFound('Client introuvable');

    res.json({
      customer: toPublicUser(user),
      addresses: user.addresses,
      orders: user.orders,
    });
  }),
);

/**
 * Création d'un compte pour l'équipe.
 *
 * L'inscription publique a été retirée : c'est le seul moyen d'ajouter un
 * accès au back-office, et il est réservé aux administrateurs.
 */
adminCustomersRouter.post(
  '/staff',
  requireRole('ADMIN'),
  validate(
    z.object({
      email: z.string().email(),
      password: z
        .string()
        .min(12, 'Un compte du back-office exige au moins 12 caractères')
        .max(200)
        .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v), {
          message: 'Le mot de passe doit contenir une minuscule, une majuscule et un chiffre',
        }),
      firstName: z.string().min(1).max(80),
      lastName: z.string().min(1).max(80),
      role: z.enum(['STAFF', 'ADMIN']).default('STAFF'),
      locale: z.enum(['fr', 'de']).default('fr'),
    }),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: 'STAFF' | 'ADMIN';
      locale: 'fr' | 'de';
    };

    const email = body.email.toLowerCase().trim();
    if (await prisma.user.findUnique({ where: { email } })) {
      throw ApiError.conflict('Un compte existe déjà avec cette adresse.', 'EMAIL_TAKEN');
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(body.password, 12),
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        role: body.role,
        locale: body.locale,
        emailVerified: true,
      },
    });

    res.status(201).json({ customer: toPublicUser(user) });
  }),
);

/** Le changement de rôle est réservé aux administrateurs, pas au staff. */
adminCustomersRouter.patch(
  '/:id/role',
  requireRole('ADMIN'),
  validate(z.object({ role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']) })),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.auth!.sub) {
      throw ApiError.badRequest('Vous ne pouvez pas modifier votre propre rôle.', 'SELF_ROLE_CHANGE');
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: req.body.role },
    });
    await logoutAll(user.id); // les sessions existantes portent l'ancien rôle
    res.json({ customer: toPublicUser(user) });
  }),
);

/** Déconnexion forcée de toutes les sessions d'un client (support / sécurité). */
adminCustomersRouter.post(
  '/:id/revoke-sessions',
  asyncHandler(async (req, res) => {
    await logoutAll(req.params.id);
    res.status(204).end();
  }),
);
