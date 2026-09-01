'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Boxes, Landmark, ShoppingBag, Users } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { AdminDashboard } from './AdminDashboard';
import { AdminProducts } from './AdminProducts';
import { AdminOrders } from './AdminOrders';
import { AdminCustomers } from './AdminCustomers';
import { AdminBankImport } from './AdminBankImport';
import { getDictionary } from '@/i18n';
import { home, path, type Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

type Tab = 'dashboard' | 'products' | 'orders' | 'bank' | 'customers';

export function AdminApp({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  const isStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`${path(locale, 'account')}/login?next=${encodeURIComponent(path(locale, 'admin'))}`);
    }
  }, [loading, user, router, locale]);

  if (loading || !user) {
    return (
      <div className="container-page py-16">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{t.admin.noAccess}</h1>
        <Link href={home(locale)} className="btn btn-primary btn-md mt-6">
          {t.nav.home}
        </Link>
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
    { id: 'dashboard', label: t.admin.dashboard, icon: BarChart3 },
    { id: 'products', label: t.admin.products, icon: Boxes },
    { id: 'orders', label: t.admin.orders, icon: ShoppingBag },
    { id: 'bank', label: t.admin.bank.tab, icon: Landmark },
    { id: 'customers', label: t.admin.customers, icon: Users },
  ];

  return (
    <div className="container-page py-8 lg:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{t.admin.title}</h1>
          <p className="mt-1 text-sm text-smoke-500">
            {user.firstName} {user.lastName} · {user.role}
          </p>
        </div>
        <Link href={home(locale)} className="btn btn-outline btn-sm">
          {t.nav.home}
        </Link>
      </header>

      <nav className="no-scrollbar mt-7 flex gap-1 overflow-x-auto border-b border-smoke-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
              tab === id
                ? 'border-signal text-ink'
                : 'border-transparent text-smoke-500 hover:text-ink',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {accessToken && (
          <>
            {tab === 'dashboard' && <AdminDashboard locale={locale} accessToken={accessToken} />}
            {tab === 'products' && <AdminProducts locale={locale} accessToken={accessToken} />}
            {tab === 'orders' && <AdminOrders locale={locale} accessToken={accessToken} />}
            {tab === 'bank' && (
              <AdminBankImport
                locale={locale}
                accessToken={accessToken}
                isAdmin={user.role === 'ADMIN'}
              />
            )}
            {tab === 'customers' && <AdminCustomers locale={locale} accessToken={accessToken} />}
          </>
        )}
      </div>
    </div>
  );
}
