import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { ProductGallery } from '@/components/ProductGallery';
import { AddToCart } from '@/components/AddToCart';
import { ProductCard } from '@/components/ProductCard';
import { RichText } from '@/components/RichText';
import { ApiError, catalog, type ProductDetail } from '@/lib/api';
import { getDictionary, interpolate } from '@/i18n';
import { formatPrice, formatWeight } from '@/lib/format';
import { home, path, type Locale } from '@/lib/routes';

export const revalidate = 60;

interface Params {
  params: { locale: Locale; slug: string };
}

async function load(locale: Locale, slug: string) {
  try {
    return await catalog.product(slug, locale);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await load(params.locale, params.slug);
  if (!data) return { title: 'Introuvable', robots: { index: false, follow: false } };

  const { product, alternates } = data;
  const title = product.metaTitle ?? product.name;
  const description = product.metaDescription ?? product.shortDescription ?? '';

  const languages: Record<string, string> = {};
  for (const [locale, slug] of Object.entries(alternates)) {
    if (slug) languages[locale] = path(locale as Locale, 'product', slug);
  }

  return {
    title,
    description,
    alternates: {
      canonical: path(params.locale, 'product', product.slug),
      languages,
    },
    openGraph: {
      type: 'website',
      title,
      description,
      images: product.images.slice(0, 1).map((img) => ({ url: img.url, alt: img.alt })),
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const locale = params.locale;
  const t = getDictionary(locale);

  const data = await load(locale, params.slug);
  if (!data) notFound();

  const { product, related } = data;
  const isUsed = product.condition !== 'NEW';

  return (
    <div className="container-page py-6 lg:py-10">
      <Breadcrumb locale={locale} product={product} />

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery
          locale={locale}
          images={product.images.length ? product.images : product.image ? [product.image] : []}
          badge={
            <>
              {product.discountPercent != null && (
                <span className="badge-signal">−{product.discountPercent}%</span>
              )}
              {isUsed && <span className="badge-dark">{t.condition[product.condition]}</span>}
              {product.isUnique && <span className="badge-outline">{t.product.uniquePiece}</span>}
            </>
          }
        />

        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-smoke-400">
            {product.brand}
            {product.category ? ` · ${product.category.name}` : ''}
          </p>

          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
            {product.name}
          </h1>

          {product.shortDescription && (
            <p className="mt-4 text-base leading-relaxed text-smoke-600">
              {product.shortDescription}
            </p>
          )}

          {/* ------------------------------------------------------ prix */}
          <div className="mt-7 border-y border-smoke-200 py-6">
            <div className="flex flex-wrap items-end gap-3">
              <span
                className={`text-4xl font-extrabold tabular ${
                  product.discountPercent != null ? 'text-signal' : 'text-ink'
                }`}
              >
                {formatPrice(product.priceCents, locale, product.currency)}
              </span>
              {product.compareAtCents != null && (
                <>
                  <span className="pb-1.5 text-lg text-smoke-400 line-through tabular">
                    {formatPrice(product.compareAtCents, locale, product.currency)}
                  </span>
                  <span className="mb-1.5 rounded-md bg-signal-soft px-2 py-0.5 text-xs font-bold text-signal">
                    {t.product.save}{' '}
                    {formatPrice(
                      product.compareAtCents - product.priceCents,
                      locale,
                      product.currency,
                    )}
                  </span>
                </>
              )}
            </div>

            <p className="mt-2 text-xs text-smoke-500">
              {product.vatMode === 'MARGIN' ? t.product.vatMargin : t.product.vatStandard}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Availability product={product} locale={locale} />
              <span className="text-smoke-400">
                {t.product.reference} <span className="font-medium text-smoke-600">{product.sku}</span>
              </span>
            </div>
          </div>

          <div className="mt-6">
            <AddToCart product={product} locale={locale} />
          </div>

          {/* ------------------------------------------------ réassurance */}
          <ul className="mt-6 space-y-3 rounded-card bg-smoke-50 p-5 text-sm">
            <li className="flex gap-3">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
              <span className="text-smoke-600">
                <strong className="font-semibold text-ink">{t.product.deliveryOnly}</strong>
                <br />
                {t.home.trust.shippingBody} ({formatWeight(product.weightGrams, locale)})
              </span>
            </li>
            {isUsed && (
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
                <span className="text-smoke-600">{t.home.trust.checkedBody}</span>
              </li>
            )}
            <li className="flex gap-3">
              <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
              <span className="text-smoke-600">{t.home.trust.paymentBody}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ------------------------------------------------------- contenu */}
      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div className="max-w-prose">
          {product.description && (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-ink">{t.product.description}</h2>
              <RichText content={product.description} className="mt-4" />
            </section>
          )}

          {product.conditionNote && (
            <section className="mt-12 rounded-card border-l-4 border-signal bg-smoke-50 p-6">
              <h2 className="text-lg font-bold tracking-tight text-ink">
                {t.product.conditionReport}
              </h2>
              <RichText content={product.conditionNote} className="mt-3" />
            </section>
          )}
        </div>

        {product.specs.length > 0 && (
          <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
            <h2 className="text-lg font-bold tracking-tight text-ink">{t.product.specs}</h2>
            <dl className="mt-4 divide-y divide-smoke-200 rounded-card border border-smoke-200">
              {product.specs.map((spec) => (
                <div key={spec.label} className="flex gap-4 px-4 py-3 text-sm">
                  <dt className="w-2/5 shrink-0 text-smoke-500">{spec.label}</dt>
                  <dd className="flex-1 font-medium text-ink">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-ink">{t.product.related}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <ProductSchema product={product} locale={locale} />
    </div>
  );
}

function Availability({ product, locale }: { product: ProductDetail; locale: Locale }) {
  const t = getDictionary(locale);

  if (!product.inStock) {
    return <span className="font-semibold text-smoke-500">{t.product.outOfStock}</span>;
  }
  if (product.stock === 1) {
    return <span className="font-semibold text-signal">{t.product.lastOne}</span>;
  }
  if (product.stock <= 3) {
    return (
      <span className="font-semibold text-signal">
        {interpolate(t.product.onlyLeft, { n: product.stock })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
      {t.product.inStock}
    </span>
  );
}

function Breadcrumb({ locale, product }: { locale: Locale; product: ProductDetail }) {
  const t = getDictionary(locale);

  return (
    <nav aria-label="Fil d'Ariane" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-smoke-500">
        <li>
          <Link href={home(locale)} className="hover:text-ink">
            {t.meta.siteName}
          </Link>
        </li>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <li>
          <Link href={path(locale, 'catalog')} className="hover:text-ink">
            {t.catalog.title}
          </Link>
        </li>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <li>
              <Link
                href={`${path(locale, 'catalog')}?category=${product.category.slug}`}
                className="hover:text-ink"
              >
                {product.category.name}
              </Link>
            </li>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <li aria-current="page" className="truncate font-medium text-ink">
          {product.name}
        </li>
      </ol>
    </nav>
  );
}

function ProductSchema({ product, locale }: { product: ProductDetail; locale: Locale }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voltaris.eu';
  const url = `${siteUrl}${path(locale, 'product', product.slug)}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? undefined,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand },
    image: product.images.map((img) => `${siteUrl}${img.url}`),
    itemCondition:
      product.condition === 'NEW'
        ? 'https://schema.org/NewCondition'
        : product.condition === 'REFURBISHED'
          ? 'https://schema.org/RefurbishedCondition'
          : 'https://schema.org/UsedCondition',
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: product.currency,
      price: (product.priceCents / 100).toFixed(2),
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition:
        product.condition === 'NEW'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
      shippingDetails: ['FR', 'DE'].map((country) => ({
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: country },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
