import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { slugify } from '../../utils/references.js';
import * as stockService from '../../services/stock.service.js';

export const adminProductsRouter = Router();

const translationSchema = z.object({
  locale: z.enum(['fr', 'de']),
  name: z.string().min(1).max(200),
  slug: z.string().max(120).optional(),
  shortDescription: z.string().max(400).optional(),
  description: z.string().max(20_000).optional(),
  conditionNote: z.string().max(5_000).optional(),
  metaTitle: z.string().max(180).optional(),
  metaDescription: z.string().max(320).optional(),
});

const imageSchema = z.object({
  url: z.string().min(1).max(500),
  altFr: z.string().max(200).optional(),
  altDe: z.string().max(200).optional(),
  position: z.number().int().min(0).default(0),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const specSchema = z.object({
  locale: z.enum(['fr', 'de']),
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(200),
  position: z.number().int().min(0).default(0),
});

const productSchema = z.object({
  sku: z.string().min(1).max(60),
  slug: z.string().max(120).optional(),
  categoryId: z.string().min(1),
  brand: z.string().min(1).max(80),
  model: z.string().max(80).optional(),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED']).default('NEW'),
  conditionGrade: z.number().int().min(1).max(10).nullable().optional(),
  priceCents: z.number().int().min(0),
  compareAtCents: z.number().int().min(0).nullable().optional(),
  vatMode: z.enum(['STANDARD', 'MARGIN']).default('STANDARD'),
  vatRateBps: z.number().int().min(0).max(3000).default(2000),
  stock: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(1),
  weightGrams: z.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  isFeatured: z.boolean().default(false),
  isUnique: z.boolean().default(false),
  translations: z.array(translationSchema).min(1),
  images: z.array(imageSchema).default([]),
  specs: z.array(specSchema).default([]),
});

// ------------------------------------------------------------------ liste

adminProductsRouter.get(
  '/',
  validate(
    z.object({
      q: z.string().max(120).optional(),
      status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
      condition: z.enum(['NEW', 'USED', 'REFURBISHED']).optional(),
      categoryId: z.string().optional(),
      lowStock: z.coerce.boolean().optional(),
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).max(100).default(25),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as {
      q?: string;
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      condition?: 'NEW' | 'USED' | 'REFURBISHED';
      categoryId?: string;
      lowStock?: boolean;
      page: number;
      perPage: number;
    };

    const where = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.condition ? { condition: q.condition } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.q
        ? {
            OR: [
              { sku: { contains: q.q, mode: 'insensitive' as const } },
              { brand: { contains: q.q, mode: 'insensitive' as const } },
              { model: { contains: q.q, mode: 'insensitive' as const } },
              { translations: { some: { name: { contains: q.q, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        include: {
          translations: true,
          images: { orderBy: { position: 'asc' }, take: 1 },
          category: { include: { translations: true } },
        },
      }),
    ]);

    res.json({
      items,
      pagination: {
        page: q.page,
        perPage: q.perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.perPage)),
      },
    });
  }),
);

adminProductsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        translations: true,
        images: { orderBy: { position: 'asc' } },
        specs: true,
        category: { include: { translations: true } },
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!product) throw ApiError.notFound('Produit introuvable');
    res.json({ product });
  }),
);

// ------------------------------------------------------------------ création

