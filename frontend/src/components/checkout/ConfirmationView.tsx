'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Copy,
  FileDown,
  Landmark,
  Printer,
  QrCode,
} from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { getDictionary, interpolate } from '@/i18n';
import { formatDate, formatIban, formatPrice } from '@/lib/format';
import { path, type Locale } from '@/lib/routes';
import type { BankTransferInstructions, OrderSummary } from '@/lib/api';

interface Props {
  locale: Locale;
  order: OrderSummary;
  items: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    totalCents: number;
    imageUrl: string | null;
  }>;
  payment: { method: 'BANK_TRANSFER'; instructions: BankTransferInstructions } | { method: 'CARD' };
}

export function ConfirmationView({ locale, order, items, payment }: Props) {
  const t = getDictionary(locale);
  const clear = useCart((s) => s.clear);

  // Le panier est vidé ici plutôt qu'à la soumission : après un paiement carte,
  // le client revient de Stripe et n'a jamais repassé par le formulaire.
  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <div className="container-page max-w-3xl py-12 lg:py-16">
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink">{t.confirmation.title}</h1>
        <p className="mt-2 text-base text-smoke-600">{t.confirmation.thanks}</p>
      </div>

      {/* Aucun e-mail n'est envoyé : cette page est le seul endroit où le
          client obtient son numéro de commande. Elle doit donc insister pour
          qu'il le conserve, et lui donner un moyen d'en garder une copie. */}
      <section className="mt-8 rounded-card border-2 border-ink bg-white p-6 text-center shadow-card">
        <h2 className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-signal">
          <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
          {t.confirmation.keepNumberTitle}
        </h2>

        <p className="mt-3 select-all font-mono text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {order.orderNumber}
        </p>

        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-smoke-600">
          {interpolate(t.confirmation.keepNumberBody, { email: order.email })}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-3 print:hidden">
          <a
            href={`${path(locale, 'document', order.orderNumber)}?email=${encodeURIComponent(order.email)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-md"
          >
            <FileDown className="h-4 w-4" />
            {t.confirmation.downloadInvoice}
          </a>
          <CopyButton
            value={order.orderNumber}
            label={t.confirmation.copy}
            copiedLabel={t.confirmation.copied}
          />
          <button type="button" onClick={() => window.print()} className="btn btn-outline btn-md">
            <Printer className="h-4 w-4" />
            {t.confirmation.printPage}
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-smoke-500 print:hidden">
          {t.confirmation.downloadHint}
        </p>
      </section>

      {payment.method === 'BANK_TRANSFER' && (
        <TransferPanel locale={locale} instructions={payment.instructions} />
      )}

      <section className="card mt-8 p-6">
        <h2 className="text-lg font-bold tracking-tight text-ink">{t.checkout.summary.title}</h2>

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
            <dt className="text-smoke-500">{t.cart.subtotal}</dt>
            <dd className="tabular text-ink">
              {formatPrice(order.subtotalCents, locale, order.currency)}
            </dd>
          </div>
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
              {t.checkout.address.title}
            </h3>
            <address className="mt-2 not-italic leading-relaxed text-smoke-600">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              <br />
              {order.shippingAddress.company && (
                <>
                  {order.shippingAddress.company}
                  <br />
                </>
              )}
              {order.shippingAddress.line1}
              <br />
              {order.shippingAddress.line2 && (
                <>
                  {order.shippingAddress.line2}
                  <br />
                </>
              )}
              {order.shippingAddress.postalCode} {order.shippingAddress.city}
              <br />
              {order.shippingAddress.country === 'DE' ? t.common.germany : t.common.france}
            </address>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-smoke-400">
              {t.checkout.payment.title}
            </h3>
            <p className="mt-2 text-smoke-600">{t.paymentMethod[order.paymentMethod]}</p>
            <p className="mt-1 text-xs text-smoke-400">
              {t.account.orderStatus} :{' '}
              {t.orderStatus[order.status as keyof typeof t.orderStatus] ?? order.status}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`${path(locale, 'tracking')}?order=${order.orderNumber}&email=${encodeURIComponent(order.email)}`}
          className="btn btn-dark btn-lg"
        >
          {t.confirmation.trackOrder}
        </Link>
        <Link href={path(locale, 'catalog')} className="btn btn-outline btn-lg">
          {t.confirmation.continueShopping}
        </Link>
      </div>
    </div>
  );
}

/** Bouton de copie autonome, réutilisable hors du tableau de virement. */
function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* presse-papiers refusé : le numéro reste sélectionnable */
        }
      }}
      className="btn btn-dark btn-md"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? copiedLabel : label}
    </button>
  );
}

function TransferPanel({
  locale,
  instructions,
}: {
  locale: Locale;
  instructions: BankTransferInstructions;
}) {
  const t = getDictionary(locale);

  return (
    <section className="mt-10 rounded-card border-2 border-ink bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-3">
        <Landmark className="h-6 w-6 text-signal" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight text-ink">
          {t.confirmation.transferTitle}
        </h2>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-smoke-600">{t.confirmation.transferIntro}</p>

      {instructions.dueAt && (
        <p className="mt-2 text-sm font-semibold text-signal">
          {interpolate(t.confirmation.transferDeadline, {
            date: formatDate(instructions.dueAt, locale),
          })}
        </p>
      )}

      {instructions.qrCodeSvg && (
        <div className="mt-6 flex flex-col items-center gap-5 rounded-lg border border-smoke-200 bg-smoke-50 p-5 sm:flex-row sm:items-start">
          <div
            className="shrink-0 rounded-lg bg-white p-3 shadow-sm [&>svg]:block [&>svg]:h-36 [&>svg]:w-36"
            // SVG produit par notre API à partir de nos propres données
            // bancaires : aucune saisie client n'y entre.
            dangerouslySetInnerHTML={{ __html: instructions.qrCodeSvg }}
          />
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
              <QrCode className="h-4 w-4 text-signal" aria-hidden="true" />
              {t.confirmation.qrTitle}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-smoke-600">{t.confirmation.qrBody}</p>
            <p className="mt-2 text-xs leading-relaxed text-smoke-500">{t.confirmation.qrFallback}</p>
          </div>
        </div>
      )}

      <dl className="mt-6 divide-y divide-smoke-200 rounded-lg border border-smoke-200 bg-smoke-50">
        <TransferRow label={t.confirmation.holder} value={instructions.holder} />
        <TransferRow label={t.confirmation.bank} value={instructions.bankName} />
        <TransferRow
          label={t.confirmation.iban}
          value={formatIban(instructions.iban)}
          copyValue={instructions.iban}
          locale={locale}
          mono
        />
        <TransferRow
          label={t.confirmation.bic}
          value={instructions.bic}
          copyValue={instructions.bic}
          locale={locale}
          mono
        />
        <TransferRow
          label={t.confirmation.amount}
          value={formatPrice(instructions.amountCents, locale, instructions.currency)}
          copyValue={(instructions.amountCents / 100).toFixed(2)}
          locale={locale}
          emphasis
        />
        <TransferRow
          label={t.confirmation.reference}
          value={instructions.reference}
          copyValue={instructions.reference}
          locale={locale}
          mono
          emphasis
        />
      </dl>

      {/* Le compte est au nom d'une personne physique, pas de l'enseigne. Sans
          cette phrase, l'acheteur découvre un nom inconnu au moment de valider
          son virement — l'écart entre enseigne et bénéficiaire est l'un des
          premiers signaux de fraude qu'il cherchera. Mieux vaut l'expliquer
          que le laisser deviner. */}
      <p className="mt-4 text-xs leading-relaxed text-smoke-500">
        {interpolate(t.confirmation.beneficiaryNote, {
          holder: instructions.holder,
          shop: t.meta.siteName,
        })}
      </p>

      <p className="mt-5 flex gap-2.5 rounded-lg border border-signal/25 bg-signal-soft p-4 text-sm leading-relaxed text-ink">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
        {t.confirmation.transferWarning}
      </p>
    </section>
  );
}

function TransferRow({
  label,
  value,
  copyValue,
  locale,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  copyValue?: string;
  locale?: Locale;
  mono?: boolean;
  emphasis?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const t = locale ? getDictionary(locale) : null;

  async function copy() {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* le presse-papiers peut être refusé : la valeur reste sélectionnable */
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-smoke-500">
        {label}
      </dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span
          className={[
            'truncate text-right',
            mono ? 'font-mono text-sm tracking-tight' : 'text-sm',
            emphasis ? 'font-bold text-signal' : 'font-medium text-ink',
          ].join(' ')}
        >
          {value}
        </span>
        {copyValue && (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded-md p-1.5 text-smoke-400 transition-colors hover:bg-smoke-200 hover:text-ink"
            aria-label={copied ? (t?.confirmation.copied ?? 'OK') : (t?.confirmation.copy ?? 'Copy')}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        )}
      </dd>
    </div>
  );
}
