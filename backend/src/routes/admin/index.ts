import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/auth.js';
import { asyncHandler, validate } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { slugify } from '../../utils/references.js';
import * as stockService from '../../services/stock.service.js';
import * as orderService from '../../services/order.service.js';
import { adminProductsRouter } from './products.admin.js';
import { adminOrdersRouter } from './orders.admin.js';
import { adminCustomersRouter } from './customers.admin.js';
import { adminBankRouter } from './bank.admin.js';
import { adminSettingsRouter } from './settings.admin.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.use('/products', adminProductsRouter);
adminRouter.use('/orders', adminOrdersRouter);
adminRouter.use('/customers', adminCustomersRouter);
adminRouter.use('/bank', adminBankRouter);
adminRouter.use('/settings', adminSettingsRouter);

// ------------------------------------------------------------ tableau de bord

adminRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

    const [
      revenueMonth,
      ordersMonth,
      pendingTransfers,
      toShip,
      customers,
      publishedProducts,
      lowStock,
      recentOrders,
      pendingBankEntries,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: 'SUCCEEDED', paidAt: { gte: startOfMonth } },
        _sum: { totalCents: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { paymentStatus: 'AWAITING_TRANSFER' } }),
      prisma.order.count({ where: { status: { in: ['PAID', 'PREPARING'] } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { status: 'PUBLISHED' } }),
      stockService.getLowStock(),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          orderNumber: true,
          email: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          totalCents: true,
          country: true,
          createdAt: true,
        },
      }),
      // Écritures bancaires importées mais non rapprochées : c'est de l'argent
      // reçu dont on ne sait pas encore à quelle commande il correspond.
      prisma.bankStatementEntry.count({
        where: { status: { in: ['UNMATCHED', 'AMOUNT_MISMATCH'] } },
      }),
    ]);

    // Chiffre d'affaires encaissé, agrégé par jour sur 30 jours.
    const daily = await prisma.$queryRaw<Array<{ day: Date; total: bigint; orders: bigint }>>`
      SELECT date_trunc('day', "paidAt") AS day,
             SUM("totalCents")::bigint   AS total,
             COUNT(*)::bigint            AS orders
      FROM "Order"
      WHERE "paymentStatus" = 'SUCCEEDED' AND "paidAt" >= ${thirtyDaysAgo}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    res.json({
      kpis: {
        revenueMonthCents: revenueMonth._sum.totalCents ?? 0,
        ordersMonth,
        pendingTransfers,
        toShip,
        customers,
        publishedProducts,
        pendingBankEntries,
      },
      revenueByDay: daily.map((d) => ({
        day: d.day,
        totalCents: Number(d.total),
        orders: Number(d.orders),
      })),
      lowStock,
      recentOrders,
    });
  }),
);

// ------------------------------------------------------------ catégories

const categorySchema = z.object({
  slug: z.string().max(80).optional(),
  position: z.number().int().min(0).default(0),
  icon: z.string().max(40).optional(),
  parentId: z.string().nullable().optional(),
  translations: z
    .array(
      z.object({
        locale: z.enum(['fr', 'de']),
        name: z.string().min(1).max(120),
        slug: z.string().max(120).optional(),
        description: z.string().max(2000).optional(),
        metaTitle: z.string().max(180).optional(),
        metaDescription: z.string().max(320).optional(),
      }),
    )
    .min(1),
});

adminRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ position: 'asc' }],
      include: { translations: true, _count: { select: { products: true } } },
    });
    res.json({ categories });
  }),
);

adminRouter.post(
  '/categories',
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof categorySchema>;
    const category = await prisma.category.create({
      data: {
        slug: body.slug || slugify(body.translations[0].name),
        position: body.position,
        icon: body.icon,
        parentId: body.parentId ?? null,
        translations: {
          create: body.translations.map((t) => ({ ...t, slug: t.slug || slugify(t.name) })),
        },
      },
      include: { translations: true },
    });
    res.status(201).json({ category });
  }),
);

adminRouter.patch(
  '/categories/:id',
  validate(categorySchema.partial()),
  asyncHandler(async (req, res) => {
    const { translations, ...scalars } = req.body as Partial<z.infer<typeof categorySchema>>;

    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({ where: { id: req.params.id }, data: scalars });
      if (translations) {
        await tx.categoryTranslation.deleteMany({ where: { categoryId: updated.id } });
        await tx.categoryTranslation.createMany({
          data: translations.map((t) => ({
            categoryId: updated.id,
            ...t,
            slug: t.slug || slugify(t.name),
          })),
        });
      }
      return updated;
    });

    res.json({ category });
  }),
);

adminRouter.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const count = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (count > 0) {
      throw ApiError.conflict(
        `Impossible de supprimer : ${count} produit(s) rattaché(s) à cette catégorie.`,
        'CATEGORY_NOT_EMPTY',
      );
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

// ------------------------------------------------------------ livraison

adminRouter.get(
  '/shipping-rates',
  asyncHandler(async (_req, res) => {
    res.json({
      rates: await prisma.shippingRate.findMany({ orderBy: [{ country: 'asc' }, { minWeightG: 'asc' }] }),
    });
  }),
);

const rateSchema = z.object({
  country: z.enum(['FR', 'DE']),
  name: z.string().min(1).max(120),
  carrier: z.enum(['DPD', 'DHL', 'Chronopost', 'GLS', 'Schenker']),
  minWeightG: z.number().int().min(0),
  maxWeightG: z.number().int().min(1),
  priceCents: z.number().int().min(0),
  freeAboveCents: z.number().int().min(0).nullable().optional(),
  etaMinDays: z.number().int().min(1).default(2),
  etaMaxDays: z.number().int().min(1).default(5),
  active: z.boolean().default(true),
});

adminRouter.post(
  '/shipping-rates',
  validate(rateSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ rate: await prisma.shippingRate.create({ data: req.body }) });
  }),
);

adminRouter.patch(
  '/shipping-rates/:id',
  validate(rateSchema.partial()),
  asyncHandler(async (req, res) => {
    res.json({
      rate: await prisma.shippingRate.update({ where: { id: req.params.id }, data: req.body }),
    });
  }),
);

adminRouter.delete(
  '/shipping-rates/:id',
  asyncHandler(async (req, res) => {
    await prisma.shippingRate.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

// ------------------------------------------------------------ maintenance

/** Libère les commandes par virement dont le délai est dépassé. */
adminRouter.post(
  '/maintenance/release-expired-transfers',
  asyncHandler(async (_req, res) => {
    res.json({ released: await orderService.releaseExpiredTransfers() });
  }),
);

adminRouter.get(
  '/stock/low',
  asyncHandler(async (_req, res) => {
    res.json({ items: await stockService.getLowStock() });
  }),
);
