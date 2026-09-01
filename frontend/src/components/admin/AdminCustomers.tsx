'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { formatDate, formatPrice } from '@/lib/format';
import type { Locale } from '@/lib/routes';

interface AdminCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  country: string;
  createdAt: string;
  orderCount: number;
  lifetimeValueCents: number;
  lastLoginAt: string | null;
}

export function AdminCustomers({ locale, accessToken }: { locale: Locale; accessToken: string }) {
  const t = getDictionary(locale);

  const [items, setItems] = useState<AdminCustomer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ perPage: '100' });
      if (query.trim()) params.set('q', query.trim());
      const data = await apiFetch<{ items: AdminCustomer[] }>(
        `/api/admin/customers?${params.toString()}`,
        { accessToken },
      );
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, query, t.common.error]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <label className="relative mb-5 block max-w-md">
        <span className="sr-only">{t.nav.search}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, e-mail, société…"
          className="field pl-9"
        />
      </label>

      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b border-smoke-200 bg-smoke-50 text-left">
            <tr className="text-xs font-bold uppercase tracking-wide text-smoke-500">
              <th className="px-4 py-3">{t.admin.customers}</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">{t.admin.orders}</th>
              <th className="px-4 py-3 text-right">CA</th>
              <th className="px-4 py-3">Inscrit le</th>
              <th className="px-4 py-3">Rôle</th>
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

            {items.map((customer) => (
              <tr key={customer.id} className="hover:bg-smoke-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">
                    {customer.firstName} {customer.lastName}
                  </p>
                  {customer.company && (
                    <p className="text-xs text-smoke-400">{customer.company}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-smoke-600">
                  <p>{customer.email}</p>
                  {customer.phone && <p className="text-xs text-smoke-400">{customer.phone}</p>}
                </td>
                <td className="px-4 py-3 text-right tabular text-ink">{customer.orderCount}</td>
                <td className="px-4 py-3 text-right font-semibold tabular text-ink">
                  {formatPrice(customer.lifetimeValueCents, locale)}
                </td>
                <td className="px-4 py-3 text-smoke-500">
                  {formatDate(customer.createdAt, locale)}
                </td>
                <td className="px-4 py-3">
                  <span className="badge-soft">{customer.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
