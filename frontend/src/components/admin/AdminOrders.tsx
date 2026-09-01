'use client';

import { useCallback, useEffect, useState } from 'react';
import { Landmark, Search, Truck } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { formatDateTime, formatPrice } from '@/lib/format';
import type { Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

const CARRIERS = ['DPD', 'DHL', 'Chronopost', 'GLS', 'Schenker'] as const;

interface AdminOrder {
  id: string;
  orderNumber: string;
  email: string;
  country: string;
  status: string;
  paymentMethod: 'CARD' | 'BANK_TRANSFER';
  paymentStatus: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  bankTransferRef: string | null;
  items: Array<{ id: string; name: string; sku: string; quantity: number }>;
  shipments: Array<{ id: string; carrier: string; trackingNumber: string | null; status: string }>;
}

export function AdminOrders({ locale, accessToken }: { locale: Locale; accessToken: string }) {
  const t = getDictionary(locale);

  const [items, setItems] = useState<AdminOrder[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [shipping, setShipping] = useState<{ orderId: string; carrier: string; tracking: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ perPage: '50' });
      if (query.trim()) params.set('q', query.trim());
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiFetch<{ items: AdminOrder[] }>(
        `/api/admin/orders?${params.toString()}`,
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

  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function run(orderId: string, action: () => Promise<unknown>) {
    setBusy(orderId);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    } finally {
      setBusy(null);
    }
  }

  const confirmTransfer = (order: AdminOrder) =>
    run(order.id, () =>
      apiFetch(`/api/admin/orders/${order.id}/confirm-transfer`, {
        method: 'POST',
        accessToken,
        body: {},
      }),
    );

  const submitShipment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!shipping) return;
    const payload = shipping;
    setShipping(null);
    void run(payload.orderId, () =>
      apiFetch(`/api/admin/orders/${payload.orderId}/ship`, {
        method: 'POST',
        accessToken,
        body: {
          carrier: payload.carrier,
          trackingNumber: payload.tracking.trim() || undefined,
        },
      }),
    );
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <span className="sr-only">{t.nav.search}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SM-2026-… / e-mail / référence virement"
            className="field pl-9"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="field w-auto"
        >
          <option value="">—</option>
          {Object.keys(t.orderStatus).map((status) => (
            <option key={status} value={status}>
              {t.orderStatus[status as keyof typeof t.orderStatus]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      {loading && items.length === 0 && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-card" />
          ))}
        </div>
      )}

      <ul className="space-y-4">
        {items.map((order) => {
          const awaitingTransfer =
            order.paymentMethod === 'BANK_TRANSFER' && order.paymentStatus === 'AWAITING_TRANSFER';
          const shippable =
            order.paymentStatus === 'SUCCEEDED' &&
            order.status !== 'SHIPPED' &&
            order.status !== 'DELIVERED' &&
            order.status !== 'CANCELLED';

          return (
            <li key={order.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold tabular text-ink">{order.orderNumber}</span>
                    <span
                      className={cn(
                        'badge',
                        order.status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : order.status === 'CANCELLED'
                            ? 'bg-smoke-100 text-smoke-500'
                            : order.status === 'PENDING_PAYMENT'
                              ? 'bg-signal-soft text-signal'
                              : 'bg-ink text-white',
                      )}
                    >
                      {t.orderStatus[order.status as keyof typeof t.orderStatus] ?? order.status}
                    </span>
                    <span className="badge-outline">{t.paymentMethod[order.paymentMethod]}</span>
                    <span className="badge-soft">{order.country}</span>
                  </div>

                  <p className="mt-1.5 text-sm text-smoke-500">
                    {order.email} · {formatDateTime(order.createdAt, locale)}
                  </p>
                  <p className="mt-1 text-sm text-smoke-600">
                    {order.items.map((item) => `${item.sku} × ${item.quantity}`).join(', ')}
                  </p>
                  {order.bankTransferRef && (
                    <p className="mt-1 text-xs text-smoke-400">
                      {t.confirmation.reference}{' '}
                      <span className="font-mono text-ink">{order.bankTransferRef}</span>
                    </p>
                  )}
                  {order.shipments[0] && (
                    <p className="mt-1 text-xs text-smoke-500">
                      {order.shipments[0].carrier}
                      {order.shipments[0].trackingNumber
                        ? ` · ${order.shipments[0].trackingNumber}`
                        : ''}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <span className="text-xl font-bold tabular text-ink">
                    {formatPrice(order.totalCents, locale, order.currency)}
                  </span>

                  <div className="flex flex-wrap justify-end gap-2">
                    {awaitingTransfer && (
                      <button
                        type="button"
                        disabled={busy === order.id}
                        onClick={() => void confirmTransfer(order)}
                        className="btn btn-primary btn-sm"
                      >
                        <Landmark className="h-3.5 w-3.5" />
                        {t.admin.confirmTransfer}
                      </button>
                    )}
                    {shippable && (
                      <button
                        type="button"
                        disabled={busy === order.id}
                        onClick={() =>
                          setShipping({
                            orderId: order.id,
                            carrier: order.country === 'DE' ? 'DHL' : 'DPD',
                            tracking: '',
                          })
                        }
                        className="btn btn-dark btn-sm"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        {t.admin.ship}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {shipping?.orderId === order.id && (
                <form
                  onSubmit={submitShipment}
                  className="mt-4 flex flex-wrap items-end gap-3 border-t border-smoke-200 pt-4"
                >
                  <label className="min-w-[10rem]">
                    <span className="field-label">{t.admin.carrier}</span>
                    <select
                      value={shipping.carrier}
                      onChange={(e) =>
                        setShipping((s) => (s ? { ...s, carrier: e.target.value } : s))
                      }
                      className="field h-10"
                    >
                      {CARRIERS.map((carrier) => (
                        <option key={carrier} value={carrier}>
                          {carrier}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="min-w-[14rem] flex-1">
                    <span className="field-label">{t.admin.trackingNumber}</span>
                    <input
                      value={shipping.tracking}
                      onChange={(e) =>
                        setShipping((s) => (s ? { ...s, tracking: e.target.value } : s))
                      }
                      className="field h-10"
                    />
                  </label>

                  <button type="submit" className="btn btn-primary btn-md">
                    {t.admin.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipping(null)}
                    className="btn btn-ghost btn-md"
                  >
                    {t.admin.cancel}
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {!loading && items.length === 0 && (
        <p className="py-12 text-center text-sm text-smoke-400">{t.catalog.empty}</p>
      )}
    </div>
  );
}
