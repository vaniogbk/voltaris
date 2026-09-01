import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/validate.js';
import * as catalog from '../services/catalog.service.js';
import { prisma } from '../lib/prisma.js';

export const catalogRouter = Router();

const locale = z.enum(['fr', 'de']).default('fr');

/** Accepte `condition=NEW,USED` aussi bien que `condition=NEW&condition=USED`. */
const csv = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((v) => {
    if (v == null) return undefined;
    if (Array.isArray(v)) return v.flatMap((x) => String(x).split(','));
    return String(v).split(',');
  }, z.array(inner).optional());

const listSchema = z.object({
  locale,
  category: z.string().max(80).optional(),
  condition: csv(z.enum(['NEW', 'USED', 'REFURBISHED'])),
  brand: csv(z.string().max(60)),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: z.coerce.boolean().optional(),
  onSale: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  q: z.string().max(120).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest', 'discount']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(48).default(12),
});

catalogRouter.get(
  '/products',
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listSchema>;
    const result = await catalog.listProducts({
      locale: q.locale,
      category: q.category,
      condition: q.condition,
      brand: q.brand,
      // Les prix arrivent en euros depuis l'UI et sont convertis en centimes ici.
      minPriceCents: q.minPrice != null ? q.minPrice * 100 : undefined,
      maxPriceCents: q.maxPrice != null ? q.maxPrice * 100 : undefined,
      inStock: q.inStock,
      onSale: q.onSale,
      featured: q.featured,
      search: q.q,
      sort: q.sort,
      page: q.page,
      perPage: q.perPage,
    });
    res.json(result);
  }),
);

catalogRouter.get(
  '/products/:slug',
  validate(z.object({ locale }), 'query'),
  asyncHandler(async (req, res) => {
    const { locale: loc } = req.query as unknown as { locale: 'fr' | 'de' };
    const { product, alternates } = await catalog.getProductBySlug(req.params.slug, loc);
    const related = await catalog.getRelatedProducts(product.id, loc);
    res.json({ product, alternates, related });
  }),
);

catalogRouter.get(
  '/categories',
  validate(z.object({ locale }), 'query'),
  asyncHandler(async (req, res) => {
    const { locale: loc } = req.query as unknown as { locale: 'fr' | 'de' };
    res.json({ categories: await catalog.listCategories(loc) });
  }),
);

catalogRouter.get(
  '/facets',
  validate(z.object({ locale, category: z.string().max(80).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const { locale: loc, category } = req.query as unknown as {
      locale: 'fr' | 'de';
      category?: string;
    };
    res.json(await catalog.getFilterFacets(loc, category));
  }),
);

/**
 * Flux produit destiné à Google Merchant Center (et à tout comparateur).
 *
 * Renvoie tout le catalogue publié en une fois, avec les attributs exigés :
 * état, disponibilité, prix, marque, poids d'expédition, catégorie. Le
 * frontend l'enveloppe au format RSS attendu par Merchant Center.
 */
catalogRouter.get(
  '/feed',
  validate(z.object({ locale }), 'query'),
  asyncHandler(async (req, res) => {
    const { locale: loc } = req.query as unknown as { locale: 'fr' | 'de' };

    const products = await prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { sku: 'asc' },
      include: {
        translations: { where: { locale: loc } },
        images: { orderBy: { position: 'asc' } },
        category: { include: { translations: { where: { locale: loc } } } },
      },
    });

    res.json({
      items: products.map((p) => {
        const t = p.translations[0];
        const available = p.stock - p.reservedStock;

        return {
          sku: p.sku,
          slug: t?.slug ?? p.slug,
          name: t?.name ?? p.sku,
          // Merchant Center refuse les descriptions vides et tronque au-delà
          // de 5 000 caractères ; le résumé court est le repli.
          description: t?.shortDescription ?? t?.description ?? p.sku,
          brand: p.brand,
          model: p.model,
          condition: p.condition,
          priceCents: p.priceCents,
          compareAtCents: p.compareAtCents,
          currency: p.currency,
          available,
          inStock: available > 0,
          isUnique: p.isUnique,
          weightGrams: p.weightGrams,
          images: p.images.map((img) => img.url),
          category: p.category.translations[0]?.name ?? p.category.slug,
          updatedAt: p.updatedAt,
        };
      }),
    });
  }),
);

