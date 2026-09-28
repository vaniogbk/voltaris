/**
 * Les segments d'URL sont traduits pour le référencement local : un visiteur
 * allemand navigue sur /de/katalog, Next rend /de/catalog. Cette table doit
 * rester alignée sur SEGMENTS dans src/lib/routes.ts.
 */
const SEGMENTS = {
  catalog: { fr: 'catalogue', de: 'katalog' },
  product: { fr: 'produit', de: 'produkt' },
  cart: { fr: 'panier', de: 'warenkorb' },
  checkout: { fr: 'commande', de: 'kasse' },
  account: { fr: 'compte', de: 'konto' },
  tracking: { fr: 'suivi-commande', de: 'sendungsverfolgung' },
  document: { fr: 'document', de: 'beleg' },
  shipping: { fr: 'livraison', de: 'versand' },
  terms: { fr: 'cgv', de: 'agb' },
  legal: { fr: 'mentions-legales', de: 'impressum' },
  privacy: { fr: 'confidentialite', de: 'datenschutz' },
  contact: { fr: 'contact', de: 'kontakt' },
};

function localizedRewrites() {
  const rules = [];
  for (const [canonical, byLocale] of Object.entries(SEGMENTS)) {
    for (const [locale, localized] of Object.entries(byLocale)) {
      if (localized === canonical) continue;
      rules.push(
        { source: `/${locale}/${localized}`, destination: `/${locale}/${canonical}` },
        { source: `/${locale}/${localized}/:path*`, destination: `/${locale}/${canonical}/:path*` },
      );
    }
  }
  return rules;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Autorise un CDN d'images distant si vous en configurez un plus tard.
      { protocol: 'https', hostname: '**.voltaris.eu' },
    ],
  },

  async rewrites() {
    return { beforeFiles: localizedRewrites() };
  },

  // Aucune redirection de la racine ici : les `redirects` de cette
  // configuration s'exécutent AVANT le middleware. Une règle `/` → `/fr`
  // court-circuiterait la détection de langue, et tout visiteur — y compris
  // avec un navigateur allemand — atterrirait en français.
  // La racine est traitée par src/middleware.ts.


  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/produits/:path*',
        // Surtout pas `immutable` : ces fichiers gardent le même nom quand
        // leur contenu change — une illustration remplacée par la photo du
        // produit, par exemple. Avec un an d'immutabilité, un visiteur déjà
        // venu ne reverrait jamais la nouvelle image.
        //
        // Le navigateur revalide donc toutes les heures, tandis que le CDN
        // garde une semaine et sert l'ancienne version le temps de récupérer
        // la nouvelle. Le coût en performance est nul, la mise à jour arrive.
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
