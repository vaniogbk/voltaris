'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Category, Facets, ProductCondition } from '@/lib/api';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

interface Props {
  locale: Locale;
  categories: Category[];
  facets: Facets;
}

const CONDITIONS: ProductCondition[] = ['NEW', 'USED', 'REFURBISHED'];

export function CatalogFilters({ locale, categories, facets }: Props) {
  const t = getDictionary(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [open, setOpen] = useState(false);

  const selectedCategory = params.get('category') ?? '';
  const selectedConditions = (params.get('condition')?.split(',').filter(Boolean) ??
    []) as ProductCondition[];
  const selectedBrands = params.get('brand')?.split(',').filter(Boolean) ?? [];
  const inStock = params.get('inStock') === 'true';
  const onSale = params.get('onSale') === 'true';

  const floor = Math.floor(facets.price.minCents / 100);
  const ceiling = Math.ceil(facets.price.maxCents / 100);
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');

  // Les champs de prix sont contrôlés localement ; ils doivent suivre un
  // changement d'URL venu d'ailleurs (retour navigateur, réinitialisation).
  useEffect(() => {
    setMinPrice(params.get('minPrice') ?? '');
    setMaxPrice(params.get('maxPrice') ?? '');
  }, [params]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    // Tout changement de filtre ramène à la première page : rester en page 4
    // sur un résultat qui n'en compte plus que 2 donne une page vide.
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function toggleInList(key: 'condition' | 'brand', value: string, current: string[]) {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update({ [key]: next.length ? next.join(',') : null });
  }

  const activeCount =
    (selectedCategory ? 1 : 0) +
    selectedConditions.length +
    selectedBrands.length +
    (inStock ? 1 : 0) +
    (onSale ? 1 : 0) +
    (params.get('minPrice') ? 1 : 0) +
    (params.get('maxPrice') ? 1 : 0);

  const panel = (
    <div className="space-y-7">
      {/* ---------------------------------------------------- catégorie */}
      <FilterGroup title={t.catalog.filter.category}>
        <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
          <input
            type="radio"
            name="category"
            checked={selectedCategory === ''}
            onChange={() => update({ category: null })}
            className="h-4 w-4 accent-signal"
          />
          <span className={cn(selectedCategory === '' ? 'font-semibold text-ink' : 'text-smoke-600')}>
            {t.catalog.filter.allCategories}
          </span>
        </label>
        {categories.map((category) => (
          <label
            key={category.id}
            className="flex cursor-pointer items-center gap-2.5 py-1 text-sm"
          >
            <input
              type="radio"
              name="category"
              checked={selectedCategory === category.slug}
              onChange={() => update({ category: category.slug })}
              className="h-4 w-4 accent-signal"
            />
            <span
              className={cn(
                'flex-1',
                selectedCategory === category.slug ? 'font-semibold text-ink' : 'text-smoke-600',
              )}
            >
              {category.name}
            </span>
            <span className="text-xs text-smoke-400">{category.productCount}</span>
          </label>
        ))}
      </FilterGroup>

      {/* -------------------------------------------------------- état */}
      <FilterGroup title={t.catalog.filter.condition}>
        {CONDITIONS.map((condition) => {
          const facet = facets.conditions.find((c) => c.value === condition);
          if (!facet) return null;
          return (
            <label key={condition} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
              <input
                type="checkbox"
                checked={selectedConditions.includes(condition)}
                onChange={() => toggleInList('condition', condition, selectedConditions)}
                className="h-4 w-4 rounded accent-signal"
              />
              <span className="flex-1 text-smoke-600">{t.condition[condition]}</span>
              <span className="text-xs text-smoke-400">{facet.count}</span>
            </label>
          );
        })}
      </FilterGroup>

      {/* -------------------------------------------------------- prix */}
      <FilterGroup title={t.catalog.filter.price}>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ minPrice: minPrice || null, maxPrice: maxPrice || null });
          }}
        >
          <label className="flex-1">
            <span className="sr-only">{t.catalog.filter.priceMin}</span>
            <input
              type="number"
              inputMode="numeric"
              min={floor}
              max={ceiling}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={`${floor} €`}
              className="field h-10 text-sm"
            />
          </label>
          <span className="text-smoke-400">—</span>
          <label className="flex-1">
            <span className="sr-only">{t.catalog.filter.priceMax}</span>
            <input
              type="number"
              inputMode="numeric"
              min={floor}
              max={ceiling}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={`${ceiling} €`}
              className="field h-10 text-sm"
            />
          </label>
          <button type="submit" className="btn btn-dark btn-sm shrink-0">
            OK
          </button>
        </form>
      </FilterGroup>

      {/* ------------------------------------------------------ marque */}
      {facets.brands.length > 1 && (
        <FilterGroup title={t.catalog.filter.brand}>
          {facets.brands.map((brand) => (
            <label
              key={brand.value}
              className="flex cursor-pointer items-center gap-2.5 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand.value)}
                onChange={() => toggleInList('brand', brand.value, selectedBrands)}
                className="h-4 w-4 rounded accent-signal"
              />
              <span className="flex-1 text-smoke-600">{brand.value}</span>
              <span className="text-xs text-smoke-400">{brand.count}</span>
            </label>
          ))}
        </FilterGroup>
      )}

      {/* ------------------------------------------------ disponibilité */}
      <FilterGroup title={t.catalog.filter.availability}>
        <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
          <input
            type="checkbox"
            checked={inStock}
            onChange={() => update({ inStock: inStock ? null : 'true' })}
            className="h-4 w-4 rounded accent-signal"
          />
          <span className="text-smoke-600">{t.catalog.filter.inStockOnly}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
          <input
            type="checkbox"
            checked={onSale}
            onChange={() => update({ onSale: onSale ? null : 'true' })}
            className="h-4 w-4 rounded accent-signal"
          />
          <span className="text-smoke-600">{t.catalog.filter.onSaleOnly}</span>
        </label>
      </FilterGroup>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => router.push(pathname, { scroll: false })}
          className="btn btn-outline btn-sm w-full"
        >
          <X className="h-3.5 w-3.5" />
          {t.catalog.reset}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Déclencheur mobile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-md w-full lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {t.catalog.filters}
        {activeCount > 0 && (
          <span className="ml-1 rounded-full bg-signal px-1.5 text-[0.625rem] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <aside className="hidden lg:block">{panel}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t.common.close}
            className="absolute inset-0 bg-ink/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-fade-up overflow-y-auto rounded-t-2xl bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t.catalog.filters}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost h-9 w-9 p-0"
                aria-label={t.common.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {panel}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-primary btn-lg mt-6 w-full"
            >
              {t.catalog.apply}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink">
        {title}
      </legend>
      <div className="space-y-0.5">{children}</div>
    </fieldset>
  );
}
