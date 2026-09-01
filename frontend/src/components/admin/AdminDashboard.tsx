'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Euro, Landmark, PackageCheck, Receipt, TrendingUp, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { formatDate, formatPrice } from '@/lib/format';
import type { Locale } from '@/lib/routes';

interface DashboardData {
  kpis: {
    revenueMonthCents: number;
    ordersMonth: number;
    pendingTransfers: number;
    toShip: number;
    customers: number;
    publishedProducts: number;
    pendingBankEntries: number;
  };
  revenueByDay: Array<{ day: string; totalCents: number; orders: number }>;
  lowStock: Array<{ id: string; sku: string; stock: number; reservedStock: number; lowStockAlert: number }>;
  recentOrders: Array<{
    orderNumber: string;
    email: string;
    status: string;
    paymentMethod: 'CARD' | 'BANK_TRANSFER';
    paymentStatus: string;
    totalCents: number;
    country: string;
    createdAt: string;
  }>;
}

export function AdminDashboard({ locale, accessToken }: { locale: Locale; accessToken: string }) {
  const t = getDictionary(locale);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>('/api/admin/dashboard', { accessToken })
      .then(setData)
      .catch(() => setError(t.common.error));
  }, [accessToken, t.common.error]);

  if (error) return <p className="text-sm text-signal">{error}</p>;

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-24 rounded-card" />
        ))}
      </div>
    );
  }

  const { kpis } = data;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          icon={Euro}
          label={t.admin.revenueMonth}
          value={formatPrice(kpis.revenueMonthCents, locale)}
          accent
        />
        <Kpi icon={Receipt} label={t.admin.ordersMonth} value={String(kpis.ordersMonth)} />
        <Kpi
          icon={AlertTriangle}
          label={t.admin.pendingTransfers}
          value={String(kpis.pendingTransfers)}
          warn={kpis.pendingTransfers > 0}
        />
        <Kpi
          icon={PackageCheck}
          label={t.admin.toShip}
          value={String(kpis.toShip)}
          warn={kpis.toShip > 0}
        />
        <Kpi
          icon={Landmark}
          label={t.admin.pendingBankEntries}
          value={String(kpis.pendingBankEntries)}
          warn={kpis.pendingBankEntries > 0}
        />
        <Kpi icon={Users} label={t.admin.customersCount} value={String(kpis.customers)} />
        <Kpi
          icon={TrendingUp}
          label={t.admin.publishedProducts}
          value={String(kpis.publishedProducts)}
        />
      </div>

      {data.revenueByDay.length > 0 && (
        <RevenueChart data={data.revenueByDay} locale={locale} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-base font-bold text-ink">{t.admin.recentOrders}</h2>
          {data.recentOrders.length === 0 ? (
            <p className="mt-3 text-sm text-smoke-500">—</p>
          ) : (
            <ul className="mt-3 divide-y divide-smoke-200">
              {data.recentOrders.map((order) => (
                <li key={order.orderNumber} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tabular text-ink">{order.orderNumber}</p>
                    <p className="truncate text-xs text-smoke-400">
                      {order.email} · {order.country} · {formatDate(order.createdAt, locale)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular text-ink">
                      {formatPrice(order.totalCents, locale)}
                    </p>
                    <p className="text-xs text-smoke-400">
                      {t.orderStatus[order.status as keyof typeof t.orderStatus] ?? order.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-base font-bold text-ink">{t.admin.lowStock}</h2>
          {data.lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-smoke-500">—</p>
          ) : (
            <ul className="mt-3 divide-y divide-smoke-200">
              {data.lowStock.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-mono text-xs text-ink">{item.sku}</span>
                  <span className="text-sm tabular">
                    <strong
                      className={
                        item.stock - item.reservedStock <= 0 ? 'text-signal' : 'text-ink'
                      }
                    >
                      {item.stock - item.reservedStock}
                    </strong>
                    <span className="text-smoke-400"> / {item.stock}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
  warn,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="card flex items-start gap-4 p-5">
      <span
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          accent ? 'bg-signal text-white' : warn ? 'bg-signal-soft text-signal' : 'bg-smoke-100 text-smoke-500',
        ].join(' ')}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-smoke-400">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tabular text-ink">{value}</p>
      </div>
    </div>
  );
}

/**
 * Histogramme du chiffre d'affaires encaissé sur 30 jours.
 * Rendu en SVG plutôt qu'avec une librairie : une seule série, pas
 * d'interaction complexe, et zéro kilo-octet de dépendance supplémentaire.
 */
function RevenueChart({
  data,
  locale,
}: {
  data: Array<{ day: string; totalCents: number; orders: number }>;
  locale: Locale;
}) {
  const max = Math.max(...data.map((d) => d.totalCents), 1);
  const total = data.reduce((sum, d) => sum + d.totalCents, 0);

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold text-ink">30 j</h2>
        <p className="text-lg font-bold tabular text-ink">{formatPrice(total, locale)}</p>
      </div>

      <div className="mt-5 flex h-32 items-end gap-1" role="img" aria-label={formatPrice(total, locale)}>
        {data.map((point) => (
          <div
            key={point.day}
            className="group relative flex-1 rounded-t bg-smoke-200 transition-colors hover:bg-signal"
            style={{ height: `${Math.max(3, (point.totalCents / max) * 100)}%` }}
          >
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
              {formatDate(point.day, locale)} — {formatPrice(point.totalCents, locale)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
