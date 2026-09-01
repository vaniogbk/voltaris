'use client';

import { useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Lock } from 'lucide-react';
import { getDictionary, interpolate } from '@/i18n';
import { formatPrice } from '@/lib/format';
import type { Locale } from '@/lib/routes';

let stripePromise: Promise<Stripe | null> | null = null;

/** Le SDK Stripe n'est chargé qu'au moment où un paiement carte est réellement engagé. */
function getStripePromise() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

interface Props {
  clientSecret: string;
  amountCents: number;
  returnUrl: string;
  locale: Locale;
}

export function StripePaymentPanel({ clientSecret, amountCents, returnUrl, locale }: Props) {
  const t = getDictionary(locale);
  const promise = getStripePromise();

  const options = useMemo(
    () =>
      ({
        clientSecret,
        locale,
        appearance: {
          theme: 'flat' as const,
          variables: {
            colorPrimary: '#E1000F',
            colorBackground: '#FFFFFF',
            colorText: '#0B0B0C',
            colorDanger: '#E1000F',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '8px',
            spacingUnit: '4px',
          },
          rules: {
            '.Input': { border: '1px solid #D2D3D6', boxShadow: 'none' },
            '.Input:focus': { border: '1px solid #E1000F', boxShadow: '0 0 0 3px rgba(225,0,15,.25)' },
            '.Label': { fontWeight: '500', color: '#0B0B0C' },
          },
        },
      }) as const,
    [clientSecret, locale],
  );

  if (!promise) {
    return (
      <p className="rounded-lg border border-signal/30 bg-signal-soft p-4 text-sm text-signal">
        {t.checkout.payment.cardUnavailable}
      </p>
    );
  }

  return (
    <Elements stripe={promise} options={options}>
      <PaymentForm amountCents={amountCents} returnUrl={returnUrl} locale={locale} />
    </Elements>
  );
}

function PaymentForm({
  amountCents,
  returnUrl,
  locale,
}: {
  amountCents: number;
  returnUrl: string;
  locale: Locale;
}) {
  const t = getDictionary(locale);
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    // On n'arrive ici que si la confirmation a échoué avant redirection :
    // en cas de succès, Stripe redirige vers return_url.
    if (result.error) {
      setError(result.error.message ?? t.common.error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <p role="alert" className="rounded-lg bg-signal-soft px-4 py-3 text-sm font-medium text-signal">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="btn btn-primary btn-lg w-full"
      >
        {submitting ? (
          t.checkout.payment.processing
        ) : (
          <>
            <Lock className="h-4 w-4" />
            {interpolate(t.checkout.payment.submitCard, {
              amount: formatPrice(amountCents, locale),
            })}
          </>
        )}
      </button>
    </form>
  );
}
