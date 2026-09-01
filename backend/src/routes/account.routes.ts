import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as orderService from '../services/order.service.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';

export const accountRouter = Router();

accountRouter.use(requireAuth);

// ------------------------------------------------------------ commandes

accountRouter.get(
  '/orders',
  validate(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).max(50).default(10),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { page, perPage } = req.query as unknown as { page: number; perPage: number };
    res.json(await orderService.listCustomerOrders(req.auth!.sub, page, perPage));
  }),
);

accountRouter.get(
  '/orders/:orderNumber',
  asyncHandler(async (req, res) => {
    const order = await orderService.getOrderForCustomer(req.params.orderNumber, req.auth!.sub);
    res.json({ order });
  }),
);

/** Suivi de livraison consolidé pour l'espace client. */
accountRouter.get(
  '/orders/:orderNumber/tracking',
  asyncHandler(async (req, res) => {
    const order = await orderService.getOrderForCustomer(req.params.orderNumber, req.auth!.sub);
    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      shipments: order.shipments.map((s) => ({
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl,
        status: s.status,
        shippedAt: s.shippedAt,
        estimatedAt: s.estimatedAt,
        deliveredAt: s.deliveredAt,
      })),
    });
  }),
);

// ------------------------------------------------------------ adresses

const addressSchema = z.object({
  type: z.enum(['SHIPPING', 'BILLING']).default('SHIPPING'),
  isDefault: z.boolean().default(false),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  company: z.string().max(120).optional(),
  line1: z.string().min(1).max(160),
  line2: z.string().max(160).optional(),
  postalCode: z.string().min(4).max(12),
  city: z.string().min(1).max(80),
  country: z.enum(['FR', 'DE']),
  phone: z.string().max(30).optional(),
});

accountRouter.get(
  '/addresses',
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.auth!.sub },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ addresses });
  }),
);

accountRouter.post(
  '/addresses',
  validate(addressSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof addressSchema>;
    const address = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({
          where: { userId: req.auth!.sub, type: body.type },
          data: { isDefault: false },
        });
      }
      return tx.address.create({ data: { ...body, userId: req.auth!.sub } });
    });
    res.status(201).json({ address });
  }),
);

accountRouter.patch(
  '/addresses/:id',
  validate(addressSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.auth!.sub) throw ApiError.notFound('Adresse introuvable');

    const address = await prisma.address.update({ where: { id: req.params.id }, data: req.body });
    res.json({ address });
  }),
);

accountRouter.delete(
  '/addresses/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.auth!.sub) throw ApiError.notFound('Adresse introuvable');

    await prisma.address.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
