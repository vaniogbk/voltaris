import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { ConfirmationView } from '@/components/checkout/ConfirmationView';
import { apiFetch, type BankTransferInstructions, type OrderSummary } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { path, type Locale } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return {
    title: getDictionary(params.locale).confirmation.title,
    robots: { index: false, follow: false },
  };
}

interface Props {
  params: { locale: Locale; orderNumber: string };
  searchParams: { email?: string };
}

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const locale = params.locale;
  const t = getDictionary(locale);
  const email = searchParams.email;

  let data: {
    order: OrderSummary;
    items: Array<{ id: string; name: string; sku: string; quantity: number; totalCents: number; imageUrl: string | null }>;
    payment:
      | { method: 'BANK_TRANSFER'; instructions: BankTransferInstructions }
      | { method: 'CARD' };
  } | null = null;

  if (email) {
    try {
      data = await apiFetch(
        `/api/checkout/orders/${encodeURIComponent(params.orderNumber)}?email=${encodeURIComponent(email)}`,
        { cache: 'no-store' },
      );
    } catch {
      data = null;
    }
  }

  if (!data) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-smoke-300" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">{t.common.error}</h1>
        <p className="mt-2 max-w-md text-sm text-smoke-500">
          {t.confirmation.orderNumber} <strong>{params.orderNumber}</strong>
        </p>
        <Link href={path(locale, 'tracking')} className="btn btn-primary btn-lg mt-7">
          {t.nav.tracking}
        </Link>
      </div>
    );
  }

  return (
    <ConfirmationView
      locale={locale}
      order={data.order}
      items={data.items}
      payment={data.payment}
    />
  );
}
