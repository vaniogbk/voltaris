'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { formatPrice } from '@/lib/format';
import type { Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

interface AdminProduct {
  id: string;
  sku: string;
  brand: string;
  model: string | null;
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  priceCents: number;
  compareAtCents: number | null;
  currency: string;
  stock: number;
  reservedStock: number;
  lowStockAlert: number;
  isFeatured: boolean;
  translations: Array<{ locale: string; name: string }>;
  category: { translations: Array<{ locale: string; name: string }> } | null;
}

export function AdminProducts({ locale, accessToken }: { locale: Locale; accessToken: string }) {
  const t = getDictionary(locale);

  const [items, setItems] = useState<AdminProduct[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftStock, setDraftStock] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ perPage: '100' });
      if (query.trim()) params.set('q', query.trim());
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiFetch<{ items: AdminProduct[] }>(
        `/api/admin/products?${params.toString()}`,
        { accessToken },
      );
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, query, statusFilter, t.common.error]);

  // Recherche différée : évite une requête à chaque frappe.
  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function saveStock(productId: string) {
    const value = Number(draftStock);
    if (!Number.isInteger(value) || value < 0) return;
    try {
      await apiFetch(`/api/admin/products/${productId}/stock`, {
        method: 'POST',
        accessToken,
        body: { mode: 'set', stock: value, note: 'Ajustement depuis le back-office' },
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    }
  }

  async function toggleStatus(product: AdminProduct) {
    const next = product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await apiFetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        accessToken,
        body: { status: next },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    }
  }

  const name = (product: AdminProduct) =>
    product.translations.find((tr) => tr.locale === locale)?.name ??
    product.translations[0]?.name ??
    product.sku;

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <span className="sr-only">{t.nav.search}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.nav.search}
            className="field pl-9"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="field w-auto"
        >
          <option value="">{t.catalog.filter.allCategories}</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="border-b border-smoke-200 bg-smoke-50 text-left">
            <tr className="text-xs font-bold uppercase tracking-wide text-smoke-500">
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">{t.admin.products}</th>
              <th className="px-4 py-3">{t.condition.grade}</th>
              <th className="px-4 py-3 text-right">Prix</th>
              <th className="px-4 py-3 text-right">{t.admin.stock}</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-smoke-200">
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-smoke-400">
                  {t.common.loading}
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-smoke-400">
                  {t.catalog.empty}
                </td>
              </tr>
            )}

            {items.map((product) => {
              const available = product.stock - product.reservedStock;
              return (
                <tr key={product.id} className="hover:bg-smoke-50">
                  <td className="px-4 py-3 font-mono text-xs text-smoke-500">{product.sku}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{name(product)}</p>
                    <p className="text-xs text-smoke-400">
                      {product.brand}
                      {product.category?.translations.find((tr) => tr.locale === locale)?.name
                        ? ` · ${product.category.translations.find((tr) => tr.locale === locale)!.name}`
                        : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-soft">{t.condition[product.condition]}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular">
                    <span className="font-semibold text-ink">
                      {formatPrice(product.priceCents, locale, product.currency)}
                    </span>
                    {product.compareAtCents && (
                      <span className="ml-1.5 text-xs text-smoke-400 line-through">
                        {formatPrice(product.compareAtCents, locale, product.currency)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing === product.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          value={draftStock}
                          onChange={(e) => setDraftStock(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveStock(product.id);
                            if (e.key === 'Escape') setEditing(null);
                          }}
                          className="field h-8 w-20 text-right text-sm"
                          aria-label={t.admin.newStock}
                        />
                        <button
                          type="button"
                          onClick={() => void saveStock(product.id)}
                          className="btn btn-ghost h-8 w-8 p-0 text-emerald-600"
                          aria-label={t.admin.save}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="btn btn-ghost h-8 w-8 p-0 text-smoke-400"
                          aria-label={t.admin.cancel}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(product.id);
                          setDraftStock(String(product.stock));
                        }}
                        className="rounded px-2 py-1 tabular hover:bg-smoke-200"
                        title={t.admin.adjustStock}
                      >
                        <strong
                          className={cn(
                            available <= product.lowStockAlert ? 'text-signal' : 'text-ink',
                          )}
                        >
                          {available}
                        </strong>
                        {product.reservedStock > 0 && (
                          <span className="text-xs text-smoke-400"> ({product.reservedStock} rés.)</span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleStatus(product)}
                      className={cn(
                        'badge',
                        product.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : product.status === 'DRAFT'
                            ? 'bg-smoke-100 text-smoke-600'
                            : 'bg-signal-soft text-signal',
                      )}
                    >
                      {product.status}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
