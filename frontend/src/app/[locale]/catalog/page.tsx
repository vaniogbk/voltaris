import type { Metadata } from 'next';
import { PackageSearch } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { CatalogFilters } from '@/components/CatalogFilters';
import { SortSelect } from '@/components/SortSelect';
import { Pagination } from '@/components/Pagination';
import { catalog, type Facets, type ProductCard as Product } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { path, type Locale } from '@/lib/routes';

export const revalidate = 60;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: SearchParams;
}): Promise<Metadata> {
  const t = getDictionary(params.locale);
  const categorySlug = first(searchParams.category);

  let title = t.catalog.title;
  let description = t.meta.homeDescription;

  if (categorySlug) {
    try {
      const { categories } = await catalog.categories(params.locale);
      const category = categories.find((c) => c.slug === categorySlug);
      if (category) {
        title = category.name;
        description = category.description ?? description;
      }
    } catch {
      /* métadonnées par défaut si l'API ne répond pas */
    }
  }

  const page = Number(first(searchParams.page) ?? 1);
  if (page > 1) title = `${title} — ${t.common.page} ${page}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${path(params.locale, 'catalog')}${categorySlug ? `?category=${categorySlug}` : ''}`,
      languages: { fr: path('fr', 'catalog'), de: path('de', 'catalog') },
    },
    // Les pages filtrées ne doivent pas être indexées séparément : contenu
    // quasi dupliqué et budget de crawl gaspillé.
    robots: page > 1 || hasFilters(searchParams) ? { index: false, follow: true } : undefined,
  };
}

function hasFilters(searchParams: SearchParams): boolean {
  return ['condition', 'brand', 'minPrice', 'maxPrice', 'inStock', 'onSale', 'q', 'sort'].some(
    (key) => searchParams[key] !== undefined,
  );
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: SearchParams;
}) {
  const locale = params.locale;
  const t = getDictionary(locale);

  const categorySlug = first(searchParams.category);
  const page = Math.max(1, Number(first(searchParams.page) ?? 1) || 1);

  const query = {
    locale,
    category: categorySlug,
    condition: first(searchParams.condition)?.split(',').filter(Boolean),
    brand: first(searchParams.brand)?.split(',').filter(Boolean),
    minPrice: first(searchParams.minPrice) ? Number(first(searchParams.minPrice)) : undefined,
    maxPrice: first(searchParams.maxPrice) ? Number(first(searchParams.maxPrice)) : undefined,
    inStock: first(searchParams.inStock) === 'true',
    onSale: first(searchParams.onSale) === 'true',
    q: first(searchParams.q),
    sort: first(searchParams.sort),
    page,
    perPage: 12,
  };

  let items: Product[] = [];
  let pagination = { page, perPage: 12, total: 0, totalPages: 1 };
  let facets: Facets = { price: { minCents: 0, maxCents: 0 }, brands: [], conditions: [] };
  let categories: Awaited<ReturnType<typeof catalog.categories>>['categories'] = [];
  let failed = false;

  try {
    const [products, facetData, categoryData] = await Promise.all([
      catalog.products(query),
      catalog.facets(locale, categorySlug),
      catalog.categories(locale),
    ]);
    items = products.items;
    pagination = products.pagination;
    facets = facetData;
    categories = categoryData.categories;
  } catch {
    failed = true;
  }

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const heading = activeCategory?.name ?? (query.q ? `« ${query.q} »` : t.catalog.title);

  // Reconstruit la chaîne de filtres pour la pagination, sans le numéro de page.
  const searchWithoutPage = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const v = first(value);
    if (v && key !== 'page') searchWithoutPage.set(key, v);
  }

  return (
    <div className="container-page py-8 lg:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{heading}</h1>
        {activeCategory?.description && (
          <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-smoke-500">
            {activeCategory.description}
          </p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <div className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <CatalogFilters locale={locale} categories={categories} facets={facets} />
        </div>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-smoke-200 pb-4">
            <p className="text-sm text-smoke-500 tabular">
              <span className="font-semibold text-ink">{pagination.total}</span>{' '}
              {pagination.total > 1 ? t.catalog.resultsMany : t.catalog.resultsOne}
            </p>
            <SortSelect locale={locale} />
          </div>

          {failed ? (
            <EmptyState title={t.common.error} body={t.common.retry} />
          ) : items.length === 0 ? (
            <EmptyState title={t.catalog.empty} body={t.catalog.emptyHint} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    locale={locale}
                    priority={i < 3}
                  />
                ))}
              </div>

              <Pagination
                locale={locale}
                page={pagination.page}
                totalPages={pagination.totalPages}
                basePath={path(locale, 'catalog')}
                search={searchWithoutPage.toString()}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-smoke-300 py-20 text-center">
      <PackageSearch className="h-10 w-10 text-smoke-300" aria-hidden="true" />
      <p className="mt-4 text-base font-semibold text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-smoke-500">{body}</p>
    </div>
  );
}
