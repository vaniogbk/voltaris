import type { Locale, Prisma, ProductCondition } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { discountPercent } from '../utils/money.js';

export interface ProductFilters {
  locale: Locale;
  category?: string; // slug canonique OU slug localisé
  condition?: ProductCondition[];
  minPriceCents?: number;
  maxPriceCents?: number;
  brand?: string[];
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  search?: string;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'discount';
  page: number;
  perPage: number;
}

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  price_asc: [{ priceCents: 'asc' }],
  price_desc: [{ priceCents: 'desc' }],
  newest: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  relevance: [{ isFeatured: 'desc' }, { stock: 'desc' }, { publishedAt: 'desc' }],
};

export async function listProducts(filters: ProductFilters) {
  const where = await buildWhere(filters);

  // `discount` n'est pas une colonne : on trie en mémoire sur la page demandée
  // après un tri stable en base, ce qui reste correct car le pourcentage de
  // remise est dérivé de deux colonnes indexées.
  const orderBy = SORTS[filters.sort ?? 'relevance'] ?? SORTS.relevance;

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (filters.page - 1) * filters.perPage,
      take: filters.perPage,
      include: productInclude(filters.locale),
    }),
  ]);

  let items = rows.map((p) => serializeProductCard(p, filters.locale));
  if (filters.sort === 'discount') {
    items = items.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
  }

  return {
    items,
    pagination: {
      page: filters.page,
      perPage: filters.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.perPage)),
    },
  };
}

async function buildWhere(f: ProductFilters): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = { status: 'PUBLISHED' };

  if (f.category) {
    const category = await prisma.category.findFirst({
      where: {
        OR: [{ slug: f.category }, { translations: { some: { slug: f.category } } }],
      },
      select: { id: true },
    });
    if (!category) throw ApiError.notFound('Catégorie introuvable', 'CATEGORY_NOT_FOUND');
    where.OR = [{ categoryId: category.id }, { category: { parentId: category.id } }];
  }

  if (f.condition?.length) where.condition = { in: f.condition };
  if (f.brand?.length) where.brand = { in: f.brand };
  if (f.featured) where.isFeatured = true;
  if (f.inStock) where.stock = { gt: 0 };

  if (f.minPriceCents != null || f.maxPriceCents != null) {
    where.priceCents = {
      ...(f.minPriceCents != null ? { gte: f.minPriceCents } : {}),
      ...(f.maxPriceCents != null ? { lte: f.maxPriceCents } : {}),
    };
  }

  if (f.onSale) where.compareAtCents = { not: null };

  if (f.search?.trim()) {
    const q = f.search.trim();
    where.AND = [
      {
        OR: [
          { sku: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
          {
            translations: {
              some: {
                locale: f.locale,
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { shortDescription: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      },
    ];
  }

  return where;
}

function productInclude(locale: Locale) {
  return {
    translations: { where: { locale } },
    images: { orderBy: { position: 'asc' as const } },
    category: { include: { translations: { where: { locale } } } },
  };
}

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    translations: true;
    images: true;
    category: { include: { translations: true } };
    specs: true;
  };
}>;

export function serializeProductCard(product: any, locale: Locale) {
  const t = product.translations?.[0];
  const image = product.images?.[0];
  const categoryT = product.category?.translations?.[0];
  const available = product.stock - product.reservedStock;

  return {
    id: product.id,
    sku: product.sku,
    slug: t?.slug ?? product.slug,
    canonicalSlug: product.slug,
    name: t?.name ?? `${product.brand} ${product.model ?? ''}`.trim(),
    shortDescription: t?.shortDescription ?? null,
    brand: product.brand,
    model: product.model,
    condition: product.condition,
    conditionGrade: product.conditionGrade,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
    discountPercent: discountPercent(product.priceCents, product.compareAtCents),
    currency: product.currency,
    vatMode: product.vatMode,
    vatRateBps: product.vatRateBps,
    stock: available,
    inStock: available > 0,
    isUnique: product.isUnique,
    isFeatured: product.isFeatured,
    weightGrams: product.weightGrams,
    image: image
      ? { url: image.url, alt: (locale === 'de' ? image.altDe : image.altFr) ?? t?.name ?? '' }
      : null,
    category: categoryT
      ? { slug: categoryT.slug, canonicalSlug: product.category.slug, name: categoryT.name }
      : null,
  };
}

export function serializeProductDetail(product: ProductWithRelations, locale: Locale) {
  const t = product.translations[0];
  return {
    ...serializeProductCard(product, locale),
    description: t?.description ?? null,
    conditionNote: t?.conditionNote ?? null,
    metaTitle: t?.metaTitle ?? null,
    metaDescription: t?.metaDescription ?? null,
    images: product.images.map((img) => ({
      url: img.url,
      alt: (locale === 'de' ? img.altDe : img.altFr) ?? t?.name ?? '',
      width: img.width,
      height: img.height,
    })),
    specs: product.specs
      .filter((s) => s.locale === locale)
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ label: s.label, value: s.value })),
  };
}

