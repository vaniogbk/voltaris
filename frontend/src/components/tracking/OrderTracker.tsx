'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ExternalLink,
  FileDown,
  Landmark,
  PackageSearch,
  RotateCcw,
  Search,
  Truck,
} from 'lucide-react';
import { apiFetch, ApiError, type BankTransferInstructions, type OrderSummary } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { formatDate, formatIban, formatPrice } from '@/lib/format';
import { path, type Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

interface TrackedOrder {
  order: OrderSummary;
  items: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    totalCents: number;
    imageUrl: string | null;
  }>;
  shipments: Array<{
    carrier: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  }>;
  payment:
    | { method: 'BANK_TRANSFER'; instructions: BankTransferInstructions }
    | { method: 'CARD' };
}

export function OrderTracker({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const params = useSearchParams();

  // Les e-mails de confirmation renvoient ici avec les deux paramètres :
  // le client n'a alors rien à ressaisir.
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [result, setResult] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TrackedOrder>(
        `/api/checkout/orders/${encodeURIComponent(orderNumber.trim().toUpperCase())}?email=${encodeURIComponent(email.trim())}`,
        { cache: 'no-store' },
      );
      setResult(data);
    } catch (err) {
      // Le message d'erreur est volontairement identique que la commande
      // n'existe pas ou que l'e-mail ne corresponde pas : sinon le formulaire
      // permettrait de deviner quels numéros de commande existent.
      setResult(null);
      setError(err instanceof ApiError ? t.tracking.notFound : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <TrackedOrderView
        locale={locale}
        data={result}
        onReset={() => {
          setResult(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="container-page max-w-xl py-12 lg:py-16">
      <div className="flex flex-col items-center text-center">
        <PackageSearch className="h-10 w-10 text-signal" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{t.tracking.title}</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-smoke-600">
          {t.tracking.subtitle}
        </p>
      </div>

      <form onSubmit={search} className="card mt-8 space-y-4 p-6">
        <label className="block">
          <span className="field-label">{t.tracking.orderNumber}</span>
          <input
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="SM-2026-00000"
            className="field font-mono uppercase"
          />
          <span className="field-hint">{t.tracking.orderNumberHint}</span>
        </label>

        <label className="block">
          <span className="field-label">{t.tracking.email}</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-signal-soft px-4 py-3 text-sm font-medium text-signal">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
          <Search className="h-4 w-4" />
          {loading ? t.common.loading : t.tracking.submit}
        </button>
      </form>

      <div className="mt-6 rounded-card border border-smoke-200 bg-canvas-raised p-5">
        <h2 className="text-sm font-bold text-ink">{t.tracking.helpTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-smoke-600">{t.tracking.helpBody}</p>
        <Link
          href={path(locale, 'contact')}
          className="mt-3 inline-block text-sm font-semibold text-signal hover:underline"
        >
          {t.footer.contact}
        </Link>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ résultat

function TrackedOrderView({
  locale,
  data,
  onReset,
}: {
  locale: Locale;
  data: TrackedOrder;
  onReset: () => void;
}) {
  const t = getDictionary(locale);
  const { order, items, shipments, payment } = data;
  const shipment = shipments[0];

  return (
    <div className="container-page max-w-3xl py-12 lg:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-smoke-500">
            {t.tracking.placedOn} {formatDate(order.createdAt, locale)}
          </p>
          <h1 className="mt-1 text-3xl font-bold tabular tracking-tight text-ink">
            {order.orderNumber}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`${path(locale, 'document', order.orderNumber)}?email=${encodeURIComponent(order.email)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-dark btn-sm"
          >
            <FileDown className="h-3.5 w-3.5" />
            {t.confirmation.downloadInvoice}
          </a>
          <button type="button" onClick={onReset} className="btn btn-outline btn-sm">
            <RotateCcw className="h-3.5 w-3.5" />
            {t.tracking.searchAgain}
          </button>
        </div>
      </div>

      <Timeline status={order.status} locale={locale} />

      {payment.method === 'BANK_TRANSFER' && order.paymentStatus !== 'SUCCEEDED' && (
        <section className="card mt-8 border-2 border-ink p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
            <Landmark className="h-5 w-5 text-signal" aria-hidden="true" />
            {t.confirmation.transferTitle}
          </h2>
          <p className="mt-2 text-sm text-smoke-600">{t.confirmation.transferIntro}</p>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
            {payment.instructions.qrCodeSvg && (
              <div
                className="shrink-0 rounded-lg border border-smoke-200 bg-white p-3 [&>svg]:block [&>svg]:h-32 [&>svg]:w-32"
                dangerouslySetInnerHTML={{ __html: payment.instructions.qrCodeSvg }}
              />
            )}
            <dl className="flex-1 space-y-2 text-sm">
              <Row label={t.confirmation.iban} value={formatIban(payment.instructions.iban)} mono />
              <Row label={t.confirmation.bic} value={payment.instructions.bic} mono />
              <Row
                label={t.confirmation.amount}
                value={formatPrice(payment.instructions.amountCents, locale, order.currency)}
                emphasis
              />
              <Row label={t.confirmation.reference} value={payment.instructions.reference} mono emphasis />
            </dl>
          </div>
        </section>
      )}

      <section className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
          <Truck className="h-5 w-5 text-smoke-400" aria-hidden="true" />
          {t.account.tracking}
        </h2>

        {!shipment ? (
          <p className="mt-3 text-sm text-smoke-500">{t.account.noTracking}</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="text-smoke-600">
              {t.account.carrier} <strong className="font-medium text-ink">{shipment.carrier}</strong>
            </span>
            {shipment.trackingNumber && (
              <span className="text-smoke-600">
                {t.account.trackingNumber}{' '}
                <strong className="font-mono text-xs text-ink">{shipment.trackingNumber}</strong>
              </span>
            )}
            <span className="text-smoke-600">
              {t.shipmentStatus[shipment.status as keyof typeof t.shipmentStatus] ?? shipment.status}
            </span>
            {shipment.trackingUrl && (
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-signal hover:underline"
              >
                {t.account.trackPackage}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-bold tracking-tight text-ink">{t.tracking.items}</h2>
        <ul className="mt-4 divide-y divide-smoke-200">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                <p className="text-xs text-smoke-400">
                  {item.sku} · × {item.quantity}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular text-ink">
                {formatPrice(item.totalCents, locale, order.currency)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-smoke-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-smoke-500">{t.cart.shipping}</dt>
            <dd className="tabular text-ink">
              {order.shippingCents === 0
                ? t.cart.shippingFree
                : formatPrice(order.shippingCents, locale, order.currency)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-smoke-200 pt-2 text-base font-bold">
            <dt>{t.cart.total}</dt>
            <dd className="tabular">{formatPrice(order.totalCents, locale, order.currency)}</dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-4 border-t border-smoke-200 pt-6 text-sm sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-smoke-400">
              {t.tracking.delivery}
            </h3>
            <address className="mt-2 not-italic leading-relaxed text-smoke-600">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              <br />
              {order.shippingAddress.line1}
              <br />
              {order.shippingAddress.postalCode} {order.shippingAddress.city}
              <br />
              {order.shippingAddress.country === 'DE' ? t.common.germany : t.common.france}
            </address>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-smoke-400">
              {t.tracking.payment}
            </h3>
            <p className="mt-2 text-smoke-600">
              {t.paymentMethod[order.paymentMethod as keyof typeof t.paymentMethod]}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Progression de la commande, du paiement à la livraison. */
function Timeline({ status, locale }: { status: string; locale: Locale }) {
  const t = getDictionary(locale);
  const steps = ['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED'] as const;

  if (status === 'CANCELLED' || status === 'REFUNDED') {
    return (
      <p className="mt-6 rounded-lg bg-smoke-100 px-4 py-3 text-sm font-medium text-smoke-600">
        {t.orderStatus[status as keyof typeof t.orderStatus]}
      </p>
    );
  }

  // PREPARING se situe entre le paiement et l'expédition : on l'affiche au
  // niveau « payée » pour garder quatre étapes lisibles.
  const normalized = status === 'PREPARING' ? 'PAID' : status;
  const current = Math.max(0, steps.indexOf(normalized as (typeof steps)[number]));

  return (
    <ol className="mt-8 grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step} className="flex flex-col gap-2">
            <span
              className={cn(
                'h-1.5 rounded-full transition-colors',
                done ? 'bg-signal' : 'bg-smoke-200',
              )}
            />
            <span
              className={cn(
                'text-xs font-medium leading-tight',
                index === current ? 'text-ink' : done ? 'text-smoke-500' : 'text-smoke-400',
              )}
            >
              {t.orderStatus[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Row({
  label,
  value,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-smoke-500">{label}</dt>
      <dd
        className={cn(
          'text-right',
          mono ? 'font-mono text-sm' : 'text-sm',
          emphasis ? 'font-bold text-signal' : 'font-medium text-ink',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
