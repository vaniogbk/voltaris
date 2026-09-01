import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { PAGES } from '@/content/pages';
import { path, type Locale } from '@/lib/routes';

const KEY = 'contact' as const;

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

/**
 * La page contact se réduit au formulaire : les coordonnées détaillées vivent
 * dans les mentions légales, où elles sont obligatoires. Le composant gère le
 * repli lorsque Telegram n'est pas configuré.
 */
export default function ContactPage({ params }: { params: { locale: Locale } }) {
  const page = PAGES[params.locale][KEY];

  return (
    <div className="container-page max-w-2xl py-12 lg:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{page.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-smoke-600">{page.intro}</p>

      <ContactForm locale={params.locale} />
    </div>
  );
}
