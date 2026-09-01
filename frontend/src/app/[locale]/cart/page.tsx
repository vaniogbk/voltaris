import type { Metadata } from 'next';
import { CartView } from '@/components/CartView';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return {
    title: getDictionary(params.locale).cart.title,
    robots: { index: false, follow: false },
  };
}

export default function CartPage({ params }: { params: { locale: Locale } }) {
  return <CartView locale={params.locale} />;
}