/** Alimente app/sitemap.ts côté Next.js. */
catalogRouter.get(
  '/sitemap',
  asyncHandler(async (_req, res) => {
    res.json(await catalog.getSitemapEntries());
  }),
);

/**
 * Alterne les photos entre machines plutôt que de les prendre dans l'ordre :
 * sans cela la bande afficherait huit clichés de la même tronçonneuse avant
 * de passer à la suivante.
 */
function pickAcrossProducts<T extends { productId: string }>(images: T[], perProduct: number): T[] {
  const byProduct = new Map<string, T[]>();
  for (const image of images) {
    const list = byProduct.get(image.productId) ?? [];
    if (list.length < perProduct) list.push(image);
    byProduct.set(image.productId, list);
  }

  const groups = [...byProduct.values()];
  const result: T[] = [];
  for (let i = 0; i < perProduct; i++) {
    for (const group of groups) if (group[i]) result.push(group[i]);
  }
  return result;
}

/**
 * Mise en avant de la page d'accueil.
 *
 * Volontairement restreinte : les occasions en stock, puis une sélection de
 * neuf. La page d'accueil n'a pas vocation à présenter le catalogue entier —
 * c'est le rôle de /catalogue, qui offre filtres et pagination.
 */
catalogRouter.get(
  '/home',
  validate(z.object({ locale }), 'query'),
  asyncHandler(async (req, res) => {
    const { locale: loc } = req.query as unknown as { locale: 'fr' | 'de' };

    const cardInclude = {
      translations: { where: { locale: loc } },
      images: { orderBy: { position: 'asc' as const }, take: 1 },
      category: { include: { translations: { where: { locale: loc } } } },
    };

    const [deals, featured, categories, heroPhotos] = await Promise.all([
      // Toutes les occasions encore disponibles : elles sont peu nombreuses
      // et constituent l'argument de la boutique.
      prisma.product.findMany({
        where: { status: 'PUBLISHED', condition: { in: ['USED', 'REFURBISHED'] }, stock: { gt: 0 } },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        take: 6,
        include: cardInclude,
      }),
      // Une sélection de neuf, pas le catalogue : huit références marquées
      // « en avant », de la plus chère à la moins chère.
      prisma.product.findMany({
        where: { status: 'PUBLISHED', condition: 'NEW', isFeatured: true },
        orderBy: { priceCents: 'desc' },
        take: 8,
        include: cardInclude,
      }),
      catalog.listCategories(loc),
      // Photos des occasions, pour la bande animée de la page d'accueil.
      // Plusieurs clichés par machine : trois images tourneraient trop vite
      // sur un défilement continu.
      prisma.productImage.findMany({
        where: {
          product: {
            status: 'PUBLISHED',
            condition: { in: ['USED', 'REFURBISHED'] },
          },
          // Les visuels générés du catalogue neuf n'ont rien à faire ici.
          url: { not: { startsWith: '/produits/neuf/' } },
        },
        orderBy: [{ productId: 'asc' }, { position: 'asc' }],
        take: 40,
        select: { url: true, altFr: true, altDe: true, productId: true },
      }),
    ]);

    res.json({
      deals: deals.map((p) => catalog.serializeProductCard(p, loc)),
      featured: featured.map((p) => catalog.serializeProductCard(p, loc)),
      categories,
      heroImages: pickAcrossProducts(heroPhotos, 4).map((img) => ({
        url: img.url,
        alt: (loc === 'de' ? img.altDe : img.altFr) ?? '',
      })),
    });
  }),
);
