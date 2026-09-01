import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { HeroBackdrop, type HeroImage } from '@/components/HeroBackdrop';
import { TrustBand } from '@/components/TrustBand';
import { catalog, type ProductCard as Product, type Category } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { home, path, type Locale } from '@/lib/routes';

export const revalidate = 60;

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const t = getDictionary(locale);

  let deals: Product[] = [];
  let featured: Product[] = [];
  let categories: Category[] = [];
  let heroImages: HeroImage[] = [];

  try {
    const data = await catalog.home(locale);
    deals = data.deals;
    featured = data.featured;
    categories = data.categories;
    heroImages = data.heroImages;
  } catch {
    // La page reste rendue même si l'API est indisponible : le visiteur voit
    // la marque et la navigation plutôt qu'une erreur 500.
  }


  const dealsHref = `${path(locale, 'catalog')}?condition=USED,REFURBISHED`;

  return (
    <>
      <Hero locale={locale} images={heroImages} />

      <TrustBand locale={locale} />

      {deals.length > 0 && (
        <Section
          title={t.home.dealsTitle}
          subtitle={t.home.dealsSubtitle}
          href={dealsHref}
          linkLabel={t.home.seeAll}
          accent
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((product, i) => (
              <ProductCard key={product.id} product={product} locale={locale} priority={i < 3} />
            ))}
          </div>
        </Section>
      )}

      {categories.length > 0 && (
        <Section title={t.home.categoriesTitle}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`${path(locale, 'catalog')}?category=${category.slug}`}
                className="card-interactive group flex flex-col justify-between p-5"
              >
                <span className="text-[0.9375rem] font-semibold leading-snug text-ink">
                  {category.name}
                </span>
                <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-smoke-500 transition-colors group-hover:text-signal">
                  {category.productCount}{' '}
                  {category.productCount > 1 ? t.catalog.resultsMany : t.catalog.resultsOne}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {featured.length > 0 && (
        <Section
          title={t.home.featuredTitle}
          subtitle={t.home.featuredSubtitle}
          href={path(locale, 'catalog')}
          linkLabel={t.home.seeAll}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </Section>
      )}

      <OrganizationSchema locale={locale} />
    </>
  );
}

// ------------------------------------------------------------------ hero

/**
 * La carte produit qui flottait ici a été retirée : elle masquait la moitié
 * des photos qui défilent derrière. Le hero ne porte plus que le message et
 * les deux appels à l'action ; les machines se vendent d'elles-mêmes juste
 * en dessous, dans la section « Occasions du moment ».
 */
function Hero({ locale, images }: { locale: Locale; images: HeroImage[] }) {
  const t = getDictionary(locale);
  const dealsHref = `${path(locale, 'catalog')}?condition=USED,REFURBISHED`;

  return (
    <section className="relative overflow-hidden border-b border-smoke-200 bg-white lg:min-h-[34rem]">
      <HeroBackdrop images={images} />

      {/* pb-80 sur téléphone : la place où HeroBackdrop pose son éventail,
          sous les boutons. En lg il repasse en fond et n'a plus besoin. */}
      <div className="container-page relative pb-80 pt-16 lg:py-24">
        {/* La colonne de texte s'arrête aux deux tiers : au-delà, elle
            recouvrirait les photos au lieu de cohabiter avec elles. */}
        <div className="max-w-xl animate-fade-up lg:max-w-2xl">
          <p className="eyebrow">{t.home.heroEyebrow}</p>
          <h1 className="mt-4 whitespace-pre-line text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {t.home.heroTitle}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-smoke-600 sm:text-lg">
            {t.home.heroBody}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={dealsHref} className="btn btn-primary btn-lg">
              {t.home.heroCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={path(locale, 'catalog')} className="btn btn-outline btn-lg">
              {t.home.heroCtaSecondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- section

function Section({
  title,
  subtitle,
  href,
  linkLabel,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="container-page py-14 lg:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {accent && <span className="mb-2 block h-1 w-10 rounded-full bg-signal" />}
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-smoke-500">{subtitle}</p>}
        </div>
        {href && linkLabel && (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-signal"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// ------------------------------------------------------------ données structurées

function OrganizationSchema({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stihl-market.eu';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: t.meta.siteName,
    description: t.meta.homeDescription,
    url: `${siteUrl}${home(locale)}`,
    areaServed: [
      { '@type': 'Country', name: 'France' },
      { '@type': 'Country', name: 'Deutschland' },
    ],
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Credit Card, SEPA Bank Transfer',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}${path(locale, 'catalog')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      // Contenu généré par nous, pas par l'utilisateur : sérialisation sûre.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
