import type { Metadata } from 'next';
import { StaticPageView } from '@/components/StaticPageView';
import { PAGES } from '@/content/pages';
import type { Locale } from '@/lib/routes';
import { path } from '@/lib/routes';

const KEY = 'privacy' as const;

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const page = PAGES[params.locale][KEY];
  return {
    title: page.title,
    description: page.intro,
    alternates: {
      canonical: path(params.locale, KEY),
      languages: { fr: path('fr', KEY), de: path('de', KEY) },
    },
  };
}

export default function Page({ params }: { params: { locale: Locale } }) {
  return <StaticPageView page={PAGES[params.locale][KEY]} locale={params.locale} />;
}