export async function getProductBySlug(slug: string, locale: Locale) {
  const product = await prisma.product.findFirst({
    where: {
      status: 'PUBLISHED',
      OR: [{ slug }, { translations: { some: { slug } } }],
    },
    include: {
      translations: true,
      images: { orderBy: { position: 'asc' } },
      specs: true,
      category: { include: { translations: true } },
    },
  });

  if (!product) throw ApiError.notFound('Produit introuvable', 'PRODUCT_NOT_FOUND');

  // On restreint les traductions à la locale demandée après coup : la requête
  // doit chercher le slug dans toutes les langues pour gérer les redirections.
  const scoped = {
    ...product,
    translations: product.translations.filter((tr) => tr.locale === locale),
    category: {
      ...product.category,
      translations: product.category.translations.filter((tr) => tr.locale === locale),
    },
  } as ProductWithRelations;

  const alternates = Object.fromEntries(
    product.translations.map((tr) => [tr.locale, tr.slug]),
  ) as Record<Locale, string>;

  return { product: serializeProductDetail(scoped, locale), alternates };
}

export async function getRelatedProducts(productId: string, locale: Locale, limit = 4) {
  const base = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true, condition: true },
  });
  if (!base) return [];

  const rows = await prisma.product.findMany({
    where: { status: 'PUBLISHED', categoryId: base.categoryId, id: { not: productId } },
    orderBy: [{ isFeatured: 'desc' }, { stock: 'desc' }],
    take: limit,
    include: productInclude(locale),
  });

  return rows.map((p) => serializeProductCard(p, locale));
}

export async function listCategories(locale: Locale) {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { position: 'asc' },
    include: {
      translations: { where: { locale } },
      children: {
        orderBy: { position: 'asc' },
        include: { translations: { where: { locale } }, _count: { select: { products: true } } },
      },
      _count: { select: { products: true } },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    canonicalSlug: c.slug,
    slug: c.translations[0]?.slug ?? c.slug,
    name: c.translations[0]?.name ?? c.slug,
    description: c.translations[0]?.description ?? null,
    icon: c.icon,
    productCount: c._count.products,
    children: c.children.map((child) => ({
      id: child.id,
      canonicalSlug: child.slug,
      slug: child.translations[0]?.slug ?? child.slug,
      name: child.translations[0]?.name ?? child.slug,
      productCount: child._count.products,
    })),
  }));
}

/** Bornes et valeurs disponibles pour alimenter les filtres de la page catalogue. */
export async function getFilterFacets(locale: Locale, category?: string) {
  const where: Prisma.ProductWhereInput = { status: 'PUBLISHED' };
  if (category) {
    const cat = await prisma.category.findFirst({
      where: { OR: [{ slug: category }, { translations: { some: { slug: category } } }] },
      select: { id: true },
    });
    if (cat) where.OR = [{ categoryId: cat.id }, { category: { parentId: cat.id } }];
  }

  const [agg, brands, conditions] = await Promise.all([
    prisma.product.aggregate({ where, _min: { priceCents: true }, _max: { priceCents: true } }),
    prisma.product.groupBy({ by: ['brand'], where, _count: { _all: true }, orderBy: { brand: 'asc' } }),
    prisma.product.groupBy({ by: ['condition'], where, _count: { _all: true } }),
  ]);

  return {
    price: { minCents: agg._min.priceCents ?? 0, maxCents: agg._max.priceCents ?? 0 },
    brands: brands.map((b) => ({ value: b.brand, count: b._count._all })),
    conditions: conditions.map((c) => ({ value: c.condition, count: c._count._all })),
    locale,
  };
}

/** Toutes les URL publiques du catalogue, pour le sitemap. */
export async function getSitemapEntries() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { updatedAt: true, translations: { select: { locale: true, slug: true } } },
    }),
    prisma.category.findMany({
      select: { updatedAt: true, translations: { select: { locale: true, slug: true } } },
    }),
  ]);

  return {
    products: products.map((p) => ({
      updatedAt: p.updatedAt,
      slugs: Object.fromEntries(p.translations.map((t) => [t.locale, t.slug])),
    })),
    categories: categories.map((c) => ({
      updatedAt: c.updatedAt,
      slugs: Object.fromEntries(c.translations.map((t) => [t.locale, t.slug])),
    })),
  };
}
