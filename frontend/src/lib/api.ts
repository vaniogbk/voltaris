import type { Locale } from './routes';

/**
 * URL de l'API.
 * `API_URL` est utilisée côté serveur (rendu RSC), `NEXT_PUBLIC_API_URL` côté
 * navigateur. Sur Railway, les deux peuvent différer : le serveur peut joindre
 * l'API par son URL interne, plus rapide et non exposée.
 */
const SERVER_API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const BROWSER_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const apiBase = () => (typeof window === 'undefined' ? SERVER_API : BROWSER_API);

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  accessToken?: string;
  /** Durée de cache ISR côté serveur, en secondes. 0 = pas de cache. */
  revalidate?: number;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, accessToken, revalidate, headers, ...rest } = options;

  const response = await fetch(`${apiBase()}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    credentials: 'include',
    ...(revalidate !== undefined ? { next: { revalidate } } : {}),
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const err = payload?.error ?? {};
    throw new ApiError(
      response.status,
      err.code ?? 'UNKNOWN',
      err.message ?? `Erreur ${response.status}`,
      err.details,
    );
  }

  return payload as T;
}

// ------------------------------------------------------------------ types

export type ProductCondition = 'NEW' | 'USED' | 'REFURBISHED';
export type VatMode = 'STANDARD' | 'MARGIN';

export interface ProductCard {
  id: string;
  sku: string;
  slug: string;
  canonicalSlug: string;
  name: string;
  shortDescription: string | null;
  brand: string;
  model: string | null;
  condition: ProductCondition;
  conditionGrade: number | null;
  priceCents: number;
  compareAtCents: number | null;
  discountPercent: number | null;
  currency: string;
  vatMode: VatMode;
  vatRateBps: number;
  stock: number;
  inStock: boolean;
  isUnique: boolean;
  isFeatured: boolean;
  weightGrams: number;
  image: { url: string; alt: string } | null;
  category: { slug: string; canonicalSlug: string; name: string } | null;
}

export interface ProductDetail extends ProductCard {
  description: string | null;
  conditionNote: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  images: Array<{ url: string; alt: string; width: number | null; height: number | null }>;
  specs: Array<{ label: string; value: string }>;
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface Category {
  id: string;
  canonicalSlug: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  productCount: number;
  children: Array<{
    id: string;
    canonicalSlug: string;
    slug: string;
    name: string;
    productCount: number;
  }>;
}

export interface Facets {
  price: { minCents: number; maxCents: number };
  brands: Array<{ value: string; count: number }>;
  conditions: Array<{ value: ProductCondition; count: number }>;
}

export interface ShippingQuote {
  carrier: string;
  name: string;
  priceCents: number;
  etaMinDays: number;
  etaMaxDays: number;
  free: boolean;
}

export interface CartQuote {
  lines: Array<{
    productId: string;
    sku: string;
    name: string;
    condition: ProductCondition;
    vatMode: VatMode;
    unitPriceCents: number;
    quantity: number;
    totalCents: number;
    imageUrl: string | null;
  }>;
  subtotalCents: number;
  shipping: ShippingQuote;
  vatCents: number;
  totalCents: number;
  totalWeightGrams: number;
}

export interface BankTransferInstructions {
  holder: string;
  iban: string;
  bic: string;
  bankName: string;
  amountCents: number;
  currency: string;
  reference: string;
  dueAt: string | null;
  /** Code QR SEPA (EPC069-12) au format SVG, généré par l'API. */
  qrCodeSvg: string | null;
}

export interface OrderSummary {
  orderNumber: string;
  invoiceNumber: string | null;
  paidAt: string | null;
  status: string;
  paymentMethod: 'CARD' | 'BANK_TRANSFER';
  paymentStatus: string;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  vatCents: number;
  email: string;
  country: string;
  locale: string;
  createdAt: string;
  shippingAddress: Record<string, string>;
  billingAddress: Record<string, string>;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  company: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  locale: Locale;
  country: string;
  createdAt: string;
}

// ------------------------------------------------------------ catalogue

export interface CatalogQuery {
  locale: Locale;
  category?: string;
  condition?: string[];
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  q?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

export function buildCatalogSearch(query: CatalogQuery): string {
  const params = new URLSearchParams();
  params.set('locale', query.locale);
  if (query.category) params.set('category', query.category);
  if (query.condition?.length) params.set('condition', query.condition.join(','));
  if (query.brand?.length) params.set('brand', query.brand.join(','));
  if (query.minPrice != null) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
  if (query.inStock) params.set('inStock', 'true');
  if (query.onSale) params.set('onSale', 'true');
  if (query.q) params.set('q', query.q);
  if (query.sort) params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page));
  if (query.perPage) params.set('perPage', String(query.perPage));
  return params.toString();
}

export const catalog = {
  products: (query: CatalogQuery) =>
    apiFetch<{ items: ProductCard[]; pagination: Pagination }>(
      `/api/catalog/products?${buildCatalogSearch(query)}`,
      { revalidate: 60 },
    ),

  product: (slug: string, locale: Locale) =>
    apiFetch<{
      product: ProductDetail;
      alternates: Partial<Record<Locale, string>>;
      related: ProductCard[];
    }>(`/api/catalog/products/${encodeURIComponent(slug)}?locale=${locale}`, { revalidate: 60 }),

  categories: (locale: Locale) =>
    apiFetch<{ categories: Category[] }>(`/api/catalog/categories?locale=${locale}`, {
      revalidate: 300,
    }),

  facets: (locale: Locale, category?: string) =>
    apiFetch<Facets>(
      `/api/catalog/facets?locale=${locale}${category ? `&category=${encodeURIComponent(category)}` : ''}`,
      { revalidate: 300 },
    ),

  home: (locale: Locale) =>
    apiFetch<{
      deals: ProductCard[];
      featured: ProductCard[];
      categories: Category[];
      heroImages: Array<{ url: string; alt: string }>;
    }>(
      `/api/catalog/home?locale=${locale}`,
      { revalidate: 60 },
    ),

  sitemap: () =>
    apiFetch<{
      products: Array<{ updatedAt: string; slugs: Record<string, string> }>;
      categories: Array<{ updatedAt: string; slugs: Record<string, string> }>;
    }>('/api/catalog/sitemap', { revalidate: 3600 }),
};
