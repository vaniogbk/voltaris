export const LOCALES = ['fr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Segments d'URL localisés.
 *
 * Le routeur Next.js utilise toujours le segment canonique (colonne de gauche).
 * Les segments allemands sont exposés au visiteur via les `rewrites` déclarées
 * dans next.config.mjs — un utilisateur allemand voit /de/kettensaegen, et Next
 * rend /de/catalog. C'est ce qui permet d'avoir des URL réellement en allemand
 * pour le référencement sans dupliquer l'arborescence de pages.
 */
export const SEGMENTS = {
  catalog: { fr: 'catalogue', de: 'katalog' },
  product: { fr: 'produit', de: 'produkt' },
  cart: { fr: 'panier', de: 'warenkorb' },
  checkout: { fr: 'commande', de: 'kasse' },
  /** Facture ou confirmation en PDF, servie à la demande. */
  document: { fr: 'document', de: 'beleg' },
  /** Suivi de commande sans compte : numéro + e-mail. */
  tracking: { fr: 'suivi-commande', de: 'sendungsverfolgung' },
  // `account` ne sert plus qu'à la connexion de l'équipe (/fr/compte/login).
  // Les clients n'ont pas de compte : ils passent par `tracking`.
  account: { fr: 'compte', de: 'konto' },
  admin: { fr: 'admin', de: 'admin' },
  shipping: { fr: 'livraison', de: 'versand' },
  terms: { fr: 'cgv', de: 'agb' },
  legal: { fr: 'mentions-legales', de: 'impressum' },
  privacy: { fr: 'confidentialite', de: 'datenschutz' },
  contact: { fr: 'contact', de: 'kontakt' },
} as const;

export type SegmentKey = keyof typeof SEGMENTS;

/** Construit une URL localisée : path('de', 'product', 'ms-500i') → /de/produkt/ms-500i */
export function path(locale: Locale, key: SegmentKey, ...rest: Array<string | number>): string {
  const parts = [locale, SEGMENTS[key][locale], ...rest.map(String)].filter(Boolean);
  return `/${parts.join('/')}`;
}

/** URL d'accueil localisée. */
export function home(locale: Locale): string {
  return `/${locale}`;
}

/** Chemin canonique (côté routeur) correspondant à une clé de segment. */
export function canonicalSegment(key: SegmentKey): string {
  return key;
}

/**
 * Reconstruit l'URL courante dans l'autre langue.
 * Les slugs produits diffèrent d'une langue à l'autre : le composant appelant
 * fournit `slugOverrides` quand il connaît la traduction du slug.
 */
export function switchLocale(
  pathname: string,
  target: Locale,
  slugOverrides?: Partial<Record<Locale, string>>,
): string {
  const segments = pathname.split('/').filter(Boolean);
  const current = segments[0];
  if (!current || !isLocale(current)) return `/${target}`;

  const rest = segments.slice(1);
  if (rest.length === 0) return `/${target}`;

  // Retrouve la clé du premier segment à partir de sa traduction actuelle.
  const key = (Object.keys(SEGMENTS) as SegmentKey[]).find(
    (k) => SEGMENTS[k][current] === rest[0],
  );
  if (!key) return `/${target}`;

  const tail = rest.slice(1);
  const override = slugOverrides?.[target];
  if (override && tail.length === 1) return path(target, key, override);

  return path(target, key, ...tail);
}
