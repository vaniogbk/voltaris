import type { MetadataRoute } from 'next';
import { catalog } from '@/lib/api';
import { LOCALES, path, home, type Locale, type SegmentKey } from '@/lib/routes';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voltaris.eu';

/** Pages statiques indexables, avec leur poids relatif. */
const STATIC_PAGES: Array<{ key: SegmentKey; priority: number; frequency: 'weekly' | 'monthly' }> = [
  { key: 'catalog', priority: 0.9, frequency: 'weekly' },
  { key: 'shipping', priority: 0.5, frequency: 'monthly' },
  { key: 'contact', priority: 0.5, frequency: 'monthly' },
  { key: 'terms', priority: 0.3, frequency: 'monthly' },
  { key: 'legal', priority: 0.3, frequency: 'monthly' },
  { key: 'privacy', priority: 0.3, frequency: 'monthly' },
];

/**
 * Chaque URL déclare ses équivalents dans l'autre langue via `alternates`,
 * ce qui produit les balises hreflang attendues par Google pour un site
 * ciblant deux marchés.
 */
function alternatesFor(build: (locale: Locale) => string) {
  return {
    languages: Object.fromEntries(
      LOCALES.map((locale) => [locale, `${SITE_URL}${build(locale)}`]),
    ) as Record<string, string>,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    entries.push({
      url: `${SITE_URL}${home(locale)}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
      alternates: alternatesFor(home),
    });

    for (const page of STATIC_PAGES) {
      entries.push({
        url: `${SITE_URL}${path(locale, page.key)}`,
        lastModified: now,
        changeFrequency: page.frequency,
        priority: page.priority,
        alternates: alternatesFor((l) => path(l, page.key)),
      });
    }
  }

  try {
    const data = await catalog.sitemap();

    for (const category of data.categories) {
      for (const locale of LOCALES) {
        const slug = category.slugs[locale];
        if (!slug) continue;
        entries.push({
          url: `${SITE_URL}${path(locale, 'catalog')}?category=${slug}`,
          lastModified: new Date(category.updatedAt),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }

    for (const product of data.products) {
      for (const locale of LOCALES) {
        const slug = product.slugs[locale];
        if (!slug) continue;
        entries.push({
          url: `${SITE_URL}${path(locale, 'product', slug)}`,
          lastModified: new Date(product.updatedAt),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: Object.fromEntries(
              LOCALES.filter((l) => product.slugs[l]).map((l) => [
                l,
                `${SITE_URL}${path(l, 'product', product.slugs[l])}`,
              ]),
            ),
          },
        });
      }
    }
  } catch {
    // Sitemap partiel plutôt qu'échec de build si l'API est indisponible.
  }

  return entries;
}
