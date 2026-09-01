import type { Metadata } from 'next';
import { CheckoutView } from '@/components/checkout/CheckoutView';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return {
    title: getDictionary(params.locale).checkout.title,
    robots: { index: false, follow: false },
  };
}

export default function CheckoutPage({ params }: { params: { locale: Locale } }) {
  return <CheckoutView locale={params.locale} />;
}