adminProductsRouter.post(
  '/',
  validate(productSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof productSchema>;
    const canonicalSlug = body.slug || slugify(`${body.brand}-${body.model ?? body.sku}`);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku: body.sku,
          slug: canonicalSlug,
          categoryId: body.categoryId,
          brand: body.brand,
          model: body.model,
          condition: body.condition,
          conditionGrade: body.conditionGrade ?? null,
          priceCents: body.priceCents,
          compareAtCents: body.compareAtCents ?? null,
          vatMode: body.vatMode,
          vatRateBps: body.vatRateBps,
          stock: 0, // le stock initial passe par un mouvement tracé
          lowStockAlert: body.lowStockAlert,
          weightGrams: body.weightGrams,
          status: body.status,
          isFeatured: body.isFeatured,
          isUnique: body.isUnique,
          publishedAt: body.status === 'PUBLISHED' ? new Date() : null,
          translations: {
            create: body.translations.map((t) => ({
              ...t,
              slug: t.slug || slugify(t.name),
            })),
          },
          images: { create: body.images },
          specs: { create: body.specs },
        },
      });

      if (body.stock > 0) {
        await stockService.applyMovement(tx, {
          productId: created.id,
          delta: body.stock,
          reason: 'INITIAL',
          userId: req.auth!.sub,
          note: 'Stock initial à la création du produit',
        });
      }

      return created;
    });

    res.status(201).json({ product });
  }),
);

// ------------------------------------------------------------------ mise à jour

adminProductsRouter.patch(
  '/:id',
  validate(productSchema.partial().omit({ stock: true })),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<z.infer<typeof productSchema>>;
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Produit introuvable');

    const product = await prisma.$transaction(async (tx) => {
      const { translations, images, specs, ...scalars } = body;

      const updated = await tx.product.update({
        where: { id: req.params.id },
        data: {
          ...scalars,
          publishedAt:
            scalars.status === 'PUBLISHED' && !existing.publishedAt
              ? new Date()
              : existing.publishedAt,
        },
      });

      // Les collections sont remplacées en bloc : l'éditeur du back-office
      // envoie toujours la liste complète.
      if (translations) {
        await tx.productTranslation.deleteMany({ where: { productId: updated.id } });
        await tx.productTranslation.createMany({
          data: translations.map((t) => ({
            productId: updated.id,
            ...t,
            slug: t.slug || slugify(t.name),
          })),
        });
      }
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: updated.id } });
        if (images.length) {
          await tx.productImage.createMany({
            data: images.map((i) => ({ productId: updated.id, ...i })),
          });
        }
      }
      if (specs) {
        await tx.productSpec.deleteMany({ where: { productId: updated.id } });
        if (specs.length) {
          await tx.productSpec.createMany({
            data: specs.map((s) => ({ productId: updated.id, ...s })),
          });
        }
      }

      return updated;
    });

    res.json({ product });
  }),
);

adminProductsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const sold = await prisma.orderItem.count({ where: { productId: req.params.id } });
    if (sold > 0) {
      // On conserve l'historique de vente : archivage plutôt que suppression.
      const product = await prisma.product.update({
        where: { id: req.params.id },
        data: { status: 'ARCHIVED' },
      });
      return res.json({ product, archived: true });
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

// ------------------------------------------------------------------ stocks

adminProductsRouter.post(
  '/:id/stock',
  validate(
    z.union([
      z.object({
        mode: z.literal('adjust'),
        delta: z.number().int(),
        reason: z.enum(['RESTOCK', 'MANUAL_ADJUSTMENT', 'RETURN', 'LOSS']),
        note: z.string().max(300).optional(),
      }),
      z.object({
        mode: z.literal('set'),
        stock: z.number().int().min(0),
        note: z.string().max(300).optional(),
      }),
    ]),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as
      | { mode: 'adjust'; delta: number; reason: 'RESTOCK' | 'MANUAL_ADJUSTMENT' | 'RETURN' | 'LOSS'; note?: string }
      | { mode: 'set'; stock: number; note?: string };

    const stock =
      body.mode === 'adjust'
        ? await stockService.adjust(req.params.id, body.delta, body.reason, req.auth!.sub, body.note)
        : await stockService.setAbsolute(req.params.id, body.stock, req.auth!.sub, body.note);

    res.json({ stock });
  }),
);

adminProductsRouter.get(
  '/:id/stock/movements',
  asyncHandler(async (req, res) => {
    res.json({ movements: await stockService.getMovements(req.params.id) });
  }),
);
