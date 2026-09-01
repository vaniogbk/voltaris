import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderTracker } from '@/components/tracking/OrderTracker';
import { getDictionary } from '@/i18n';
import { path, type Locale } from '@/lib/routes';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const t = getDictionary(params.locale);
  return {
    title: t.tracking.title,
    description: t.tracking.subtitle,
    alternates: {
      canonical: path(params.locale, 'tracking'),
      languages: { fr: path('fr', 'tracking'), de: path('de', 'tracking') },
    },
    // La page elle-même est utile et indexable ; les résultats ne le sont pas,
    // mais ils ne vivent que côté client, jamais dans une URL indexable.
  };
}

export default function TrackingPage({ params }: { params: { locale: Locale } }) {
  return (
    <Suspense
      fallback={
        <div className="container-page max-w-xl py-16">
          <div className="skeleton h-80 rounded-card" />
        </div>
      }
    >
      <OrderTracker locale={params.locale} />
    </Suspense>
  );
}
