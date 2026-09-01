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
      { protocol: 'https', hostname: '**.stihl-market.eu' },
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
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
