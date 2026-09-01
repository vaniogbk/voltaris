import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import '../globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';
import { catalog, type Category } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { LOCALES, isLocale, type Locale } from '@/lib/routes';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0B0B0C',
  width: 'device-width',
  initialScale: 1,
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stihl-market.eu';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const t = getDictionary(params.locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.meta.homeTitle,
      template: `%s — ${t.meta.siteName}`,
    },
    description: t.meta.homeDescription,
    applicationName: t.meta.siteName,
    alternates: {
      canonical: `/${params.locale}`,
      languages: { fr: '/fr', de: '/de', 'x-default': '/fr' },
    },
    openGraph: {
      type: 'website',
      siteName: t.meta.siteName,
      title: t.meta.homeTitle,
      description: t.meta.homeDescription,
      locale: params.locale === 'de' ? 'de_DE' : 'fr_FR',
      alternateLocale: params.locale === 'de' ? 'fr_FR' : 'de_DE',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.meta.homeTitle,
      description: t.meta.homeDescription,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;

  // La navigation dépend du catalogue : si l'API est injoignable, le site doit
  // continuer à rendre plutôt que d'afficher une page d'erreur complète.
  let categories: Category[] = [];
  try {
    const data = await catalog.categories(locale);
    categories = data.categories;
  } catch {
    categories = [];
  }

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          {locale === 'de' ? 'Zum Inhalt springen' : 'Aller au contenu'}
        </a>

        <AuthProvider>
          <Header locale={locale} categories={categories} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer locale={locale} categories={categories} />
        </AuthProvider>
      </body>
    </html>
  );
}
