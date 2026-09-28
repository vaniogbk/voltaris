import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voltaris.eu';

export default function robots(): MetadataRoute.Robots {
  // Un environnement de préproduction ne doit jamais être indexé.
  const isProduction = process.env.NEXT_PUBLIC_ENV === 'production';

  if (!isProduction) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/*/panier',
          '/*/warenkorb',
          '/*/commande',
          '/*/kasse',
          '/*/compte',
          '/*/konto',
          '/*/admin',
          // Les combinaisons de filtres génèrent un nombre illimité d'URL
          // quasi dupliquées : inutile de dépenser du budget de crawl.
          '/*?*sort=',
          '/*?*page=',
          '/*?*minPrice=',
          '/*?*maxPrice=',
          '/*?*brand=',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
