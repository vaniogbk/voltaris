'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreditCard, Landmark, Lock, ShoppingBag } from 'lucide-react';
import { StripePaymentPanel } from './StripePaymentPanel';
import {
  CheckoutSteps,
  GuaranteeBand,
  PaymentTimeline,
  type CheckoutStep,
} from './CheckoutReassurance';
import { useCart } from '@/lib/cart-store';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch, ApiError, type CartQuote } from '@/lib/api';
import { getDictionary, interpolate } from '@/i18n';
import { formatPrice } from '@/lib/format';
import { path, type Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

type Country = 'FR' | 'DE';
type Method = 'CARD' | 'BANK_TRANSFER';

interface AddressForm {
  firstName: string;
  lastName: string;
  company: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: Country;
  phone: string;
}

const emptyAddress = (country: Country): AddressForm => ({
  firstName: '',
  lastName: '',
  company: '',
  line1: '',
  line2: '',
  postalCode: '',
  city: '',
  country,
  phone: '',
});

export function CheckoutView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const router = useRouter();
  const { user } = useAuth();
  const { lines, hydrated, clear } = useCart();

  const defaultCountry: Country = locale === 'de' ? 'DE' : 'FR';

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shipping, setShipping] = useState<AddressForm>(emptyAddress(defaultCountry));
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState<AddressForm>(emptyAddress(defaultCountry));
  const [method, setMethod] = useState<Method>('BANK_TRANSFER');
  const [terms, setTerms] = useState(false);
  const [note, setNote] = useState('');

  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [cardEnabled, setCardEnabled] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ clientSecret: string; orderNumber: string } | null>(null);

  // Pré-remplissage depuis le compte connecté.
  useEffect(() => {
    if (!user) return;
    setEmail((v) => v || user.email);
    setPhone((v) => v || user.phone || '');
    setShipping((current) =>
      current.firstName || current.lastName
        ? current
        : { ...current, firstName: user.firstName, lastName: user.lastName, company: user.company ?? '' },
    );
  }, [user]);

  useEffect(() => {
    apiFetch<{ methods: Array<{ id: Method; enabled: boolean }> }>('/api/checkout/payment-methods')
      .then((data) => setCardEnabled(data.methods.some((m) => m.id === 'CARD' && m.enabled)))
      .catch(() => setCardEnabled(false));
  }, []);

  const items = useMemo(
    () => lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    [lines],
  );

  // Le devis est recalculé côté serveur à chaque changement de panier ou de
  // pays : les frais de port dépendent du poids total et de la destination.
  const requestId = useRef(0);
  const fetchQuote = useCallback(async () => {
    if (!items.length) return;
    const id = ++requestId.current;
    try {
      const data = await apiFetch<CartQuote>('/api/checkout/quote', {
        method: 'POST',
        body: { items, country: shipping.country },
      });
      if (id === requestId.current) {
        setQuote(data);
        setQuoteError(null);
      }
    } catch (err) {
      if (id !== requestId.current) return;
      setQuote(null);
      setQuoteError(err instanceof ApiError ? err.message : t.common.error);
    }
  }, [items, shipping.country, t.common.error]);

  useEffect(() => {
    void fetchQuote();
  }, [fetchQuote]);

  if (!hydrated) {
    return (
      <div className="container-page py-16">
        <div className="skeleton h-96 rounded-card" />
      </div>
    );
  }

  if (lines.length === 0 && !payment) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-smoke-300" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">{t.cart.empty}</h1>
        <Link href={path(locale, 'catalog')} className="btn btn-primary btn-lg mt-7">
          {t.cart.emptyCta}
        </Link>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await apiFetch<{
        order: { orderNumber: string };
        payment:
          | { method: 'CARD'; clientSecret: string }
          | { method: 'BANK_TRANSFER'; instructions: unknown };
      }>('/api/checkout/orders', {
        method: 'POST',
        body: {
          items,
          email: email.trim(),
          phone: phone.trim() || undefined,
          locale,
          shippingAddress: cleanAddress(shipping),
          billingAddress: billingSame ? undefined : cleanAddress(billing),
          paymentMethod: method,
          customerNote: note.trim() || undefined,
          acceptTerms: true,
        },
      });

      const orderNumber = response.order.orderNumber;

      if (response.payment.method === 'CARD') {
        setPayment({ clientSecret: response.payment.clientSecret, orderNumber });
        setSubmitting(false);
        return;
      }

      // Virement : la commande est enregistrée, le panier peut être vidé.
      clear();
      router.push(
        `${path(locale, 'checkout')}/confirmation/${orderNumber}?email=${encodeURIComponent(email.trim())}`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
      setSubmitting(false);
    }
  }

  // La commande tient sur une page : l'étape affichée suit donc le
  // remplissage. Tant que la livraison est incomplète, on est à « Livraison » ;
  // dès qu'elle l'est, le fil passe à « Paiement », juste en dessous.
  const deliveryDone =
    email.trim().length > 3 &&
    Boolean(
      shipping.firstName.trim() &&
        shipping.lastName.trim() &&
        shipping.line1.trim() &&
        shipping.postalCode.trim() &&
        shipping.city.trim(),
    );
  const step: CheckoutStep = payment ? 'payment' : deliveryDone ? 'payment' : 'delivery';

  const returnUrl =
    typeof window !== 'undefined' && payment
      ? `${window.location.origin}${path(locale, 'checkout')}/confirmation/${payment.orderNumber}?email=${encodeURIComponent(email.trim())}`
      : '';

  return (
    <div className="container-page py-8 lg:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-ink">{t.checkout.title}</h1>

      <CheckoutSteps locale={locale} current={step} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div>
          {payment ? (
            <section className="card p-6">
              <h2 className="text-lg font-bold tracking-tight text-ink">
                {t.checkout.payment.card}
              </h2>
              <p className="mb-6 mt-1 text-sm text-smoke-500">
                {t.confirmation.orderNumber} <strong>{payment.orderNumber}</strong>
              </p>
              <StripePaymentPanel
                clientSecret={payment.clientSecret}
                amountCents={quote?.totalCents ?? 0}
                returnUrl={returnUrl}
                locale={locale}
              />
            </section>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              {/* ------------------------------------------------ contact */}
              <section className="card p-6">
                <h2 className="mb-4 text-lg font-bold tracking-tight text-ink">
                  {t.checkout.contact.title}
                </h2>


                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t.checkout.contact.email} hint={t.checkout.contact.emailHint} required>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="field"
                    />
                  </Field>
                  <Field label={t.checkout.contact.phone} hint={t.checkout.contact.phoneHint}>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="field"
                    />
                  </Field>
                </div>
              </section>

              {/* ----------------------------------------------- livraison */}
              <section className="card p-6">
                <h2 className="mb-4 text-lg font-bold tracking-tight text-ink">
                  {t.checkout.address.title}
                </h2>
                <AddressFields
                  value={shipping}
                  onChange={setShipping}
                  locale={locale}
                  autoCompletePrefix="shipping"
                />

                <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={billingSame}
                    onChange={(e) => setBillingSame(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-signal"
                  />
                  <span className="text-smoke-600">{t.checkout.address.billingSame}</span>
                </label>
              </section>

              {!billingSame && (
                <section className="card p-6">
                  <h2 className="mb-4 text-lg font-bold tracking-tight text-ink">
                    {t.checkout.address.billingTitle}
                  </h2>
                  <AddressFields
                    value={billing}
                    onChange={setBilling}
                    locale={locale}
                    autoCompletePrefix="billing"
                  />
                </section>
              )}

              {/* ------------------------------------------------ paiement */}
              <section className="card p-6">
                <h2 className="mb-4 text-lg font-bold tracking-tight text-ink">
                  {t.checkout.payment.title}
                </h2>

                {/* Groupe de boutons radio : le fieldset porte l'intitulé
                    commun pour les lecteurs d'écran, le titre visible étant
                    déjà rendu par le h2 ci-dessus. */}
                <fieldset className="space-y-3">
                  <legend className="sr-only">{t.checkout.payment.title}</legend>
                  <PaymentOption
                    icon={Landmark}
                    title={t.checkout.payment.transfer}
                    body={t.checkout.payment.transferBody}
                    selected={method === 'BANK_TRANSFER'}
                    onSelect={() => setMethod('BANK_TRANSFER')}
                  />
                  <PaymentOption
                    icon={CreditCard}
                    title={t.checkout.payment.card}
                    body={
                      cardEnabled ? t.checkout.payment.cardBody : t.checkout.payment.cardUnavailable
                    }
                    selected={method === 'CARD'}
                    disabled={!cardEnabled}
                    onSelect={() => setMethod('CARD')}
                  />
                </fieldset>

                <div className="mt-5">
                  <label className="field-label" htmlFor="checkout-note">
                    {t.checkout.payment.note}
                  </label>
                  <textarea
                    id="checkout-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1000}
                    className="field"
                    rows={3}
                  />
                </div>

                <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    required
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-signal"
                  />
                  <span className="text-smoke-600">
                    {t.checkout.payment.terms}{' '}
                    <Link
                      href={path(locale, 'terms')}
                      target="_blank"
                      className="font-semibold text-signal hover:underline"
                    >
                      {t.footer.terms}
                    </Link>
                  </span>
                </label>
              </section>

              {/* Le virement engage l'acheteur sans retour possible : la suite
                  doit être connue avant de valider, pas découverte après. */}
              {method === 'BANK_TRANSFER' && <PaymentTimeline locale={locale} />}

              <GuaranteeBand locale={locale} />

              {(error || quoteError) && (
                <p
                  role="alert"
                  className="rounded-lg bg-signal-soft px-4 py-3 text-sm font-medium text-signal"
                >
                  {error ?? quoteError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !quote || !terms}
                className="btn btn-primary btn-lg w-full"
              >
                {submitting ? (
                  t.checkout.payment.processing
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    {method === 'CARD'
                      ? interpolate(t.checkout.payment.submitCard, {
                          amount: formatPrice(quote?.totalCents ?? 0, locale),
                        })
                      : t.checkout.payment.submitTransfer}
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <OrderSummary locale={locale} quote={quote} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------- sous-vues

function OrderSummary({ locale, quote }: { locale: Locale; quote: CartQuote | null }) {
  const t = getDictionary(locale);
  const { lines } = useCart();

  return (
    <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
      <div className="card p-6">
        <h2 className="text-lg font-bold tracking-tight text-ink">{t.checkout.summary.title}</h2>

        <ul className="mt-5 space-y-3.5">
          {lines.map((line) => (
            <li key={line.productId} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-smoke-100">
                {line.imageUrl && (
                  <Image src={line.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                )}
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[0.625rem] font-bold text-white">
                  {line.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{line.name}</p>
                <p className="text-xs text-smoke-400">{line.sku}</p>
              </div>
              <p className="text-sm font-semibold tabular text-ink">
                {formatPrice(line.priceCents * line.quantity, locale, line.currency)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2.5 border-t border-smoke-200 pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-smoke-500">{t.cart.subtotal}</dt>
            <dd className="font-semibold tabular text-ink">
              {quote ? formatPrice(quote.subtotalCents, locale) : '—'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-smoke-500">
              {t.cart.shipping}
              {quote && <span className="ml-1 text-xs text-smoke-400">({quote.shipping.carrier})</span>}
            </dt>
            <dd className="font-semibold tabular text-ink">
              {!quote ? (
                '—'
              ) : quote.shipping.free ? (
                <span className="text-emerald-700">{t.cart.shippingFree}</span>
              ) : (
                formatPrice(quote.shipping.priceCents, locale)
              )}
            </dd>
          </div>
          {quote && quote.vatCents > 0 && (
            <div className="flex justify-between text-xs">
              <dt className="text-smoke-400">{t.cart.vatIncluded}</dt>
              <dd className="tabular text-smoke-400">{formatPrice(quote.vatCents, locale)}</dd>
            </div>
          )}
        </dl>

        <div className="mt-5 flex items-baseline justify-between border-t border-smoke-200 pt-5">
          <span className="text-base font-bold text-ink">{t.cart.total}</span>
          <span className="text-2xl font-extrabold tabular text-ink">
            {quote ? formatPrice(quote.totalCents, locale) : '—'}
          </span>
        </div>

        {quote && (
          <p className="mt-3 text-xs text-smoke-500">
            {interpolate(t.checkout.summary.eta, {
              min: quote.shipping.etaMinDays,
              max: quote.shipping.etaMaxDays,
            })}
          </p>
        )}

        <Link
          href={path(locale, 'cart')}
          className="btn btn-ghost btn-sm mt-4 w-full text-smoke-500"
        >
          {t.checkout.summary.edit}
        </Link>
      </div>
    </aside>
  );
}

function AddressFields({
  value,
  onChange,
  locale,
  autoCompletePrefix,
}: {
  value: AddressForm;
  onChange: (next: AddressForm) => void;
  locale: Locale;
  autoCompletePrefix: string;
}) {
  const t = getDictionary(locale);
  const set = (patch: Partial<AddressForm>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t.checkout.address.firstName} required>
        <input
          required
          autoComplete={`${autoCompletePrefix} given-name`}
          value={value.firstName}
          onChange={(e) => set({ firstName: e.target.value })}
          className="field"
        />
      </Field>
      <Field label={t.checkout.address.lastName} required>
        <input
          required
          autoComplete={`${autoCompletePrefix} family-name`}
          value={value.lastName}
          onChange={(e) => set({ lastName: e.target.value })}
          className="field"
        />
      </Field>

      <Field label={t.checkout.address.company} className="sm:col-span-2">
        <input
          autoComplete={`${autoCompletePrefix} organization`}
          value={value.company}
          onChange={(e) => set({ company: e.target.value })}
          className="field"
        />
      </Field>

      <Field label={t.checkout.address.line1} required className="sm:col-span-2">
        <input
          required
          autoComplete={`${autoCompletePrefix} address-line1`}
          value={value.line1}
          onChange={(e) => set({ line1: e.target.value })}
          className="field"
        />
      </Field>

      <Field label={t.checkout.address.line2} className="sm:col-span-2">
        <input
          autoComplete={`${autoCompletePrefix} address-line2`}
          value={value.line2}
          onChange={(e) => set({ line2: e.target.value })}
          className="field"
        />
      </Field>

      <Field label={t.checkout.address.postalCode} required>
        <input
          required
          inputMode="numeric"
          autoComplete={`${autoCompletePrefix} postal-code`}
          value={value.postalCode}
          onChange={(e) => set({ postalCode: e.target.value })}
          className="field"
        />
      </Field>

      <Field label={t.checkout.address.city} required>
        <input
          required
          autoComplete={`${autoCompletePrefix} address-level2`}
          value={value.city}
          onChange={(e) => set({ city: e.target.value })}
          className="field"
        />
      </Field>

      <Field label={t.checkout.address.country} required className="sm:col-span-2">
        <select
          required
          autoComplete={`${autoCompletePrefix} country`}
          value={value.country}
          onChange={(e) => set({ country: e.target.value as Country })}
          className="field"
        >
          <option value="FR">{t.common.france}</option>
          <option value="DE">{t.common.germany}</option>
        </select>
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="field-label">
        {label}
        {required && <span className="ml-0.5 text-signal">*</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function PaymentOption({
  icon: Icon,
  title,
  body,
  selected,
  disabled,
  onSelect,
}: {
  icon: typeof CreditCard;
  title: string;
  body: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer gap-3.5 rounded-lg border-2 p-4 transition-colors',
        selected ? 'border-signal bg-signal-soft/40' : 'border-smoke-200 hover:border-smoke-300',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        type="radio"
        name="payment-method"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
      />
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', selected ? 'text-signal' : 'text-smoke-400')} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-smoke-500">{body}</span>
      </span>
    </label>
  );
}

/** Retire les champs vides pour ne pas envoyer de chaînes vides à l'API. */
function cleanAddress(address: AddressForm) {
  return {
    firstName: address.firstName.trim(),
    lastName: address.lastName.trim(),
    company: address.company.trim() || undefined,
    line1: address.line1.trim(),
    line2: address.line2.trim() || undefined,
    postalCode: address.postalCode.trim(),
    city: address.city.trim(),
    country: address.country,
    phone: address.phone.trim() || undefined,
  };
}
