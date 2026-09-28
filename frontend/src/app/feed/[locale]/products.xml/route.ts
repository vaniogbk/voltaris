import { apiFetch } from '@/lib/api';
import { isLocale, path, type Locale } from '@/lib/routes';
import { COMPANY } from '@/config/company';

/**
 * Flux produit Google Merchant Center, au format RSS 2.0 avec l'espace de
 * noms `g:` attendu par Google.
 *
 *   https://votre-domaine.eu/feed/fr/products.xml
 *   https://votre-domaine.eu/feed/de/products.xml
 *
 * Déclarez un flux par pays dans Merchant Center : France → fr, Allemagne → de.
 *
 * Points d'attention volontaires :
 *   • `identifier_exists = no` sur les occasions : ce sont des pièces uniques
 *     sans GTIN. Sans cette mention, Google rejette l'article.
 *   • `mpn` reprend notre SKU pour le neuf, ce qui suffit à Google dès lors
 *     que la marque est fournie. Si vous obtenez les EAN de votre fournisseur,
 *     ajoutez-les : la visibilité en profite nettement.
 *   • Le prix est TTC, conformément à l'obligation d'affichage en France et
 *     en Allemagne pour les particuliers.
 */

export const revalidate = 3600;

interface FeedItem {
  sku: string;
  slug: string;
  name: string;
  description: string;
  brand: string;
  model: string | null;
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  priceCents: number;
  compareAtCents: number | null;
  currency: string;
  available: number;
  inStock: boolean;
  isUnique: boolean;
  weightGrams: number;
  images: string[];
  category: string;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voltaris.eu').replace(/\/$/, '');

/** Correspondance état interne → valeur acceptée par Google. */
const GOOGLE_CONDITION: Record<FeedItem['condition'], string> = {
  NEW: 'new',
  USED: 'used',
  REFURBISHED: 'refurbished',
};

/** Pays livré par locale, pour le bloc `g:shipping`. */
const SHIPPING_COUNTRY: Record<Locale, string> = { fr: 'FR', de: 'DE' };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Retire le balisage markdown : Google attend du texte brut. */
function plainText(markdown: string): string {
  return markdown
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^-\s+/gm, '')
    .replace(/^---$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4990);
}

const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency}`;

/**
 * Un article n'entre dans le flux que s'il a une vraie photographie.
 *
 * Google Merchant Center n'accepte pas le SVG, et sa politique interdit les
 * visuels de remplacement : soumettre nos placeholders ferait rejeter les
 * articles un par un, voire suspendre le compte pour « image non conforme ».
 * Les produits concernés restent visibles sur la boutique — ils sont
 * simplement absents de Google Shopping tant qu'ils n'ont pas de cliché.
 */
function hasRealPhoto(item: FeedItem): boolean {
  const first = item.images[0];
  if (!first) return false;
  if (first.toLowerCase().endsWith('.svg')) return false;
  // Dossier des visuels générés.
  return !first.startsWith('/produits/neuf/');
}

function buildItem(item: FeedItem, locale: Locale): string {
  const url = `${SITE_URL}${path(locale, 'product', item.slug)}`;
  const country = SHIPPING_COUNTRY[locale];

  // `g:price` doit apparaître une seule fois. Quand une remise s'applique,
  // c'est le prix barré qui prend la place de `price` et le prix réel qui
  // devient `sale_price` — Google rejette l'article si les deux sont égaux.
  const onSale = item.compareAtCents != null && item.compareAtCents > item.priceCents;
  const referenceCents = onSale ? item.compareAtCents! : item.priceCents;

  const fields: string[] = [
    `<g:id>${escapeXml(item.sku)}</g:id>`,
    `<g:title>${escapeXml(item.name.slice(0, 150))}</g:title>`,
    `<g:description>${escapeXml(plainText(item.description))}</g:description>`,
    `<g:link>${escapeXml(url)}</g:link>`,
    `<g:availability>${item.inStock ? 'in_stock' : 'out_of_stock'}</g:availability>`,
    `<g:price>${money(referenceCents, item.currency)}</g:price>`,
    ...(onSale ? [`<g:sale_price>${money(item.priceCents, item.currency)}</g:sale_price>`] : []),
    `<g:condition>${GOOGLE_CONDITION[item.condition]}</g:condition>`,
    `<g:brand>${escapeXml(item.brand)}</g:brand>`,
    `<g:product_type>${escapeXml(item.category)}</g:product_type>`,
    `<g:shipping_weight>${(item.weightGrams / 1000).toFixed(2)} kg</g:shipping_weight>`,
  ];

  // La première image est l'image principale ; Google accepte jusqu'à dix
  // images supplémentaires.
  const absolute = (src: string) => (src.startsWith('http') ? src : `${SITE_URL}${src}`);
  const [main, ...extra] = item.images;
  if (main) fields.push(`<g:image_link>${escapeXml(absolute(main))}</g:image_link>`);
  for (const image of extra.slice(0, 10)) {
    fields.push(`<g:additional_image_link>${escapeXml(absolute(image))}</g:additional_image_link>`);
  }

  if (item.isUnique || item.condition !== 'NEW') {
    // Pièce unique d'occasion : aucun code-barres fabricant n'existe.
    fields.push('<g:identifier_exists>no</g:identifier_exists>');
  } else {
    // Faute de GTIN fournisseur, le SKU sert d'identifiant : il est unique et
    // stable, ce que n'est pas un libellé de modèle. Ajouter les EAN réels
    // dès que votre grossiste vous les fournit améliore nettement la diffusion.
    fields.push(`<g:mpn>${escapeXml(item.sku)}</g:mpn>`);
  }

  fields.push(
    `<g:shipping><g:country>${country}</g:country><g:service>Standard</g:service></g:shipping>`,
  );

  return `    <item>\n      ${fields.join('\n      ')}\n    </item>`;
}

export async function GET(_request: Request, { params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) {
    return new Response('Locale inconnue', { status: 404 });
  }
  const locale: Locale = params.locale;

  let items: FeedItem[] = [];
  try {
    const data = await apiFetch<{ items: FeedItem[] }>(`/api/catalog/feed?locale=${locale}`, {
      revalidate: 3600,
    });
    items = data.items.filter(hasRealPhoto);
  } catch {
    // Un flux vide vaut mieux qu'une erreur 500 : Merchant Center signale une
    // absence de produits, il ne désactive pas le compte.
  }

  const title = `${COMPANY.tradeName} — ${locale === 'de' ? 'Produktkatalog' : 'Catalogue produits'}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${SITE_URL}/${locale}</link>
    <description>${escapeXml(
      locale === 'de'
        ? 'Forst- und Gartentechnik, neu und gebraucht.'
        : "Matériel forestier et d'espaces verts, neuf et occasion.",
    )}</description>
${items.map((item) => buildItem(item, locale)).join('\n')}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
